import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const defaultPath = resolve(sourceDir, 'templates', 'pipeline', 'default.json');

function loadDefaultConfig(): unknown {
  const pipeline: unknown = JSON.parse(readFileSync(defaultPath, 'utf8'));
  return { schemaVersion: 2, rules: [], pipeline };
}

describe('F-02 AC-030 the default pipeline parses without problems', () => {
  it('F-02 AC-030 parses default.json with parseProjectConfig and reports no problems', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe('F-02 AC-031 the default pipeline has six flows and the §11 build order', () => {
  it('F-02 AC-031 lists the flows as specify, ux, plan, build, verify, complete', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    expect(result.config.pipeline.flows.map((flow) => flow.id)).toEqual([
      'specify',
      'ux',
      'plan',
      'build',
      'verify',
      'complete',
    ]);
  });

  it('F-02 AC-031 gives every flow one start block, as its first block', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    for (const flow of result.config.pipeline.flows) {
      const starts = flow.blocks.filter((block) => block.kind === 'start').map((block) => block.id);
      expect(starts, flow.id).toEqual([`${flow.id}-start`]);
      expect(flow.blocks[0]?.kind, flow.id).toBe('start');
    }
  });

  it('F-02 AC-031 places the §11 gates on the flow links of build and verify', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    const flows = result.config.pipeline.flows;
    // A gate's fail output stops the process (decision 33), so the link carries no route.
    expect(flows.find((flow) => flow.id === 'build')?.connectedTo?.gate).toEqual({
      kind: 'check',
      description: 'all tasks committed and the check passes',
      type: 'checks',
    });
    expect(flows.find((flow) => flow.id === 'verify')?.connectedTo?.gate).toEqual({
      kind: 'approval',
      description: 'Approval: the manual checklist results',
    });
  });

  it('F-02 AC-031 orders the build flow blocks as start, implement, review, checks, test, checks, diff size, commit, end', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    const build = result.config.pipeline.flows.find((flow) => flow.id === 'build');
    const labels = (build?.blocks ?? []).map((block) => {
      switch (block.kind) {
        case 'start':
          return 'start';
        case 'agent':
          return `agent ${block.name}`;
        case 'check':
          return `check ${block.type}`;
        case 'end':
          return 'end';
        case 'approval':
          return 'approval';
      }
    });
    expect(labels).toEqual([
      'start',
      'agent implement',
      'agent review',
      'check checks',
      'agent test',
      'check checks',
      'check diff size',
      'agent commit',
      'end',
    ]);
  });
});

describe('F-02 AC-032 the default pipeline takes a required feature-id argument', () => {
  it('F-02 AC-032 includes feature-id as a required argument', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    const argument = result.config.pipeline.arguments.find((item) => item.id === 'feature-id');
    expect(argument).toMatchObject({ id: 'feature-id', required: true });
  });
});
