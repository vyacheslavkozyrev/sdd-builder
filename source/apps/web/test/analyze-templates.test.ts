import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { baseEntries, layoutText, loadGenerationTemplates } from '../src/analyze/templates.js';

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'templates');

interface ManifestEntry {
  readonly path: string;
  readonly layout: string;
}

function manifestEntries(): ManifestEntry[] {
  return JSON.parse(readFileSync(join(TEMPLATES_DIR, 'base', 'manifest.json'), 'utf8')) as ManifestEntry[];
}

describe('F-13 AC-021 templates in the browser', () => {
  it('gives the base paths of source/templates/base/manifest.json in the same order', () => {
    const templates = loadGenerationTemplates();
    expect(templates.base.map((entry) => entry.path)).toEqual(manifestEntries().map((entry) => entry.path));
  });

  it('loads the text of every base layout named in the manifest', () => {
    const templates = loadGenerationTemplates();
    const expected = manifestEntries().map((entry) => readFileSync(join(TEMPLATES_DIR, entry.layout), 'utf8'));
    expect(templates.base.map((entry) => entry.layout)).toEqual(expected);
  });

  it('loads the pipeline, flow, agent and rule layouts as the text of their files', () => {
    const templates = loadGenerationTemplates();
    const read = (name: string): string => readFileSync(join(TEMPLATES_DIR, 'claude-code', name), 'utf8');
    expect(templates.pipeline).toBe(read('pipeline.md'));
    expect(templates.flow).toBe(read('flow.md'));
    expect(templates.agent).toBe(read('agent.md'));
    expect(templates.rule).toBe(read('rule.md'));
  });

  it('reads the layout of a known template name as the text of its file', () => {
    expect(layoutText('base/CLAUDE.md')).toBe(readFileSync(join(TEMPLATES_DIR, 'base', 'CLAUDE.md'), 'utf8'));
  });

  it('refuses a layout name the web app does not load', () => {
    expect(() => layoutText('base/missing.md')).toThrow('the template base/missing.md is not loaded by the web app');
  });

  it('refuses a manifest that is not a JSON array', () => {
    expect(() => baseEntries('{"path":"CLAUDE.md","layout":"base/CLAUDE.md"}')).toThrow('must be a JSON array');
  });

  it('refuses a manifest entry that is not an object', () => {
    expect(() => baseEntries('[null]')).toThrow('holds an entry that is not an object');
    expect(() => baseEntries('["CLAUDE.md"]')).toThrow('holds an entry that is not an object');
  });

  it('refuses a manifest entry without a string path and a string layout', () => {
    expect(() => baseEntries('[{"path":"CLAUDE.md"}]')).toThrow('need a string path and a string layout');
    expect(() => baseEntries('[{"path":1,"layout":"base/CLAUDE.md"}]')).toThrow('need a string path and a string layout');
  });

  it('reads a well-formed manifest into its path and layout pairs', () => {
    expect(baseEntries('[{"path":"CLAUDE.md","layout":"base/CLAUDE.md"}]')).toEqual([
      { path: 'CLAUDE.md', layout: 'base/CLAUDE.md' },
    ]);
  });
});
