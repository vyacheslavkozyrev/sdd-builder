import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { type GenerationTemplates, loadTemplates } from '../src/generate/load-templates.js';

// The real templates folder: source/templates, one level above source/apps.
const TEMPLATES_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'templates');

const fixtures: string[] = [];

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A fixture templates folder with the given files. Each test gets its own folder, removed afterwards.
function fixtureRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'sddbuilder-templates-'));
  fixtures.push(root);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  return root;
}

// A complete fixture: a manifest with one base layout and the four Claude Code layouts.
function completeFixture(manifest: string = JSON.stringify([{ path: 'CLAUDE.md', layout: 'base/CLAUDE.md' }])): Record<string, string> {
  return {
    'base/manifest.json': manifest,
    'base/CLAUDE.md': 'base text',
    'claude-code/pipeline.md': 'pipeline text',
    'claude-code/flow.md': 'flow text',
    'claude-code/agent.md': 'agent text',
    'claude-code/rule.md': 'rule text',
  };
}

describe('F-15 AC-002 base paths in manifest order', () => {
  it('gives the base files in the order of the manifest, with the paths and layouts from it', () => {
    const manifest = JSON.parse(readFileSync(join(TEMPLATES_ROOT, 'base', 'manifest.json'), 'utf8')) as {
      path: string;
      layout: string;
    }[];
    const templates = loadTemplates(TEMPLATES_ROOT);

    expect(templates.base.map((file) => file.path)).toEqual(manifest.map((entry) => entry.path));
    expect(templates.base.map((file) => file.layout)).toEqual(
      manifest.map((entry) => readFileSync(join(TEMPLATES_ROOT, entry.layout), 'utf8')),
    );
  });
});

describe('F-15 AC-002 real templates are present and non-empty', () => {
  it('gives a non-empty layout for every base file', () => {
    const templates = loadTemplates(TEMPLATES_ROOT);

    expect(templates.base.length).toBeGreaterThan(0);
    for (const file of templates.base) {
      expect(file.layout.trim(), file.path).not.toBe('');
    }
  });

  it.each([
    ['pipeline', 'claude-code/pipeline.md', (t: GenerationTemplates) => t.pipeline],
    ['flow', 'claude-code/flow.md', (t: GenerationTemplates) => t.flow],
    ['agent', 'claude-code/agent.md', (t: GenerationTemplates) => t.agent],
    ['rule', 'claude-code/rule.md', (t: GenerationTemplates) => t.rule],
  ])('reads the %s layout from %s', (_key, layout, pick) => {
    const text = pick(loadTemplates(TEMPLATES_ROOT));

    expect(text).toBe(readFileSync(join(TEMPLATES_ROOT, layout), 'utf8'));
    expect(text.trim()).not.toBe('');
  });
});

describe('F-15 AC-002 a missing or unreadable file throws and names its path', () => {
  it.each([
    ['a base layout', 'base/CLAUDE.md'],
    ['the pipeline layout', 'claude-code/pipeline.md'],
    ['the flow layout', 'claude-code/flow.md'],
    ['the agent layout', 'claude-code/agent.md'],
    ['the rule layout', 'claude-code/rule.md'],
  ])('throws naming the path when %s is missing', (_label, missing) => {
    const files = completeFixture();
    delete files[missing];
    const root = fixtureRoot(files);

    expect(() => loadTemplates(root)).toThrowError(`Cannot read template ${join(root, missing)}`);
  });

  it('throws naming the path when a layout cannot be read (a directory in its place)', () => {
    const files = completeFixture();
    const root = fixtureRoot(files);
    rmSync(join(root, 'claude-code', 'flow.md'));
    mkdirSync(join(root, 'claude-code', 'flow.md'));

    expect(() => loadTemplates(root)).toThrowError(`Cannot read template ${join(root, 'claude-code/flow.md')}`);
  });

  it('throws naming the manifest when the manifest is missing', () => {
    const files = completeFixture();
    delete files['base/manifest.json'];
    const root = fixtureRoot(files);

    expect(() => loadTemplates(root)).toThrowError(`Cannot read template ${join(root, 'base/manifest.json')}`);
  });

  it('throws naming the manifest when the manifest is not JSON', () => {
    const root = fixtureRoot(completeFixture('[{ "path": '));

    expect(() => loadTemplates(root)).toThrowError(`Invalid template manifest ${join(root, 'base/manifest.json')}`);
  });
});

describe('F-15 AC-002 a manifest that is not a list of { path, layout } throws', () => {
  it.each([
    ['an object', '{}'],
    ['a string', '"CLAUDE.md"'],
    ['null', 'null'],
    ['a list of numbers', '[1, 2]'],
    ['an entry with no layout', '[{ "path": "CLAUDE.md" }]'],
    ['an entry with no path', '[{ "layout": "base/CLAUDE.md" }]'],
    ['an entry that is null', '[null]'],
    ['an entry with an empty path', '[{ "path": "", "layout": "base/CLAUDE.md" }]'],
    ['an entry with an empty layout', '[{ "path": "CLAUDE.md", "layout": "" }]'],
    ['an entry with a number path', '[{ "path": 1, "layout": "base/CLAUDE.md" }]'],
  ])('refuses a manifest that is %s', (_label, manifest) => {
    const root = fixtureRoot(completeFixture(manifest));

    expect(() => loadTemplates(root)).toThrowError(`Invalid template manifest ${join(root, 'base/manifest.json')}: expected a list`);
  });

  it('gives an empty base list for an empty manifest', () => {
    const root = fixtureRoot(completeFixture('[]'));

    expect(loadTemplates(root).base).toEqual([]);
  });
});
