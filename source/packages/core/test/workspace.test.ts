import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const packageDirs = ['packages/core', 'apps/api', 'apps/web'];

function readJson(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} is not a JSON object`);
  }
  return value as Record<string, unknown>;
}

function packageName(manifestPath: string): string {
  const name = readJson(manifestPath)['name'];
  if (typeof name !== 'string') {
    throw new Error(`${manifestPath} has no string name`);
  }
  return name;
}

function workspacePackageNames(): string[] {
  const workspaces = readJson(join(sourceDir, 'package.json'))['workspaces'];
  if (!Array.isArray(workspaces)) {
    throw new Error('root package.json has no workspaces array');
  }
  return workspaces.flatMap((pattern: unknown) => {
    if (typeof pattern !== 'string' || !pattern.endsWith('/*')) {
      throw new Error(`unsupported workspace pattern: ${String(pattern)}`);
    }
    const dir = join(sourceDir, pattern.slice(0, -2));
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, 'package.json')))
      .map((entry) => packageName(join(dir, entry.name, 'package.json')));
  });
}

function parseTsconfig(packageDir: string): ts.ParsedCommandLine {
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  };
  const parsed = ts.getParsedCommandLineOfConfigFile(
    join(sourceDir, packageDir, 'tsconfig.json'),
    undefined,
    host,
  );
  if (!parsed) {
    throw new Error(`${packageDir}/tsconfig.json could not be parsed`);
  }
  return parsed;
}

function typecheckMessages(packageDir: string): string[] {
  const parsed = parseTsconfig(packageDir);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [path] : [];
  });
}

function importSpecifiers(file: string): string[] {
  const pattern = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g;
  return [...readFileSync(file, 'utf8').matchAll(pattern)].map((match) => match[1] ?? '');
}

describe('F-01 workspace', () => {
  it('F-01 AC-001 resolves the workspace set to exactly the three packages', () => {
    expect(workspacePackageNames().sort()).toEqual(
      ['@sddbuilder/api', '@sddbuilder/core', '@sddbuilder/web'],
    );
  });

  it.each(packageDirs)('F-01 AC-002 %s tsconfig extends the base and resolves strict options', (packageDir) => {
    const raw = readJson(join(sourceDir, packageDir, 'tsconfig.json'));
    expect(raw['extends']).toBe('../../tsconfig.base.json');

    const parsed = parseTsconfig(packageDir);
    expect(parsed.errors).toEqual([]);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.noUncheckedIndexedAccess).toBe(true);
    expect(parsed.options.exactOptionalPropertyTypes).toBe(true);
    expect(parsed.options.verbatimModuleSyntax).toBe(true);
  });

  it.each(packageDirs)('F-01 AC-003 %s uses NodeNext module and moduleResolution', (packageDir) => {
    const parsed = parseTsconfig(packageDir);
    expect(parsed.options.module).toBe(ts.ModuleKind.NodeNext);
    expect(parsed.options.moduleResolution).toBe(ts.ModuleResolutionKind.NodeNext);
  });

  it.each(packageDirs)('F-01 AC-003 %s typecheck reports no errors on its sources', (packageDir) => {
    expect(parseTsconfig(packageDir).fileNames.length).toBeGreaterThan(0);
    expect(typecheckMessages(packageDir)).toEqual([]);
  });

  it('F-01 AC-003 the typecheck script is configured at the root and in every package', () => {
    expect(readJson(join(sourceDir, 'package.json'))['scripts']).toHaveProperty('typecheck');
    for (const packageDir of packageDirs) {
      const scripts = readJson(join(sourceDir, packageDir, 'package.json'))['scripts'];
      expect(scripts).toHaveProperty('typecheck');
    }
  });

  it('F-01 AC-005 core lists no dependency on the api or the web app', () => {
    const core = readJson(join(sourceDir, 'packages/core/package.json'));
    const declared = [
      core['dependencies'],
      core['devDependencies'],
      core['peerDependencies'],
    ].flatMap((section) => Object.keys((section ?? {}) as Record<string, unknown>));
    expect(declared).not.toContain('@sddbuilder/api');
    expect(declared).not.toContain('@sddbuilder/web');
  });

  it('F-01 AC-005 core imports neither the api nor the web app', () => {
    const files = [
      ...sourceFiles(join(sourceDir, 'packages/core/src')),
      ...sourceFiles(join(sourceDir, 'packages/core/test')),
    ];
    expect(files.length).toBeGreaterThan(0);
    const specifiers = files.flatMap(importSpecifiers);
    expect(specifiers).toContain('typescript');
    const appImports = specifiers.filter(
      (specifier) => /^@sddbuilder\/(api|web)(\/|$)/.test(specifier) || specifier.includes('apps/'),
    );
    expect(appImports).toEqual([]);
  });
});
