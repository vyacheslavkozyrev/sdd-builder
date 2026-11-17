import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// architecture.md §1: core does no I/O. These modules are the I/O surface it must not import.
// The model client (the Anthropic SDK, decision 11) is an I/O surface too: only source/apps/api calls it.
const FORBIDDEN = ['fs', 'node:fs', 'http', 'node:http', 'process', 'node:process', 'window', '@anthropic-ai/sdk'];

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const generateDir = join(srcDir, 'pipeline', 'generate');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return entry.endsWith('.ts') ? [path] : [];
  });
}

// Module specifiers of static imports, re-exports, dynamic import() and require().
function moduleSpecifiers(fileName: string, text: string): string[] {
  const file = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      if (ts.isStringLiteral(expression)) {
        specifiers.push(expression.text);
      }
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression;
      const isImportCall = callee.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
      const first = node.arguments[0];
      if ((isImportCall || isRequire) && first && ts.isStringLiteral(first)) {
        specifiers.push(first.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specifiers;
}

// A forbidden module, or one of its subpaths (`@anthropic-ai/sdk/resources`), counts as the forbidden module.
function isForbidden(specifier: string): boolean {
  return FORBIDDEN.some((module) => specifier === module || specifier.startsWith(`${module}/`));
}

function forbiddenImportsIn(fileName: string, text: string): string[] {
  return moduleSpecifiers(fileName, text).filter(isForbidden);
}

// The templates are text read by the caller and passed in as data (source/templates/README.md): a generator module
// that imports a file from a `templates` folder would read one itself, so such a specifier is refused.
function templateImportsIn(fileName: string, text: string): string[] {
  return moduleSpecifiers(fileName, text).filter((specifier) => specifier.split('/').includes('templates'));
}

describe('F-02 AC-035 core source imports no I/O module', () => {
  it('F-02 AC-035 finds no import of fs, node:fs, http, node:http, process, node:process, window or @anthropic-ai/sdk (or a subpath) under src', () => {
    const files = sourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap((file) => {
      const found = forbiddenImportsIn(file, readFileSync(file, 'utf8'));
      return found.map((specifier) => `${file}: ${specifier}`);
    });
    expect(offenders).toEqual([]);
  });

  it.each([
    ["import { readFileSync } from 'fs';", 'fs'],
    ["import { readFile } from 'node:fs';", 'node:fs'],
    ["import { createServer } from 'http';", 'http'],
    ["import { request } from 'node:http';", 'node:http'],
    ["import process from 'process';", 'process'],
    ["import win from 'window';", 'window'],
    ["export * from 'node:fs';", 'node:fs'],
    ["const fs = require('fs');", 'fs'],
    ["const mod = await import('node:http');", 'node:http'],
    ["import { env } from 'node:process';", 'node:process'],
    ["import Anthropic from '@anthropic-ai/sdk';", '@anthropic-ai/sdk'],
    ["import { Messages } from '@anthropic-ai/sdk/resources';", '@anthropic-ai/sdk/resources'],
    ["const sdk = require('@anthropic-ai/sdk');", '@anthropic-ai/sdk'],
  ])('F-02 AC-035 the scanner flags %s', (source, specifier) => {
    expect(forbiddenImportsIn('fixture.ts', source)).toEqual([specifier]);
  });

  it.each([
    "import { z } from './model.js';",
    "import type { Config } from '../model.js';",
    "const path = await import('./parse/project.js');",
    "import data from '../../../templates/pipeline/default.json' with { type: 'json' };",
  ])('F-02 AC-035 the scanner accepts %s', (source) => {
    expect(forbiddenImportsIn('fixture.ts', source)).toEqual([]);
  });
});

describe('F-04 AC-032 the generator modules import no I/O or model client and read no template', () => {
  const generateFiles = sourceFiles(generateDir);

  it('F-04 AC-032 scans every generator module under src/pipeline/generate', () => {
    const names = generateFiles.map((file) => file.slice(generateDir.length + 1));
    expect(names).toContain('plan.ts');
    expect(names).toContain('reply-check.ts');
    expect(names).toContain('render.ts');
    expect(names).toContain('templates.ts');
    expect(names.length).toBeGreaterThanOrEqual(8);
  });

  it('F-04 AC-032 finds no import or require of fs, http, process, window or the model client under generate', () => {
    const offenders = generateFiles.flatMap((file) => {
      const found = forbiddenImportsIn(file, readFileSync(file, 'utf8'));
      return found.map((specifier) => `${file}: ${specifier}`);
    });
    expect(offenders).toEqual([]);
  });

  it('F-04 AC-032 finds no import of a file from a templates folder under generate', () => {
    const offenders = generateFiles.flatMap((file) => {
      const found = templateImportsIn(file, readFileSync(file, 'utf8'));
      return found.map((specifier) => `${file}: ${specifier}`);
    });
    expect(offenders).toEqual([]);
  });

  it.each([
    ["import data from '../../../../templates/pipeline/default.json' with { type: 'json' };", '../../../../templates/pipeline/default.json'],
    ["const text = await import('../templates/command.md');", '../templates/command.md'],
  ])('F-04 AC-032 the template scan flags %s', (source, specifier) => {
    // A positive sample: the same scan that the test above runs must flag these, so it can fail.
    expect(templateImportsIn('generate/sample.ts', source)).toEqual([specifier]);
  });

  it.each([
    ["import { readFileSync } from 'node:fs';", 'node:fs'],
    ["import { readFile } from 'fs/promises';", 'fs/promises'],
    ["import { request } from 'node:http';", 'node:http'],
    ["import { env } from 'process';", 'process'],
    ["const win = require('window');", 'window'],
    ["import Anthropic from '@anthropic-ai/sdk';", '@anthropic-ai/sdk'],
  ])('F-04 AC-032 the scan of generate fails on a module that imports %s', (source, specifier) => {
    // A positive sample: the same scan that the test above runs must flag these, so it can fail.
    expect(forbiddenImportsIn('generate/sample.ts', source)).toEqual([specifier]);
  });
});
