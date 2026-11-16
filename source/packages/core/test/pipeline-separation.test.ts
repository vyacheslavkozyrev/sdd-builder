import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as pipeline from '../src/pipeline/index.js';

const SRC = join(import.meta.dirname, '..', 'src');
const PIPELINE = join(SRC, 'pipeline');
const API_TESTS = join(import.meta.dirname, '..', '..', '..', 'apps', 'api', 'test');

/** The flat modules the pipeline must never reach, as absolute paths without extension. */
const FLAT_MODULES = [
  join(SRC, 'generate'),
  join(SRC, 'plan'),
  join(SRC, 'render', 'step-files'),
  join(SRC, 'render', 'workflow-command'),
];

/** Every .ts file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Every module specifier in a source text: `import ... from`, `export ... from`, `import 'x'`, `import('x')`, `require('x')`. */
const SPECIFIER =
  /(?:import|export)\s[^'"`]*?from\s*['"`]([^'"`]+)['"`]|\bimport\s*['"`]([^'"`]+)['"`]|\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)|\brequire\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

/** Every string literal's content: single, double or back quoted, on one line for the first two kinds. */
const STRING_LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;

/**
 * A template-folder path: a literal that starts with `steps/`, `workflows/` or `rules/` (optionally after `./`,
 * `../` or `/`, or after `templates/`), or any literal that places one of those folders under `templates/`.
 * A `.claude/rules/` output path and a `src/rules/` folder are not template folders.
 */
const TEMPLATE_FOLDER = /^(?:\.{1,2}\/|\/)*(?:templates\/)?(?:steps|workflows|rules)\/|templates\/(?:steps|workflows|rules)(?![\w-])/;

/**
 * Comments removed, so that prose in a comment does not read as code. String literals are matched first and kept,
 * so that `//` inside a string (a URL, say) does not hide the rest of the line.
 */
function stripComments(text: string): string {
  return text.replace(
    /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (_match: string, literal: string | undefined) => literal ?? '',
  );
}

/** Every module specifier of a source text (comments already removed). */
function specifiers(text: string): string[] {
  return [...text.matchAll(SPECIFIER)].map((match) => match[1] ?? match[2] ?? match[3] ?? match[4] ?? '');
}

/** Every string literal's content of a source text (comments already removed). */
function stringLiterals(text: string): string[] {
  return [...text.matchAll(STRING_LITERAL)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
}

/**
 * The AC-027 violations of one pipeline file: a relative import that resolves to a flat module, and a string
 * literal that names a template folder. `file` is the file's absolute path; its text is passed in.
 */
function pipelineViolations(file: string, source: string): string[] {
  const text = stripComments(source);
  const found: string[] = [];
  for (const specifier of specifiers(text)) {
    if (!specifier.startsWith('.')) continue;
    const target = resolve(dirname(file), specifier).replace(/\.(js|ts)$/, '');
    if (FLAT_MODULES.includes(target)) found.push(`imports the flat module ${specifier}`);
  }
  for (const literal of stringLiterals(text)) {
    if (TEMPLATE_FOLDER.test(literal)) found.push(`names a template folder in ${JSON.stringify(literal)}`);
  }
  return found.map((problem) => `${file}: ${problem}`);
}

describe('F-03 AC-026 pipeline module and flat exports', () => {
  it('F-03 AC-026 the pipeline module exports planGeneration, checkReply and generate as functions', () => {
    expect(pipeline.planGeneration).toBeTypeOf('function');
    expect(pipeline.checkReply).toBeTypeOf('function');
    expect(pipeline.generate).toBeTypeOf('function');
  });
});

describe('F-03 AC-027 pipeline folder separation', () => {
  const files = sourceFiles(PIPELINE);

  it('F-03 AC-027 the scan reads the pipeline folder at all', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('F-03 AC-027 the scan sees the relative imports and string literals of the real pipeline code', () => {
    const texts = files.map((file) => stripComments(readFileSync(file, 'utf8')));
    const relativeImports = texts.flatMap((text) => specifiers(text)).filter((specifier) => specifier.startsWith('.'));
    const literals = texts.flatMap((text) => stringLiterals(text));
    expect(relativeImports.length).toBeGreaterThan(10);
    expect(literals.length).toBeGreaterThan(10);
  });

  it('F-03 AC-027 no pipeline module imports a flat module (generate, plan, render/step-files, render/workflow-command)', () => {
    const offending = files.flatMap((file) =>
      pipelineViolations(file, readFileSync(file, 'utf8')).filter((problem) => problem.includes('imports')),
    );
    expect(offending).toEqual([]);
  });

  it('F-03 AC-027 no pipeline module names steps/, workflows/ or rules/ as a template folder', () => {
    const offending = files.flatMap((file) =>
      pipelineViolations(file, readFileSync(file, 'utf8')).filter((problem) => problem.includes('template folder')),
    );
    expect(offending).toEqual([]);
  });

  it.each([
    ['a flat generate import', 'pipeline/a.ts', "import { generate } from '../generate.js';", 'imports'],
    ['a flat generate import from two levels down', 'pipeline/generate/a.ts', "import { x } from '../../generate.js';", 'imports'],
    ['a flat plan import', 'pipeline/a.ts', "export { planGeneration } from '../plan.js';", 'imports'],
    ['a flat step-files import', 'pipeline/generate/a.ts', "import { s } from '../../render/step-files.js';", 'imports'],
    ['a flat workflow-command import', 'pipeline/a.ts', "import { w } from '../render/workflow-command.js';", 'imports'],
    ['a flat generate import as a dynamic import', 'pipeline/a.ts', "const m = await import('../generate.js');", 'imports'],
    ['a template path under templates/steps', 'pipeline/a.ts', "const p = 'templates/steps/x.md';", 'template folder'],
    ['a template path under templates/workflows', 'pipeline/a.ts', "const p = 'templates/workflows';", 'template folder'],
    ['a template path under templates/rules', 'pipeline/generate/a.ts', 'const p = `templates/rules/${id}.md`;', 'template folder'],
    ['a bare steps/ folder path', 'pipeline/a.ts', "const p = 'steps/' + id;", 'template folder'],
    ['a bare workflows/ folder path', 'pipeline/a.ts', 'const p = "workflows/" + id;', 'template folder'],
    ['a bare rules/ folder path', 'pipeline/a.ts', "const p = 'rules/' + id;", 'template folder'],
    ['a steps/ folder reached through ../', 'pipeline/generate/a.ts', "const p = '../steps/' + id;", 'template folder'],
    ['a workflows/ folder reached through ./', 'pipeline/a.ts', "const p = './workflows/x.md';", 'template folder'],
    ['a rules/ folder at an absolute path', 'pipeline/a.ts', "const p = '/rules/x.md';", 'template folder'],
    ['a steps/ folder on a line that also holds a URL', 'pipeline/a.ts', "const u = 'https://example.dev'; const p = 'steps/' + id;", 'template folder'],
  ])('F-03 AC-027 the scanner flags %s', (_name, relative, source, kind) => {
    const problems = pipelineViolations(join(SRC, relative), source);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((problem) => problem.includes(kind))).toBe(true);
  });

  it.each([
    ['the pipeline own plan module', 'pipeline/a.ts', "import { planGeneration } from './plan.js';"],
    ['the pipeline own generate module', 'pipeline/a.ts', "import { generate } from './generate/generate.js';"],
    ['a render module that is not a flat one', 'pipeline/a.ts', "import { p } from '../render/paths.js';"],
    ['the output folder .claude/rules/', 'pipeline/a.ts', "const RULES_DIR = '.claude/rules/';"],
    ['a folder named like a template folder outside templates', 'pipeline/a.ts', "const p = 'src/rules/x';"],
    ['a template folder named only in a comment', 'pipeline/a.ts', "// reads templates/steps/x.md\nconst a = 1;"],
    ['a steps/ folder named in a block comment', 'pipeline/a.ts', "/* reads ../steps/x.md */\nconst a = 1;"],
    ['a rules/ folder under a folder that is not templates', 'pipeline/a.ts', "const p = 'packages/rules/x';"],
  ])('F-03 AC-027 the scanner does not flag %s', (_name, relative, source) => {
    expect(pipelineViolations(join(SRC, relative), source)).toEqual([]);
  });
});

describe('F-03 AC-028 API suite', () => {
  it('F-03 AC-028 the API generate suites named by the criterion are present (the task check runs them unchanged)', () => {
    const names = readdirSync(API_TESTS);
    expect(names).toContain('generation-model.test.ts');
    expect(names.some((name) => name.startsWith('generate-') && name.endsWith('.test.ts'))).toBe(true);
  });
});
