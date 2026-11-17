// Test support: reads a templates directory (source/templates/ in the real repository, a fixture in the tests)
// into the Templates input of the generator. This file is test code, so it may use the file system; core's
// src never does. The real layouts are read by the layout tests of F-05, not by the product.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { headingsOf } from '../../../src/pipeline/generate/templates.js';
import type { BaseFile, Layout, Templates } from '../../../src/pipeline/generate/templates.js';

interface ManifestEntry {
  readonly file: string;
  readonly path: string;
}

function readText(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read template file ${file}: ${reason}`, { cause: error });
  }
}

export function readLayout(root: string, name: string): Layout {
  const text = readText(join(root, 'claude-code', name));
  return { text, headings: headingsOf(text) };
}

// The manifest is a JSON array of { file, path } objects. Anything else is refused with a message that names
// the manifest, so a broken template is found at its source and not as a failed assertion further on.
function parseManifest(value: unknown): ManifestEntry[] {
  if (!Array.isArray(value)) {
    throw new Error('Template manifest base/manifest.json must be a JSON array of { file, path } entries');
  }
  const entries: unknown[] = value;
  return entries.map((entry, index): ManifestEntry => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Template manifest entry ${index} must be an object with file and path`);
    }
    if (!('file' in entry) || typeof entry.file !== 'string' || entry.file === '') {
      throw new Error(`Template manifest entry ${index} must have a non-empty string file`);
    }
    if (!('path' in entry) || typeof entry.path !== 'string' || entry.path === '') {
      throw new Error(`Template manifest entry ${index} must have a non-empty string path`);
    }
    return { file: entry.file, path: entry.path };
  });
}

export function loadTemplates(root: string): Templates {
  const manifestText = readText(join(root, 'base', 'manifest.json'));
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Template manifest base/manifest.json is not valid JSON: ${reason}`, { cause: error });
  }

  const base: BaseFile[] = parseManifest(manifest).map((entry) => {
    const text = readText(join(root, 'base', entry.file));
    return { path: entry.path, text, headings: headingsOf(text) };
  });

  return {
    base,
    pipelineCommand: readLayout(root, 'pipeline-command.md'),
    command: readLayout(root, 'command.md'),
    agent: readLayout(root, 'agent.md'),
    rule: readLayout(root, 'rule.md'),
  };
}
