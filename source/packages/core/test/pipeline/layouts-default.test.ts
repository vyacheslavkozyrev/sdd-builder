import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { planGeneration, type PlannedFile } from '../../src/pipeline/generate/plan.js';
import type { BaseTemplate, GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { defaultPipelineConfig, readLayout } from './layouts-loader.js';

const MANIFEST_PATH = 'base/manifest.json';

// Words and paths of this repository that a generated project must never mention (AC-037). The generated project is
// self-contained: its own paths are the ones listed in the manifest and in the layouts, not these.
const REPOSITORY_MARKERS = [
  'SDDBuilder',
  'sddbuilder',
  'source/apps',
  'source/packages',
  'source/templates',
  'source/scripts',
  'spec/design',
  'spec/documents/idea.md',
  'spec/documents/architecture.md',
  'spec/documents/features.md',
  'spec/documents/ui.md',
];

// Markers that a layout leaves in its text when a value is missing (AC-039): a placeholder, a section marker and a
// step marker.
const LEFTOVER_MARKERS = ['{{', '#enabled', '#step:'];

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

// The real layouts and the real base manifest, read from `source/templates` as the caller passes them to the generator.
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

// The planned files of the default pipeline, built from the real templates. A refused plan fails the test at once.
function defaultPlan(): PlannedFile[] {
  const plan = planGeneration(defaultPipelineConfig(), templates());
  if (!plan.ok) throw new Error('the default pipeline must plan');
  return [...plan.files];
}

const README_PATH = 'README.md';
const CLAUDE_CODE_HEADING = '## Claude Code layout';
// A row: its layout file, then its output path, then an optional note such as `one per flow`.
const ROW = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`[^|]*\|$/;

// The output paths of the Claude Code layout table in `source/templates/README.md`, read in test code only. A row with
// a placeholder (`<flow id>`, `<agent name>`, `<rule id>`) stands for one path per flow, Agent block or rule of the config.
function readmePaths(config: ProjectConfig): string[] {
  const lines = readLayout(README_PATH).split('\n');
  const start = lines.indexOf(CLAUDE_CODE_HEADING);
  if (start === -1) throw new Error('the README has no Claude Code layout heading');
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const section = end === -1 ? rest : rest.slice(0, end);

  const flowIds = config.pipeline.flows.map((flow) => flow.id);
  const agentNames = config.pipeline.flows.flatMap((flow) =>
    flow.blocks.flatMap((block) => (block.kind === 'agent' ? [block.name] : [])),
  );
  const ruleIds = config.rules.map((rule) => rule.id);

  return section.flatMap((line) => {
    const match = ROW.exec(line);
    if (match === null) return [];
    const path = match[2] ?? '';
    if (path.includes('<flow id>')) return flowIds.map((id) => path.replace('<flow id>', id));
    if (path.includes('<agent name>')) return agentNames.map((name) => path.replace('<agent name>', name));
    if (path.includes('<rule id>')) return ruleIds.map((id) => path.replace('<rule id>', id));
    return [path];
  });
}

describe('F-05 default pipeline output', () => {
  it('F-05 AC-036 generating the default pipeline config twice gives the same file list, paths and text', () => {
    const first = defaultPlan();
    const second = defaultPlan();

    expect(first.length).toBeGreaterThan(0);
    expect(second.map((file) => file.path)).toEqual(first.map((file) => file.path));
    expect(second.map((file) => file.layout)).toEqual(first.map((file) => file.layout));
    expect(second).toEqual(first);
  });

  it('F-05 AC-037 no output file of the default pipeline mentions SDDBuilder or a path of this repository', () => {
    const files = defaultPlan();

    for (const file of files) {
      for (const marker of REPOSITORY_MARKERS) {
        expect(file.path, `${file.path} path`).not.toContain(marker);
        expect(file.layout, `${file.path} text`).not.toContain(marker);
      }
    }
  });

  it('F-05 AC-039 no output file of the default pipeline has a placeholder, a section marker or a step marker left', () => {
    const files = defaultPlan();

    for (const file of files) {
      for (const marker of LEFTOVER_MARKERS) {
        expect(file.layout, `${file.path} text`).not.toContain(marker);
      }
    }
  });

  it('F-05 AC-040 the default pipeline renders through every layout with no error, and every planned file has text', () => {
    expect(() => defaultPlan()).not.toThrow();

    for (const file of defaultPlan()) {
      expect(file.layout.length, `${file.path} text`).toBeGreaterThan(0);
    }
  });

  it('F-05 AC-040 the planned paths of the default pipeline are exactly the rows of the README Claude Code layout table', () => {
    const documented = readmePaths(defaultPipelineConfig());
    const planned = defaultPlan().map((file) => file.path);

    expect(documented.length, 'the README table has rows').toBeGreaterThan(0);
    expect([...planned].sort()).toEqual([...documented].sort());
  });
});
