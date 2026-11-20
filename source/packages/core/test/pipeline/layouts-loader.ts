import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';

// Test code only (F-05 T010): reads the layouts under `source/templates/` so the tests render the real text.
// `src/` never reads a file; the generator is given the layout text by its caller.
const templatesDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'templates');

// The text of a layout, by its path relative to `source/templates/`, e.g. `claude-code/pipeline.md`.
export function readLayout(relativePath: string): string {
  return readFileSync(join(templatesDir, relativePath), 'utf8');
}

// Every layout under `source/templates/` (AC-038): each `.md` file except the README, as a path relative to the
// templates folder with `/` separators, sorted. A new layout is found without being listed anywhere.
export function listLayouts(): string[] {
  return walk(templatesDir)
    .map((file) => relative(templatesDir, file).split(sep).join('/'))
    .filter((path) => path.endsWith('.md') && path !== 'README.md')
    .sort();
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

// The default pipeline config, read from its JSON file and passed through the parser as a user document would be.
export function defaultPipelineConfig(): ProjectConfig {
  const parsed = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipelineJson });
  if (!parsed.ok) throw new Error('the default pipeline must parse');
  return parsed.config;
}
