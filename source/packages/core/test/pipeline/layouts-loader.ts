import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Test code only (F-05 T010): reads the layouts under `source/templates/` so the tests render the real text.
// `src/` never reads a file; the generator is given the layout text by its caller.
const templatesDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'templates');

// The text of a layout, by its path relative to `source/templates/`, e.g. `claude-code/pipeline.md`.
export function readLayout(relativePath: string): string {
  return readFileSync(join(templatesDir, relativePath), 'utf8');
}
