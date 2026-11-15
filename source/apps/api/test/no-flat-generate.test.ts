import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FLAT_EXPORTS: ReadonlySet<string> = new Set(['generate', 'planGeneration', 'checkReply', 'validateConfig']);
const CORE_ROOT = '@sddbuilder/core';
const CORE_FLAT_PATH = /(^|\/)core\/src\/(generate|plan|reply-check)\.(js|ts)$/;
const PIPELINE_NAMESPACE_IMPORT = /import\s*\{\s*pipeline\s*\}\s*from\s*'@sddbuilder\/core'/;
const NAMESPACE_IMPORT = /\bimport\b\s*\*\s*as\s+([A-Za-z_]\w*)\s*from\s*['"]@sddbuilder\/core['"]/g;
const DYNAMIC_ROOT_IMPORT = /\bimport\s*\(\s*['"]@sddbuilder\/core['"]\s*\)/;
const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const APPS_DIR = fileURLToPath(new URL('../../', import.meta.url));
// The two scan tests hold inline fixtures that prove the matchers can fail. Each fixture is one
// `['name', 'source text', ...]` row of an it.each table, so only those rows are left out of the
// scan of these two files. Their real code is scanned like any other file.
const FIXTURE_FILES: ReadonlySet<string> = new Set([
  join('api', 'test', 'no-flat-generate.test.ts'),
  join('api', 'test', 'no-flat-analysis.test.ts'),
]);
const FIXTURE_ROW = /^\s*\[['"]/;

// One import or re-export: its keyword, its clause (everything before `from`) and its module specifier.
const STATEMENT = /\b(?:import|export)\b\s*(?:type\b\s*)?([^;]*?)\s*from\s*['"]([^'"]+)['"]/g;

/** The names a clause takes from its braces, without `type` and `as` aliases. */
function namesIn(clause: string): string[] {
  const braces = /\{([^}]*)\}/.exec(clause);
  if (!braces) return [];
  return (braces[1] ?? '')
    .split(',')
    .map((part) => (part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0] ?? '').trim())
    .filter((name) => name !== '');
}

/**
 * Lists every flat generator import in one file's text: a flat export named from the core root,
 * a flat export read through a namespace import of the root, a namespace import of the root used
 * without a member (destructured or passed whole), a star re-export of the root, a dynamic import
 * of the root, or any specifier that points at the flat core modules (`core/src/generate.ts`,
 * `plan.ts`, `reply-check.ts`). An empty list means the text is clean. The pipeline names
 * (`pipeline.generate` and the rest) are never flagged.
 */
function flatGenerateImports(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(STATEMENT)) {
    const keyword = match[0].startsWith('export') ? 'export' : 'import';
    const clause = match[1] ?? '';
    const specifier = match[2] ?? '';
    if (CORE_FLAT_PATH.test(specifier)) found.push(`path ${specifier}`);
    if (specifier === CORE_ROOT) {
      if (keyword === 'export' && clause.trim().startsWith('*')) found.push(`star re-export from ${CORE_ROOT}`);
      for (const name of namesIn(clause)) {
        if (FLAT_EXPORTS.has(name)) found.push(`${name} from ${CORE_ROOT}`);
      }
    }
  }
  if (DYNAMIC_ROOT_IMPORT.test(text)) found.push(`dynamic import of ${CORE_ROOT}`);
  for (const match of text.matchAll(NAMESPACE_IMPORT)) {
    const alias = match[1] ?? '';
    // Only code is checked for bare uses: the import statements and string literals are blanked.
    const code = text.replace(NAMESPACE_IMPORT, '').replace(/(['"])[^'"\n]*\1/g, "''");
    if (new RegExp(`(^|[^\\w.$])${alias}(?![\\w$]|\\s*\\.)`).test(code)) {
      found.push(`namespace ${alias} used without a member`);
    }
    for (const name of FLAT_EXPORTS) {
      if (new RegExp(`(^|[^\\w.$])${alias}\\.${name}\\b`).test(text)) {
        found.push(`${name} from ${CORE_ROOT} via ${alias}`);
      }
    }
  }
  return found;
}

/** The text with the it.each fixture rows removed, so only real code is matched. */
function withoutFixtureRows(text: string): string {
  return text
    .split('\n')
    .filter((line) => !FIXTURE_ROW.test(line))
    .join('\n');
}

interface ScannedFile {
  readonly path: string;
  readonly text: string;
}

/** Every source and test file under a directory, recursively, in a fixed order. */
function scanFiles(dir: string): ScannedFile[] {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  const files: ScannedFile[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanFiles(path));
    } else if (SOURCE_FILE.test(entry.name)) {
      const text = readFileSync(path, 'utf8');
      files.push({ path, text: FIXTURE_FILES.has(relative(APPS_DIR, path)) ? withoutFixtureRows(text) : text });
    }
  }
  return files;
}

describe('F-07 AC-023 no flat generator import under source/apps/', () => {
  const files = scanFiles(APPS_DIR);

  it('F-07 AC-023 the scan reads the API source and test files', () => {
    expect(files.some((file) => file.path.endsWith(join('api', 'src', 'app.ts')))).toBe(true);
    expect(files.some((file) => file.path.endsWith(join('api', 'test', 'smoke.test.ts')))).toBe(true);
  });

  it('F-07 AC-023 no source or test file under source/apps/ imports a flat generator export', () => {
    const findings = files.flatMap((file) =>
      flatGenerateImports(file.text).map((hit) => `${relative(APPS_DIR, file.path)}: ${hit}`),
    );
    expect(findings).toEqual([]);
  });

  it('F-07 AC-023 the scan finds the pipeline namespace import and does not flag it', () => {
    expect(files.some((file) => PIPELINE_NAMESPACE_IMPORT.test(file.text))).toBe(true);
    expect(
      flatGenerateImports(
        "import { pipeline } from '@sddbuilder/core';\nconst a = pipeline.generate(config, templates);\nconst b = pipeline.planGeneration(config, templates);\nconst c = pipeline.checkReply(plan, reply);\nconst d = pipeline.configProblems(config);",
      ),
    ).toEqual([]);
  });

  it.each([
    ['a named flat generate from the root', "import { generate } from '@sddbuilder/core';", ['generate from @sddbuilder/core']],
    ['a flat planGeneration in a multi-line clause', "import {\n  DEFAULT_STEP_CATALOG,\n  planGeneration,\n} from '@sddbuilder/core';", ['planGeneration from @sddbuilder/core']],
    ['an aliased flat checkReply with double quotes', 'import { checkReply as check } from "@sddbuilder/core";', ['checkReply from @sddbuilder/core']],
    ['a flat validateConfig marked type-only among others', "import { type ProjectConfig, type validateConfig } from '@sddbuilder/core';", ['validateConfig from @sddbuilder/core']],
    ['a flat generate re-exported from the root', "export { generate } from '@sddbuilder/core';", ['generate from @sddbuilder/core']],
    ['a star re-export of the root', "export * from '@sddbuilder/core';", ['star re-export from @sddbuilder/core']],
    ['a star re-export of the root under a namespace', "export * as core from '@sddbuilder/core';", ['star re-export from @sddbuilder/core']],
    ['a dynamic import of the root', "const { generate } = await import('@sddbuilder/core');", ['dynamic import of @sddbuilder/core']],
    ['an import of the flat core generate module', "import { x } from '../../../packages/core/src/generate.js';", ['path ../../../packages/core/src/generate.js']],
    ['a package subpath to the flat core plan module', "import { y } from '@sddbuilder/core/src/plan.js';", ['path @sddbuilder/core/src/plan.js']],
    ['a flat planGeneration read through a namespace import', "import * as core from '@sddbuilder/core';\nconst p = core.planGeneration(config, templates);", ['planGeneration from @sddbuilder/core via core']],
    ['a namespace import destructured for a flat name', "import * as core from '@sddbuilder/core';\nconst { generate } = core;", ['namespace core used without a member']],
    ['a namespace import passed whole', "import * as core from '@sddbuilder/core';\nconst all = Object.keys(core);", ['namespace core used without a member']],
    ['a flat validateConfig with no spaces around braces', "import{validateConfig}from'@sddbuilder/core';", ['validateConfig from @sddbuilder/core']],
  ])('F-07 AC-023 the matcher flags %s', (_name, text, expected) => {
    expect(flatGenerateImports(text)).toEqual(expected);
  });

  it.each([
    ['the pipeline namespace', "import { pipeline } from '@sddbuilder/core';\npipeline.generate(config, templates);"],
    ['the pipeline checkReply through the namespace', "import { pipeline } from '@sddbuilder/core';\npipeline.checkReply(plan, reply);"],
    ['the pipeline generate through a namespace import', "import * as core from '@sddbuilder/core';\nconst p = core.pipeline.generate(config, templates);"],
    ['a non-flat root export', "import { parseProjectConfig, INPUT_CAPS, type ConfigProblem } from '@sddbuilder/core';"],
    ['a non-flat root member read through a namespace import', "import * as core from '@sddbuilder/core';\nconst c = core.parseProjectConfig(json);"],
    ['the API own generate module', "import { generateProject } from './generate/service.js';"],
    ['the API own prompt module', "import { buildGenerationPrompt } from '../src/generate/prompt.js';"],
    ['a pipeline module path into core', "import { generate } from '../../../packages/core/src/pipeline/generate/generate.js';"],
    ['a flat name that is not imported', 'const generate = 1;\nexport const planGeneration = 2;'],
    ['a flat name from another package', "import { generate } from 'some-other-package';"],
    ['a non-flat member of a namespace import', "import * as core from '@sddbuilder/core';\nconst p = core.pipeline.planGeneration(config, templates);"],
    ['a flat name on another object', "import * as core from '@sddbuilder/core';\nconst p = other.planGeneration(config, templates);"],
  ])('F-07 AC-023 the matcher does not flag %s', (_name, text) => {
    expect(flatGenerateImports(text)).toEqual([]);
  });
});
