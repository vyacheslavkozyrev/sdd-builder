import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadTemplates } from './support/load-templates.js';

// The base manifest and the spec template's stories file are read from the real templates (source/templates/).
// loadTemplates reads the manifest, each base file it lists and the four Claude Code layouts; readLayout reads
// only claude-code/, so the base file is taken from the loader's base list.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

const stories = loadTemplates(templatesRoot).base.find((entry) => entry.path.endsWith('stories.md'));

describe('F-05 AC-021 the stories entry of the base manifest maps to the F-00 template path', () => {
  it('F-05 AC-021 maps the stories file to spec/specifications/F-00-template/stories.md', () => {
    expect(stories?.path).toBe('spec/specifications/F-00-template/stories.md');
  });

  it('F-05 AC-021 lists CLAUDE.md first, then the three spec template entries in their output order', () => {
    expect(loadTemplates(templatesRoot).base.map((entry) => entry.path)).toEqual([
      'CLAUDE.md',
      'spec/specifications/F-00-template/stories.md',
      'spec/specifications/F-00-template/plan.md',
      'spec/specifications/F-00-template/progress.md',
    ]);
  });
});

describe('F-05 AC-024 the stories template keeps the headings the reply check requires', () => {
  it('F-05 AC-024 has exactly the level-2 headings Out of Scope, Stories and Requirement Coverage, in order', () => {
    expect(stories?.headings).toEqual(['Out of Scope', 'Stories', 'Requirement Coverage']);
  });

  it('F-05 AC-024 has the [auto] and [device] tag rules', () => {
    expect(stories?.text).toContain('`[auto]`');
    expect(stories?.text).toContain('`[device]`');
  });

  it('F-05 AC-024 names no path of this repository, no SDDBuilder name and no F-XX id of this repository', () => {
    const text = stories?.text ?? '';
    expect(text).not.toMatch(/source\//);
    expect(text).not.toMatch(/SDDBuilder/);
    expect(text).not.toMatch(/spec\/documents/);
    expect(text).not.toMatch(/spec\/specifications\/F-0/);
    expect(text).not.toMatch(/F-\d{2}/);
  });
});
