import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { planGeneration, type PlannedFile } from '../../src/pipeline/generate/plan.js';
import { headingsOf } from '../../src/pipeline/generate/headings.js';
import { checkReply } from '../../src/pipeline/generate/reply-check.js';
import type { BaseTemplate, GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const MANIFEST_PATH = 'base/manifest.json';

// The three spec template files of the generated project, with their layouts and the level-2 headings the F-04 reply
// check requires for each document type (the headings of the F-00-template files, in their order).
const SPEC_TEMPLATE: readonly { readonly path: string; readonly layout: string; readonly headings: readonly string[] }[] = [
  {
    path: 'spec/specifications/F-00-template/stories.md',
    layout: 'base/spec-template/stories.md',
    headings: ['## Out of Scope', '## Stories', '## Requirement Coverage'],
  },
  {
    path: 'spec/specifications/F-00-template/plan.md',
    layout: 'base/spec-template/plan.md',
    headings: ['## Tasks', '## Rationale', '## Layer Tags'],
  },
  {
    path: 'spec/specifications/F-00-template/progress.md',
    layout: 'base/spec-template/progress.md',
    headings: [
      '## Phase Status',
      '## Current Task',
      '## Task Log',
      '## Deferred Findings',
      '## Test Results',
      '## Amendments',
    ],
  },
];

interface ManifestEntry {
  readonly path: string;
  readonly layout: string;
}

function isManifest(value: unknown): value is ManifestEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { path?: unknown }).path === 'string' &&
        typeof (entry as { layout?: unknown }).layout === 'string',
    )
  );
}

// The base manifest read from `source/templates/base/manifest.json`, checked against its shape.
function readManifest(): ManifestEntry[] {
  const value: unknown = JSON.parse(readLayout(MANIFEST_PATH));
  if (!isManifest(value)) throw new Error('the base manifest must be a list of { path, layout } entries');
  return value;
}

// The real layouts and the real base manifest, as the caller passes them to the generator.
function templates(): GenerationTemplates {
  const base: BaseTemplate[] = readManifest().map((entry) => ({ path: entry.path, layout: readLayout(entry.layout) }));
  return {
    base,
    pipeline: readLayout('claude-code/pipeline.md'),
    flow: readLayout('claude-code/flow.md'),
    agent: readLayout('claude-code/agent.md'),
    rule: readLayout('claude-code/rule.md'),
  };
}

function planOf(config: ProjectConfig): PlannedFile[] {
  const files = planGeneration(config, templates());
  if (!files.ok) throw new Error('the configuration must plan');
  return [...files.files];
}

function plannedFile(path: string): PlannedFile {
  const file = planOf(validConfig()).find((planned) => planned.path === path);
  if (file === undefined) throw new Error(`the plan has no ${path}`);
  return file;
}

describe('F-05 layouts: the base manifest lists the three spec template files', () => {
  it('F-05 AC-026 lists each spec template file after process.md with its layout base/spec-template/<file>', () => {
    const manifest = readManifest();
    const index = manifest.findIndex((entry) => entry.path === SPEC_TEMPLATE[0]?.path);
    expect(manifest[index - 1]).toEqual({ path: 'spec/documents/process.md', layout: 'base/process.md' });
    SPEC_TEMPLATE.forEach((expected, offset) => {
      expect(manifest[index + offset]).toEqual({ path: expected.path, layout: expected.layout });
    });
  });

  it('F-05 AC-026 plans each spec template file with the text of its layout', () => {
    for (const expected of SPEC_TEMPLATE) {
      const file = plannedFile(expected.path);
      expect(file.layout).toBe(readLayout(expected.layout));
    }
  });
});

describe('F-05 layouts: each spec template layout renders with no placeholder left', () => {
  it('F-05 AC-026 keeps stories.md, plan.md and progress.md as fixed text with no {{...}} placeholder and no empty text', () => {
    for (const expected of SPEC_TEMPLATE) {
      const text = plannedFile(expected.path).layout;
      expect(text, expected.path).not.toContain('{{');
      expect(text.trim(), expected.path).not.toBe('');
    }
  });
});

describe('F-05 layouts: the spec template files keep the level-2 headings of the reply check', () => {
  it('F-05 AC-028 stories.md has the level-2 headings Out of Scope, Stories and Requirement Coverage, in order', () => {
    const stories = SPEC_TEMPLATE[0];
    if (stories === undefined) throw new Error('the stories entry is missing');
    expect(headingsOf(plannedFile(stories.path).layout)).toEqual(stories.headings);
  });

  it('F-05 AC-028 plan.md and progress.md have the level-2 headings of their document types, in order', () => {
    for (const expected of SPEC_TEMPLATE.slice(1)) {
      expect(headingsOf(plannedFile(expected.path).layout), expected.path).toEqual(expected.headings);
    }
  });

  it('F-05 AC-028 has each required heading as a whole line of the layout', () => {
    for (const expected of SPEC_TEMPLATE) {
      const lines = plannedFile(expected.path).layout.split(/\r?\n/).map((line) => line.trimEnd());
      for (const heading of expected.headings) {
        expect(lines, `${expected.path} lacks "${heading}"`).toContain(heading);
      }
    }
  });
});

describe('F-05 layouts: the F-04 reply check accepts the spec template files as written', () => {
  it('F-05 AC-028 accepts each layout text as the reply for its file, with no finding', () => {
    const files = SPEC_TEMPLATE.map((expected) => plannedFile(expected.path));
    const reply = new Map<string, unknown>(files.map((file) => [file.path, file.layout]));
    expect(checkReply({ files }, reply)).toEqual([]);
  });

  it('F-05 AC-028 names the path and the heading when a reply writes a level-2 heading at level 3', () => {
    const stories = SPEC_TEMPLATE[0];
    if (stories === undefined) throw new Error('the stories entry is missing');
    const file = plannedFile(stories.path);
    const text = file.layout.replace(/^## Stories$/m, '### Stories');
    expect(checkReply({ files: [file] }, new Map<string, unknown>([[file.path, text]]))).toEqual([
      { path: stories.path, message: 'is missing the heading "## Stories"' },
    ]);
  });
});

describe('F-05 layouts: the spec template files are self-contained', () => {
  it('F-05 AC-037 writes no SDDBuilder name, repository path or feature id into the spec template files', () => {
    for (const expected of SPEC_TEMPLATE) {
      const text = plannedFile(expected.path).layout;
      expect(text, expected.path).not.toMatch(/SDDBuilder|source\/|F-\d\d/);
    }
  });
});
