/// <reference types="vite/client" />
// The generator templates in the browser (F-13 AC-021). The core generator reads its templates as data and is given
// them; here the web app loads `source/templates` at build time with Vite raw imports, so the file tree is computed
// from the same layouts that the server uses. Nothing is fetched at run time.

import type { pipeline } from '@sddbuilder/core';

type GenerationTemplates = Parameters<typeof pipeline.planGeneration>[1];

// Every layout file the generator reads. The glob is relative to this file: src/analyze -> source.
const TEXTS = import.meta.glob<string>('../../../../templates/{base,claude-code}/**/*.{md,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const PREFIX = '../../../../templates/';

// The text of a layout by its path under `source/templates`. A missing file is a programmer error: the glob and
// the layout names are both in the repository.
export function layoutText(relative: string): string {
  const text = TEXTS[`${PREFIX}${relative}`];
  if (text === undefined) {
    throw new Error(`the template ${relative} is not loaded by the web app`);
  }
  return text;
}

// The base manifest is data in the repository; a malformed one is a programmer error and throws.
export function baseEntries(manifestText: string): { path: string; layout: string }[] {
  const parsed: unknown = JSON.parse(manifestText);
  if (!Array.isArray(parsed)) {
    throw new Error('base/manifest.json must be a JSON array');
  }
  return parsed.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error('base/manifest.json holds an entry that is not an object');
    }
    const { path, layout } = entry as Record<string, unknown>;
    if (typeof path !== 'string' || typeof layout !== 'string') {
      throw new Error('base/manifest.json entries need a string path and a string layout');
    }
    return { path, layout };
  });
}

// The generation templates with the layout texts in place of the manifest's layout paths. The manifest gives the
// base files in output order; each layout path is read through the same raw imports as the other layouts.
export function loadGenerationTemplates(): GenerationTemplates {
  const base = baseEntries(layoutText('base/manifest.json')).map((entry) => ({
    path: entry.path,
    layout: layoutText(entry.layout),
  }));
  return {
    base,
    pipeline: layoutText('claude-code/pipeline.md'),
    flow: layoutText('claude-code/flow.md'),
    agent: layoutText('claude-code/agent.md'),
    rule: layoutText('claude-code/rule.md'),
  };
}
