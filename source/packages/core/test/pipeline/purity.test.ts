import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const coreDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pipelineDir = join(coreDir, 'src', 'pipeline');

// Module specifiers that reach the file system, the network or the process (AC-084).
const FORBIDDEN_MODULES = new Set(['fs', 'fs/promises', 'path', 'http', 'https', 'net']);
// Global names that reach the browser, the network or the environment (AC-084). `globalThis` and
// `global` are listed because they reach the same names through a property (`globalThis.fetch`).
const FORBIDDEN_GLOBALS = new Set(['process', 'window', 'fetch', 'globalThis', 'global']);

function specifierIsForbidden(specifier: string): boolean {
  return FORBIDDEN_MODULES.has(specifier.replace(/^node:/, ''));
}

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

// True when the identifier is the name of a property or member, not a reference to a global.
function isMemberName(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent)) return parent.name === node;
  if (ts.isQualifiedName(parent)) return parent.right === node;
  if (ts.isBindingElement(parent)) return parent.propertyName === node;
  if (
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent)
  ) {
    return parent.name === node;
  }
  return false;
}

// The findings of one source text, as `file:line what`. Property names (`x.fetch`) are not globals.
function findForbidden(fileName: string, text: string): string[] {
  const source = parse(fileName, text);
  const findings: string[] = [];
  const where = (node: ts.Node): string => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    return `${fileName}:${line + 1}`;
  };
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier) && specifierIsForbidden(specifier.text)) {
        findings.push(`${where(node)} imports ${specifier.text}`);
      }
    }
    // `import fs = require('fs')` is the TypeScript form of require.
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression) &&
      specifierIsForbidden(node.moduleReference.expression.text)
    ) {
      findings.push(`${where(node)} loads ${node.moduleReference.expression.text}`);
    }
    if (ts.isCallExpression(node)) {
      const [first] = node.arguments;
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (
        (isDynamicImport || isRequire) &&
        first !== undefined &&
        ts.isStringLiteral(first) &&
        specifierIsForbidden(first.text)
      ) {
        findings.push(`${where(node)} loads ${first.text}`);
      }
    }
    if (ts.isPropertyAccessExpression(node) && ts.isMetaProperty(node.expression) && node.name.text === 'env') {
      findings.push(`${where(node)} reads import.meta.env`);
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isMetaProperty(node.expression) &&
      ts.isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === 'env'
    ) {
      findings.push(`${where(node)} reads import.meta.env`);
    }
    if (ts.isIdentifier(node) && FORBIDDEN_GLOBALS.has(node.text) && !isMemberName(node)) {
      findings.push(`${where(node)} uses the global ${node.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

// The imports of one source text that are not relative paths resolving inside src/pipeline (F-04 AC-035).
function importsOutside(fileName: string, text: string): string[] {
  const source = parse(fileName, text);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [first] = node.arguments;
      if (first !== undefined && ts.isStringLiteral(first)) specifiers.push(first.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers
    .filter((specifier) => {
      const relative = specifier.startsWith('./') || specifier.startsWith('../');
      return !relative || !resolve(dirname(fileName), specifier).startsWith(pipelineDir + '/');
    })
    .map((specifier) => `${fileName} imports ${specifier}`);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('F-02 AC-084 pipeline sources do no I/O, network or process access', () => {
  it('finds no forbidden import, global or import.meta.env in any file under src/pipeline', () => {
    const files = sourceFiles(pipelineDir);
    expect(files.length).toBeGreaterThan(0);
    const findings = files.flatMap((file) => findForbidden(file, readFileSync(file, 'utf8')));
    expect(findings).toEqual([]);
  });

  it('F-04 AC-035 scans every file of the generate folder for forbidden forms', () => {
    const generateFiles = sourceFiles(join(pipelineDir, 'generate'));
    expect(generateFiles.length).toBeGreaterThan(0);
    const findings = generateFiles.flatMap((file) => findForbidden(file, readFileSync(file, 'utf8')));
    expect(findings).toEqual([]);
  });

  it('F-04 AC-035 imports nothing from a package or from outside src/pipeline in the generate folder, so no model client or template file is read', () => {
    const outside = sourceFiles(join(pipelineDir, 'generate')).flatMap((file) =>
      importsOutside(file, readFileSync(file, 'utf8')),
    );
    expect(outside).toEqual([]);
  });

  it('F-04 AC-035 flags a package import and a relative import that leaves src/pipeline, so the import scan is known to see them', () => {
    const fixture = [
      "import ts from 'typescript';",
      "import { readFileSync } from 'node:fs';",
      "import { modelClient } from '../../../../../outside/client.js';",
      "import { plan } from '../plan.js';",
      "const late = await import('@anthropic-ai/sdk');",
    ].join('\n');
    const generateFile = join(pipelineDir, 'generate', 'fixture.ts');
    expect(importsOutside(generateFile, fixture)).toEqual([
      `${generateFile} imports typescript`,
      `${generateFile} imports node:fs`,
      `${generateFile} imports ../../../../../outside/client.js`,
      `${generateFile} imports @anthropic-ai/sdk`,
    ]);
  });

  it('flags each forbidden form in a fixture, so the scan is known to see them', () => {
    const fixture = [
      "import { readFileSync } from 'node:fs';",
      "import { join } from 'path';",
      "export { request } from 'node:http';",
      "const later = import('https');",
      'const response = fetch("/x");',
      'const size = process.env.SIZE;',
      'const root = window.location;',
      'const mode = import.meta.env.MODE;',
      "import { open } from 'fs/promises';",
      "import net = require('net');",
      "const dynamic = await import('node:path');",
      "const sync = require('node:fs');",
      "export * from 'http';",
      "const bracket = import.meta['env'];",
      'const viaGlobal = globalThis.fetch;',
      "import plain = require('fs');",
      "import { writeFile } from 'fs';",
      "import { connect } from 'node:net';",
    ].join('\n');
    expect(findForbidden('fixture.ts', fixture)).toEqual([
      'fixture.ts:1 imports node:fs',
      'fixture.ts:2 imports path',
      'fixture.ts:3 imports node:http',
      'fixture.ts:4 loads https',
      'fixture.ts:5 uses the global fetch',
      'fixture.ts:6 uses the global process',
      'fixture.ts:7 uses the global window',
      'fixture.ts:8 reads import.meta.env',
      'fixture.ts:9 imports fs/promises',
      'fixture.ts:10 loads net',
      'fixture.ts:11 loads node:path',
      'fixture.ts:12 loads node:fs',
      'fixture.ts:13 imports http',
      'fixture.ts:14 reads import.meta.env',
      'fixture.ts:15 uses the global globalThis',
      'fixture.ts:16 loads fs',
      'fixture.ts:17 imports fs',
      'fixture.ts:18 imports node:net',
    ]);
  });

  it('does not flag a property, method or member named like a global, a plain string, or a JSON import', () => {
    const fixture = [
      "import defaults from '../../../../templates/pipeline/default.json' with { type: 'json' };",
      'const value = { fetch: 1 }.fetch + response.process;',
      'class Client { fetch(): void {} process = 1; path(): string { return "fs"; } }',
      'interface Api { window: number; global(): void }',
      'const { process: current } = source;',
      'const names = { window: 2, net: 3 };',
      'const location = import.meta.url;',
      'export const first = defaults;',
    ].join('\n');
    expect(findForbidden('fixture.ts', fixture)).toEqual([]);
  });
});
