// Reads the generation templates from `source/templates` (F-15 AC-002). Core never reads a file: this module reads the
// text and hands the templates to core as data. The read runs once at startup, so a missing or unreadable file is a
// programmer error and throws with the path of that file.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { pipeline } from '@sddbuilder/core';

// The core type of the templates, read from the signature of `planGeneration`: core does not export it from the
// pipeline index, and that index is pinned by an F-02 test.
export type GenerationTemplates = Parameters<typeof pipeline.planGeneration>[1];
type BaseTemplate = GenerationTemplates['base'][number];

// The layouts that are not in the base manifest, relative to the templates root.
const PIPELINE_LAYOUT = 'claude-code/pipeline.md';
const FLOW_LAYOUT = 'claude-code/flow.md';
const AGENT_LAYOUT = 'claude-code/agent.md';
const RULE_LAYOUT = 'claude-code/rule.md';
const MANIFEST = 'base/manifest.json';

export function loadTemplates(root: string): GenerationTemplates {
  return {
    base: readManifest(root),
    pipeline: readLayout(root, PIPELINE_LAYOUT),
    flow: readLayout(root, FLOW_LAYOUT),
    agent: readLayout(root, AGENT_LAYOUT),
    rule: readLayout(root, RULE_LAYOUT),
  };
}

function readLayout(root: string, layout: string): string {
  const path = join(root, layout);
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read template ${path}: ${reason(error)}`, { cause: error });
  }
}

function readManifest(root: string): BaseTemplate[] {
  const entries = parseManifest(readLayout(root, MANIFEST), join(root, MANIFEST));
  return entries.map((entry) => ({ path: entry.path, layout: readLayout(root, entry.layout) }));
}

interface ManifestEntry {
  readonly path: string;
  readonly layout: string;
}

function parseManifest(text: string, path: string): ManifestEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid template manifest ${path}: ${reason(error)}`, { cause: error });
  }
  if (!Array.isArray(parsed) || !parsed.every(isManifestEntry)) {
    throw new Error(`Invalid template manifest ${path}: expected a list of { path, layout } strings`);
  }
  return parsed;
}

function isManifestEntry(value: unknown): value is ManifestEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  const { path, layout } = entry;
  return typeof path === 'string' && path !== '' && typeof layout === 'string' && layout !== '';
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
