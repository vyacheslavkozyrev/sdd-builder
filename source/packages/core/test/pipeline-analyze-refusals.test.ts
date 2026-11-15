// F-04 AC-004 and AC-005: each refusal problem is a blocker at its path, and a valid configuration has none.
import { describe, expect, it } from 'vitest';
import { refusalFindings } from '../src/pipeline/analyze/refusals.js';
import { configProblems } from '../src/pipeline/generate/generate.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import type { FlowBlock, PipelineBlock, PipelineConditionBlock, ProjectConfig } from '../src/pipeline/model.js';

/** A deep copy of the default pipeline, so the shared default is never changed. */
function copyDefault(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

function blockIndex(config: ProjectConfig, id: string): number {
  const index = config.pipeline.blocks.findIndex((block) => block.id === id);
  if (index < 0) throw new Error(`no block ${id} in the default pipeline`);
  return index;
}

function flowAt(config: ProjectConfig, id: string): FlowBlock {
  const block = config.pipeline.blocks[blockIndex(config, id)];
  if (block?.kind !== 'flow') throw new Error(`${id} is not a flow`);
  return block;
}

function agentIndexIn(flow: FlowBlock): number {
  const index = flow.blocks.findIndex((block) => block.kind === 'agent');
  if (index < 0) throw new Error(`flow ${flow.id} has no agent`);
  return index;
}

function blockers(config: ProjectConfig): { subject: string; message: string }[] {
  return analyzeStructure(config)
    .filter((finding) => finding.severity === 'blocker')
    .map((finding) => ({ subject: finding.subject, message: finding.message }));
}

/** The index of the first Condition of the pipeline: the gate between the specify and ux flows in the default pipeline. */
function firstConditionIndex(config: ProjectConfig): number {
  return config.pipeline.blocks.findIndex((block: PipelineBlock) => block.kind === 'condition');
}

interface Case {
  name: string;
  build: () => ProjectConfig;
  path: string;
}

const cases: Case[] = [
  {
    name: 'a rule tag that names no rule',
    build: () => {
      const config = copyDefault();
      const flow = flowAt(config, 'specify');
      flow.ruleTags = ['no-such-rule'];
      return config;
    },
    path: `pipeline.blocks[${blockIndex(defaultProjectConfig, 'specify')}].ruleTags[0]`,
  },
  {
    name: 'a Condition whose fail route names no block',
    build: () => {
      const config = copyDefault();
      const index = firstConditionIndex(config);
      const block = config.pipeline.blocks[index] as PipelineConditionBlock;
      config.pipeline.blocks[index] = { ...block, failRoute: { kind: 'back', blockId: 'no-such-block' } };
      return config;
    },
    path: `pipeline.blocks[${firstConditionIndex(defaultProjectConfig)}]`,
  },
  {
    name: 'a block with no description',
    build: () => {
      const config = copyDefault();
      const flow = flowAt(config, 'specify');
      const agentIndex = flow.blocks.findIndex((block) => block.kind === 'agent');
      const agent = flow.blocks[agentIndex];
      if (agent?.kind !== 'agent') throw new Error('specify has no agent');
      flow.blocks[agentIndex] = { ...agent, description: '' };
      return config;
    },
    path: `pipeline.blocks[${blockIndex(defaultProjectConfig, 'specify')}].blocks[${agentIndexIn(flowAt(defaultProjectConfig, 'specify'))}]`,
  },
];

describe('F-04 AC-004: each refusal problem is one blocker at its path', () => {
  it.each(cases)('F-04 AC-004 reports $name as a blocker at its path', ({ build, path }) => {
    const config = build();
    const found = blockers(config);
    const problems = configProblems(config);
    expect(found).toEqual(problems.map((problem) => ({ subject: problem.path, message: problem.message })));
    expect(found.filter((finding) => finding.subject === path)).toHaveLength(1);
  });

  it('F-04 AC-004 gives each problem exactly one blocker, with the problem count', () => {
    const config = copyDefault();
    flowAt(config, 'specify').ruleTags = ['no-such-rule'];
    flowAt(config, 'ux').ruleTags = ['no-such-rule'];
    const found = blockers(config);
    expect(found).toHaveLength(configProblems(config).length);
    expect(found).toHaveLength(2);
  });

  it('F-04 AC-004 sorts the blockers by subject, then message, in the same order as the generator problem list', () => {
    const config = copyDefault();
    flowAt(config, 'ux').ruleTags = ['no-such-rule'];
    flowAt(config, 'specify').ruleTags = ['no-such-rule'];
    const found = blockers(config);
    expect(found).toHaveLength(2);
    expect(found).toEqual(configProblems(config).map((problem) => ({ subject: problem.path, message: problem.message })));
  });

  it('F-04 AC-004 returns every finding as a blocker with a message and a subject', () => {
    const config = copyDefault();
    flowAt(config, 'specify').ruleTags = ['no-such-rule'];
    const found = refusalFindings(config);
    expect(found).toHaveLength(1);
    for (const finding of found) {
      expect(finding.severity).toBe('blocker');
      expect(finding.message.length).toBeGreaterThan(0);
    }
  });
});

describe('F-04 AC-005: a configuration the refusal checks accept has no refusal blocker', () => {
  it('F-04 AC-005 the default pipeline gives no blocker', () => {
    expect(blockers(copyDefault())).toEqual([]);
  });

  it('F-04 AC-005 removing one agent description gives exactly one blocker, at that agent', () => {
    const config = copyDefault();
    const flow = flowAt(config, 'specify');
    const agentIndex = flow.blocks.findIndex((block) => block.kind === 'agent');
    const agent = flow.blocks[agentIndex];
    if (agent?.kind !== 'agent') throw new Error('specify has no agent');
    flow.blocks[agentIndex] = { ...agent, description: '' };
    const found = blockers(config);
    expect(found).toHaveLength(1);
    expect(found[0]?.subject).toBe(`pipeline.blocks[${blockIndex(defaultProjectConfig, 'specify')}].blocks[${agentIndex}]`);
  });

  it('F-04 AC-005 does not change the configuration it reads', () => {
    const config = copyDefault();
    flowAt(config, 'specify').ruleTags = ['no-such-rule'];
    const before = structuredClone(config);
    analyzeStructure(config);
    expect(config).toEqual(before);
  });
});
