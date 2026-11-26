import { describe, expect, it } from 'vitest';
import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import { planGeneration, type PlannedFile } from '../../src/pipeline/generate/plan.js';
import { flowChain, processDiagram } from '../../src/pipeline/generate/mermaid.js';
import type { BaseTemplate, GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import type { AgentBlock, Block, ConditionBlock, Flow } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const MANIFEST_PATH = 'base/manifest.json';
const PROCESS_MD = 'spec/documents/process.md';

const STOPS = 'The process stops for a person at the end of this flow.';
const DOES_NOT_STOP = 'The process does not stop at the end of this flow.';

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

function processOf(config: ProjectConfig): string {
  const file = planOf(config).find((planned) => planned.path === PROCESS_MD);
  if (file === undefined) throw new Error('the plan has no process.md');
  return file.layout;
}

// The default pipeline, read from its JSON file and passed through the parser as a user document would be.
function defaultConfig(): ProjectConfig {
  const parsed = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipelineJson });
  if (!parsed.ok) throw new Error('the default pipeline must parse');
  return parsed.config;
}

// The valid one-flow fixture with its flow changed to Start, draft, review (a Condition), publish, End. The true route
// of review goes on to publish; its false route returns to draft with a round limit of 2.
function loopConfig(): ProjectConfig {
  const base = validConfig();
  const flow = base.pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  const draft: AgentBlock = {
    index: 1,
    id: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63',
    kind: 'agent',
    name: 'draft-agent',
    description: 'Drafts the text.',
    arguments: [],
    next: '82c969a4-365a-5525-8168-6ae1093b1867',
  };
  const review: ConditionBlock = {
    index: 2,
    id: '82c969a4-365a-5525-8168-6ae1093b1867',
    kind: 'condition',
    description: 'Is the text complete?',
    true: { to: '9ed0bdfe-f040-5934-9233-bdec297f9995' },
    false: { to: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', roundLimit: 2 },
  };
  const publish: AgentBlock = {
    index: 3,
    id: '9ed0bdfe-f040-5934-9233-bdec297f9995',
    kind: 'agent',
    name: 'publish-agent',
    description: 'Publishes the text.',
    arguments: [],
    next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
  };
  const end: Block = { index: 4, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' };
  const blocks: Block[] = [{ index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63' }, draft, review, publish, end];
  const changed: Flow = { ...flow, blocks };
  return { ...base, pipeline: { ...base.pipeline, flows: [changed] } };
}

// The process list lines of a rendered process.md: each bullet at the start of a line.
function processLines(text: string): string[] {
  return text.split('\n').filter((line) => line.startsWith('- '));
}

// The lines inside the one mermaid fence of a rendered process.md, with the fence lines themselves.
function fences(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] | undefined;
  for (const line of text.split('\n')) {
    if (current === undefined) {
      if (line.startsWith('```')) current = [line];
    } else {
      current.push(line);
      if (line === '```') {
        blocks.push(current);
        current = undefined;
      }
    }
  }
  return blocks;
}

describe('F-05 layouts: the base manifest lists process.md', () => {
  it('F-05 AC-026 lists spec/documents/process.md right after CLAUDE.md with its layout base/process.md', () => {
    const manifest = readManifest();
    const index = manifest.findIndex((entry) => entry.path === PROCESS_MD);
    expect(manifest[index - 1]).toEqual({ path: 'CLAUDE.md', layout: 'base/CLAUDE.md' });
    expect(manifest[index]).toEqual({ path: PROCESS_MD, layout: 'base/process.md' });
  });

  it('F-05 AC-026 renders process.md from its layout and the values of a fixture, with no placeholder left', () => {
    const text = processOf(validConfig());
    expect(text.startsWith('# Process\n')).toBe(true);
    expect(text).not.toContain('{{');
    expect(text).toContain(`- Build (\`${validConfig().pipeline.flows[0]?.id}\`): `);
    expect(text.endsWith('```\n')).toBe(true);
  });

  it('F-05 AC-026 renders process.md from the default pipeline and writes no SDDBuilder name or feature id', () => {
    const text = processOf(defaultConfig());
    expect(text).not.toContain('{{');
    expect(text).not.toMatch(/SDDBuilder|source\/|F-\d\d/);
    expect(text).toContain('Run `/pipeline` to run the whole process.');
  });
});

describe('F-05 layouts: process.md lists each flow once, in order, with its approval sentence', () => {
  it('F-05 AC-029 lists each flow of the default pipeline once, in the order of the next links', () => {
    const config = defaultConfig();
    const ids = flowChain(config.pipeline.flows).map((flow) => flow.id);
    const lines = processLines(processOf(config));
    const listed = lines.map((line) => /\(`([^`]+)`\)/.exec(line)?.[1] ?? '');
    expect(listed).toEqual(ids);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('F-05 AC-029 gives each flow its approval sentence, matching its approval flag', () => {
    const config = defaultConfig();
    const lines = processLines(processOf(config));
    const flows = flowChain(config.pipeline.flows);
    expect(lines).toHaveLength(flows.length);
    flows.forEach((flow, i) => {
      const expected = flow.approval ? STOPS : DOES_NOT_STOP;
      expect(lines[i]).toContain(expected);
      expect(lines[i]).not.toContain(flow.approval ? DOES_NOT_STOP : STOPS);
    });
  });

  it('F-05 AC-029 writes the approval sentence and the description of a fixture flow on its line', () => {
    const base = validConfig();
    const flow = base.pipeline.flows[0];
    if (flow === undefined) throw new Error('the fixture has no flow');
    const config: ProjectConfig = {
      ...base,
      pipeline: { ...base.pipeline, flows: [{ ...flow, approval: true, description: 'Builds the project.' }] },
    };
    expect(processLines(processOf(config))).toEqual([`- Build (\`${flow.id}\`): Builds the project. ${STOPS}`]);
  });

  it('F-05 AC-029 writes the conditions and the retry route of a flow as text under its line', () => {
    const lines = processOf(loopConfig()).split('\n');
    const start = lines.indexOf('  Conditions:');
    expect(start).toBeGreaterThan(-1);
    expect(lines.slice(start + 1, start + 4)).toEqual([
      '  1. Is the text complete?',
      '     - True: go to step 4 (the agent `.claude/agents/publish-agent.md`)',
      '     - False: return to step 2 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
    ]);
  });

  it('F-05 AC-029 writes no Conditions part for a flow with no Condition', () => {
    expect(processOf(validConfig())).not.toContain('Conditions:');
  });
});

describe('F-05 layouts: process.md holds one mermaid fence that starts with flowchart', () => {
  it('F-05 AC-030 holds exactly one fenced block marked mermaid in the default pipeline', () => {
    const text = processOf(defaultConfig());
    const mermaid = text.split('\n').filter((line) => line.startsWith('```mermaid'));
    expect(mermaid).toEqual(['```mermaid']);
    expect(text.split('\n').filter((line) => line.startsWith('```'))).toHaveLength(2);
  });

  it('F-05 AC-030 has flowchart as the first line inside the mermaid fence, and the fence holds only the diagram text', () => {
    const config = defaultConfig();
    const blocks = fences(processOf(config));
    expect(blocks).toHaveLength(1);
    const block = blocks[0] ?? [];
    expect(block[0]).toBe('```mermaid');
    expect(block[1]).toBe('flowchart');
    expect(block.slice(1, -1)).toEqual(processDiagram(config.pipeline).split('\n'));
    expect(block[block.length - 1]).toBe('```');
  });

  it('F-05 AC-030 has the same fence for a fixture, with the flowchart line and no placeholder left', () => {
    const blocks = fences(processOf(validConfig()));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.[1]).toBe('flowchart');
    expect(processOf(validConfig())).not.toContain('{{');
  });
});
