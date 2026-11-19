import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as core from '../../src/index.js';
import * as pipeline from '../../src/pipeline/index.js';

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

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

function exportDeclarations(file: string): ts.ExportDeclaration[] {
  return parse(file, readFileSync(file, 'utf8')).statements.filter((statement) => ts.isExportDeclaration(statement));
}

// The names one `export ... from` declaration exports. `export *` is reported as `*`.
function namesOf(declaration: ts.ExportDeclaration): string[] {
  const clause = declaration.exportClause;
  if (clause === undefined) return ['*'];
  if (ts.isNamedExports(clause)) return clause.elements.map((element) => element.name.text);
  return [clause.name.text];
}

// The names a module exports by name, read from its source: `export ... from` names, and exported
// interfaces and type aliases.
function exportedNames(file: string): string[] {
  const names = exportDeclarations(file).flatMap(namesOf);
  for (const statement of parse(file, readFileSync(file, 'utf8')).statements) {
    if (
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      names.push(statement.name.text);
    }
  }
  return names.sort();
}

const PIPELINE_VALUES = ['defaultPipeline', 'parseProjectConfig'];
const PIPELINE_TYPES = [
  'AgentBlock',
  'Argument',
  'Artifact',
  'Block',
  'ConditionBlock',
  'EndBlock',
  'Flow',
  'Model',
  'Pipeline',
  'Problem',
  'ProjectConfig',
  'Route',
  'Rule',
  'RuleTag',
  'Stack',
  'StartBlock',
];

describe('F-02 AC-084 pipeline sources do no I/O, network or process access', () => {
  it('finds no forbidden import, global or import.meta.env in any file under src/pipeline', () => {
    const files = sourceFiles(pipelineDir);
    expect(files.length).toBeGreaterThan(0);
    const findings = files.flatMap((file) => findForbidden(file, readFileSync(file, 'utf8')));
    expect(findings).toEqual([]);
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

describe('F-02 AC-089 the core namespace exposes the pipeline module and nothing else of it', () => {
  const indexFile = join(pipelineDir, 'index.ts');
  const modelFile = join(pipelineDir, 'model.ts');

  it('exports only the namespace pipeline from the root of core', () => {
    expect(Object.keys(core)).toEqual(['pipeline']);
  });

  it('exposes parseProjectConfig and defaultPipeline as values of the pipeline namespace', () => {
    expect(Object.keys(pipeline).sort()).toEqual(PIPELINE_VALUES);
    expect(typeof core.pipeline.parseProjectConfig).toBe('function');
    expect(core.pipeline.defaultPipeline).toBeDefined();
  });

  it('names no export of the pipeline index beyond the parser, the default and the model types', () => {
    expect(exportedNames(indexFile)).toEqual([...PIPELINE_VALUES, ...PIPELINE_TYPES].sort());
  });

  it('re-exports every type the model file exports, as type-only exports, and nothing else as a type', () => {
    const typeOnly = exportDeclarations(indexFile).filter((declaration) => declaration.isTypeOnly);
    expect(typeOnly.map((declaration) => (declaration.moduleSpecifier as ts.StringLiteral).text)).toEqual([
      './model.js',
    ]);
    expect(typeOnly.flatMap(namesOf).sort()).toEqual(exportedNames(modelFile));
    expect(exportedNames(modelFile)).toEqual([...PIPELINE_TYPES].sort());
  });

  it('re-exports the parser and the default pipeline as values, never as types', () => {
    const values = exportDeclarations(indexFile).filter((declaration) => !declaration.isTypeOnly);
    expect(values.flatMap(namesOf).sort()).toEqual([...PIPELINE_VALUES]);
  });

  it('re-exports nothing with a wildcard from the pipeline index', () => {
    expect(exportedNames(indexFile)).not.toContain('*');
  });
});
