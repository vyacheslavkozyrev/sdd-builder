import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as core from '../../src/index.js';
import * as pipeline from '../../src/pipeline/index.js';

const coreDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pipelineDir = join(coreDir, 'src', 'pipeline');

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
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

const PIPELINE_VALUES = [
  'analyzeBrief',
  'analyzeStructure',
  'checkReply',
  'checkReview',
  'configProblems',
  'defaultPipeline',
  'parseProjectConfig',
  'planGeneration',
];
const ANALYSIS_TYPES = ['Finding', 'ReviewEntry', 'ReviewResult', 'Severity'];
const MODEL_TYPES = [
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
const PIPELINE_TYPES = [...MODEL_TYPES, ...ANALYSIS_TYPES];

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

  it('names no export of the pipeline index beyond the parser, the default, the analysis and the model types', () => {
    expect(exportedNames(indexFile)).toEqual([...PIPELINE_VALUES, ...PIPELINE_TYPES].sort());
  });

  it('re-exports every type the model file exports, as type-only exports, and nothing else as a type', () => {
    const typeOnly = exportDeclarations(indexFile).filter((declaration) => declaration.isTypeOnly);
    expect(typeOnly.map((declaration) => (declaration.moduleSpecifier as ts.StringLiteral).text)).toEqual([
      './analyze/index.js',
      './model.js',
    ]);
    expect(typeOnly.flatMap(namesOf).sort()).toEqual([...PIPELINE_TYPES].sort());
    expect(exportedNames(modelFile)).toEqual([...MODEL_TYPES].sort());
  });

  it('F-03 AC-037 exposes analyzeStructure from the pipeline namespace and adds no other value to it', () => {
    expect(typeof core.pipeline.analyzeStructure).toBe('function');
    expect(Object.keys(core.pipeline).sort()).toEqual([...PIPELINE_VALUES]);
  });

  it('F-04 AC-034 reaches configProblems, planGeneration and checkReply as pipeline namespace functions and adds no other generator name', () => {
    expect(typeof core.pipeline.configProblems).toBe('function');
    expect(typeof core.pipeline.planGeneration).toBe('function');
    expect(typeof core.pipeline.checkReply).toBe('function');
    expect(Object.keys(core.pipeline).sort()).toEqual([...PIPELINE_VALUES]);
    const generatorNames = ['GenerationError', 'renderLayout', 'listFiles', 'walkFlow', 'headingsOf', 'blockersOf'];
    for (const name of generatorNames) {
      expect(Object.keys(core.pipeline)).not.toContain(name);
    }
  });

  it('re-exports the parser and the default pipeline as values, never as types', () => {
    const values = exportDeclarations(indexFile).filter((declaration) => !declaration.isTypeOnly);
    expect(values.flatMap(namesOf).sort()).toEqual([...PIPELINE_VALUES]);
  });

  it('re-exports nothing with a wildcard from the pipeline index', () => {
    expect(exportedNames(indexFile)).not.toContain('*');
  });
});
