import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FLAT_EXPORTS: ReadonlySet<string> = new Set(['analyzeStructure', 'skippedAnalysis', 'checkReview']);
const CORE_ROOT = '@sddbuilder/core';
const CORE_ANALYSIS_PATH = /(^|\/)core\/src\/analyze(\/|$)/;
const PIPELINE_NAMESPACE_IMPORT = /import\s*\{\s*pipeline\s*\}\s*from\s*'@sddbuilder\/core'/;
const NAMESPACE_IMPORT = /\bimport\b\s*\*\s*as\s+([A-Za-z_]\w*)\s*from\s*['"]@sddbuilder\/core['"]/g;
const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const APPS_DIR = fileURLToPath(new URL('../../', import.meta.url));
// This file holds the inline fixtures that prove the matcher can fail, so the scan skips this one path only.
const SELF = join('api', 'test', 'no-flat-analysis.test.ts');

// One import or re-export: its clause (everything before `from`) and its module specifier.
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
 * Lists every flat analysis import in one file's text: a flat export named from the core root,
 * a flat export read through a namespace import of the root, or any specifier that points into
 * `core/src/analyze/`. An empty list means the text is clean.
 */
function flatAnalysisImports(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(STATEMENT)) {
    const clause = match[1] ?? '';
    const specifier = match[2] ?? '';
    if (CORE_ANALYSIS_PATH.test(specifier)) found.push(`path ${specifier}`);
    if (specifier === CORE_ROOT) {
      for (const name of namesIn(clause)) {
        if (FLAT_EXPORTS.has(name)) found.push(`${name} from ${CORE_ROOT}`);
      }
    }
  }
  for (const match of text.matchAll(NAMESPACE_IMPORT)) {
    const alias = match[1] ?? '';
    for (const name of FLAT_EXPORTS) {
      if (new RegExp(`(^|[^\\w.$])${alias}\\.${name}\\b`).test(text)) {
        found.push(`${name} from ${CORE_ROOT} via ${alias}`);
      }
    }
  }
  return found;
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
    } else if (SOURCE_FILE.test(entry.name) && relative(APPS_DIR, path) !== SELF) {
      files.push({ path, text: readFileSync(path, 'utf8') });
    }
  }
  return files;
}

describe('F-04 AC-025 no flat analysis import under source/apps/', () => {
  const files = scanFiles(APPS_DIR);

  it('F-04 AC-025 the scan reads the API source and test files', () => {
    expect(files.some((file) => file.path.endsWith(join('api', 'src', 'analyze.ts')))).toBe(true);
    expect(files.some((file) => file.path.endsWith(join('api', 'test', 'analyze-route.test.ts')))).toBe(true);
  });

  it('F-04 AC-025 no source or test file under source/apps/ imports a flat analysis export', () => {
    const findings = files.flatMap((file) =>
      flatAnalysisImports(file.text).map((hit) => `${relative(APPS_DIR, file.path)}: ${hit}`),
    );
    expect(findings).toEqual([]);
  });

  it('F-04 AC-025 the scan finds the pipeline namespace import and does not flag it', () => {
    expect(files.some((file) => PIPELINE_NAMESPACE_IMPORT.test(file.text))).toBe(true);
    expect(
      flatAnalysisImports("import { pipeline } from '@sddbuilder/core';\nconst r = pipeline.analyzeStructure(config);"),
    ).toEqual([]);
  });

  it.each([
    ['a named flat export from the root', "import { analyzeStructure } from '@sddbuilder/core';", ['analyzeStructure from @sddbuilder/core']],
    ['a flat export in a multi-line clause', "import {\n  skippedAnalysis,\n  validateConfig,\n} from '@sddbuilder/core';", ['skippedAnalysis from @sddbuilder/core']],
    ['an aliased flat export with double quotes', 'import { checkReview as check } from "@sddbuilder/core";', ['checkReview from @sddbuilder/core']],
    ['a flat export marked type-only among others', "import { type AnalysisResult, type checkReview } from '@sddbuilder/core';", ['checkReview from @sddbuilder/core']],
    ['a flat export re-exported from the root', "export { analyzeStructure } from '@sddbuilder/core';", ['analyzeStructure from @sddbuilder/core']],
    ['an import of a file under core/src/analyze/', "import { x } from '../../../packages/core/src/analyze/index.js';", ['path ../../../packages/core/src/analyze/index.js']],
    ['a package subpath under core/src/analyze/', "import { y } from '@sddbuilder/core/src/analyze/refusals.js';", ['path @sddbuilder/core/src/analyze/refusals.js']],
    ['a flat export read through a namespace import', "import * as core from '@sddbuilder/core';\nconst r = core.analyzeStructure(config);", ['analyzeStructure from @sddbuilder/core via core']],
    ['a flat export with no spaces around braces', "import{checkReview}from'@sddbuilder/core';", ['checkReview from @sddbuilder/core']],
  ])('F-04 AC-025 the matcher flags %s', (_name, text, expected) => {
    expect(flatAnalysisImports(text)).toEqual(expected);
  });

  it.each([
    ['the pipeline namespace', "import { pipeline } from '@sddbuilder/core';\npipeline.checkReview(x);"],
    ['a non-flat root export', "import { validateConfig, type AnalysisResult } from '@sddbuilder/core';"],
    ['the API own analyze module', "import { analyzePipeline } from './analyze.js';"],
    ['an API file named analyze under src', "import { x } from '../src/analyze.js';"],
    ['a flat name that is not imported', 'const analyzeStructure = 1;\nexport const skippedAnalysis = 2;'],
    ['a flat name from another package', "import { checkReview } from 'some-other-package';"],
    ['a non-flat member of a namespace import', "import * as core from '@sddbuilder/core';\nconst r = core.pipeline.analyzeStructure(config);"],
    ['a flat name on another object', "import * as core from '@sddbuilder/core';\nconst r = other.analyzeStructure(config);"],
  ])('F-04 AC-025 the matcher does not flag %s', (_name, text) => {
    expect(flatAnalysisImports(text)).toEqual([]);
  });
});
