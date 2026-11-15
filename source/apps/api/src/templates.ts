import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { templateSourceFromRecord, type ListableTemplateSource } from '@sddbuilder/core';

/**
 * Reads every file under `dir` (recursively) into an in-memory template source, keyed by the
 * path relative to `dir` with forward slashes (for example `base/CLAUDE.md`). Called once at
 * start-up: a missing or unreadable directory throws here, naming the directory.
 */
export function loadTemplates(dir: string): ListableTemplateSource {
  const files: Record<string, string> = {};
  try {
    readTree(dir, dir, files);
  } catch (error) {
    throw new Error(`Cannot read the templates directory ${dir}: ${errorMessage(error)}`, { cause: error });
  }
  return templateSourceFromRecord(files);
}

function readTree(root: string, current: string, files: Record<string, string>): void {
  const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const full = join(current, entry.name);
    if (entry.isDirectory()) {
      readTree(root, full, files);
    } else if (entry.isFile()) {
      const key = relative(root, full).split(sep).join('/');
      files[key] = readFileSync(full, 'utf8');
    } else {
      throw new Error(`${full} is neither a regular file nor a directory`);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
