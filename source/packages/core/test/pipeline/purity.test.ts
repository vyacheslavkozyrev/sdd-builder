import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// architecture.md §1: core does no I/O. These modules are the I/O surface it must not import.
const FORBIDDEN = ['fs', 'node:fs', 'http', 'node:http', 'process', 'window'];

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

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

function forbiddenImportsIn(fileName: string, text: string): string[] {
  return moduleSpecifiers(fileName, text).filter((specifier) => FORBIDDEN.includes(specifier));
}

describe('F-02 AC-035 core source imports no I/O module', () => {
  it('F-02 AC-035 finds no import of fs, node:fs, http, node:http, process or window under src', () => {
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
