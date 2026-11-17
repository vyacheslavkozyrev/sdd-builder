import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const coreDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const virtualDir = join(coreDir, 'test');
const dependencyFile = join(virtualDir, 'virtual-dep.ts');
const importerFile = join(virtualDir, 'virtual-importer.ts');

// TS2834: "Relative import paths need explicit file extensions in ECMAScript imports ...".
const MISSING_EXTENSION_CODE = 2834;

function parsedOptions(): ts.CompilerOptions {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    join(coreDir, 'tsconfig.json'),
    undefined,
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    },
  );
  if (!parsed) {
    throw new Error('packages/core/tsconfig.json could not be parsed');
  }
  return parsed.options;
}

// Compiles an in-memory importer that sits in the core package, so the NodeNext
// rules of core's package.json (type: module) apply to it.
function diagnosticCodesFor(importerSource: string): number[] {
  const memory = new Map<string, string>([
    [dependencyFile, 'export const value = 1;\n'],
    [importerFile, importerSource],
  ]);
  const options = { ...parsedOptions(), noEmit: true };
  const base = ts.createCompilerHost(options);
  const host: ts.CompilerHost = {
    ...base,
    fileExists: (file) => memory.has(file) || base.fileExists(file),
    readFile: (file) => memory.get(file) ?? base.readFile(file),
    getSourceFile: (file, languageVersion, onError, shouldCreate) => {
      const text = memory.get(file);
      if (text !== undefined) {
        return ts.createSourceFile(file, text, languageVersion, true);
      }
      return base.getSourceFile(file, languageVersion, onError, shouldCreate);
    },
  };
  const program = ts.createProgram({ rootNames: [importerFile], options, host });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === importerFile)
    .map((diagnostic) => diagnostic.code);
}

describe('F-01 NodeNext import rule', () => {
  it('F-01 AC-004 reports a diagnostic for a relative import without the .js extension', () => {
    const codes = diagnosticCodesFor(
      "import { value } from './virtual-dep';\nexport const copy = value;\n",
    );
    expect(codes).toContain(MISSING_EXTENSION_CODE);
  });

  it('F-01 AC-004 accepts a relative import written with the .js extension', () => {
    const codes = diagnosticCodesFor(
      "import { value } from './virtual-dep.js';\nexport const copy = value;\n",
    );
    expect(codes).toEqual([]);
  });
});
