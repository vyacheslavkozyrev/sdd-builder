// F-04 AC-006 and AC-007: reachability findings of `analyzeStructure`. The generator's refusals report each enabled
// block or flow that the walk from its Start does not reach (pipeline/generate/refusals-routes.ts), and the analysis
// returns them as blockers through `configProblems`. These tests pin the paths and the disabled cases.
import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../src/pipeline/index.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import type { AgentBlock, AnalysisFinding, FlowBlock, ProjectConfig } from '../src/pipeline/model.js';

const NOT_REACHABLE = 'is not reachable from';

/** A deep copy of the default pipeline, so the shared default is never changed. */
function copyDefault(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

function blockIndex(config: ProjectConfig, id: string): number {
  const index = config.pipeline.blocks.findIndex((block) => block.id === id);
  if (index < 0) throw new Error(`no block ${id} in the default pipeline`);
  return index;
}

function flowIn(config: ProjectConfig, id: string): FlowBlock {
  const block = config.pipeline.blocks[blockIndex(config, id)];
  if (block?.kind !== 'flow') throw new Error(`${id} is not a flow`);
  return block;
}

function agentIn(flow: FlowBlock): AgentBlock {
  const agent = flow.blocks.find((block): block is AgentBlock => block.kind === 'agent');
  if (agent === undefined) throw new Error(`flow ${flow.id} has no agent`);
  return agent;
}

/** A flow with a Start and an End and no agent, as a stub for a flow added to the pipeline. */
function stubFlow(id: string, enabled: boolean, description: string): FlowBlock {
  return {
    kind: 'flow',
    id,
    name: id,
    description,
    enabled,
    blocks: [
      { kind: 'start', id: `${id}-start`, enabled: true },
      { kind: 'end', id: `${id}-end`, enabled: true, outcome: 'done' },
    ],
  };
}

/** The reachability findings of a configuration, as the analysis returns them. */
function reachabilityOf(config: ProjectConfig): AnalysisFinding[] {
  return analyzeStructure(config).filter((finding) => finding.message.includes(NOT_REACHABLE));
}

/** Every finding of the configuration at one path. */
function findingsAt(config: ProjectConfig, subject: string): AnalysisFinding[] {
  return analyzeStructure(config).filter((finding) => finding.subject === subject);
}

const SPECIFY_INDEX = blockIndex(defaultProjectConfig, 'specify');
const PIPELINE_END_INDEX = blockIndex(defaultProjectConfig, 'pipeline-end');

interface WalkCase {
  name: string;
  build: () => ProjectConfig;
  expected: AnalysisFinding[];
}

/** Orphans give one blocker each; the last case is a disabled block the walk passes through, so it gives none. */
const walkCases: WalkCase[] = [
  {
    name: 'an enabled block after the End of its flow',
    build: () => {
      const config = copyDefault();
      const flow = flowIn(config, 'specify');
      flow.blocks.push({ ...agentIn(flow), id: 'orphan-agent' });
      return config;
    },
    expected: [
      {
        severity: 'blocker',
        subject: `pipeline.blocks[${SPECIFY_INDEX}].blocks[3]`,
        message: 'block "orphan-agent" is not reachable from the Start of flow "specify"',
      },
    ],
  },
  {
    name: 'an enabled flow placed after the pipeline End',
    build: () => {
      const config = copyDefault();
      config.pipeline.blocks.push(stubFlow('orphan', true, 'An orphan flow.'));
      return config;
    },
    expected: [
      {
        severity: 'blocker',
        subject: `pipeline.blocks[${PIPELINE_END_INDEX + 1}]`,
        message: 'flow "orphan" is not reachable from the pipeline Start',
      },
    ],
  },
  {
    name: 'an enabled block after a disabled one, reached through the live blocks before it',
    build: () => {
      const config = copyDefault();
      const flow = flowIn(config, 'specify');
      const agent = agentIn(flow);
      flow.blocks.splice(
        1,
        1,
        { ...agent, id: 'disabled-agent', enabled: false },
        { ...agent, id: 'live-agent' },
      );
      return config;
    },
    expected: [],
  },
];

describe('F-04 AC-006: an enabled block or flow with no path from the Start is a blocker at its path', () => {
  it.each(walkCases)('F-04 AC-006 reports $name, and only what the walk does not reach', ({ build, expected }) => {
    expect(reachabilityOf(build())).toEqual(expected);
  });

  it('F-04 AC-006 gives the orphan block and the orphan flow one blocker each, at the path the generator produces', () => {
    const config = copyDefault();
    const flow = flowIn(config, 'specify');
    flow.blocks.push({ ...agentIn(flow), id: 'orphan-agent' });
    config.pipeline.blocks.push(stubFlow('orphan', true, 'An orphan flow.'));
    const found = reachabilityOf(config);
    expect(found.map((finding) => finding.subject)).toEqual([
      `pipeline.blocks[${SPECIFY_INDEX}].blocks[3]`,
      `pipeline.blocks[${PIPELINE_END_INDEX + 1}]`,
    ]);
  });

  it('F-04 AC-006 the default pipeline gives no reachability blocker', () => {
    expect(reachabilityOf(copyDefault())).toEqual([]);
  });
});

interface SilentCase {
  name: string;
  build: () => ProjectConfig;
  /** The path a disabled block or flow sits at, which must carry no finding. */
  path: string;
}

const silentCases: SilentCase[] = [
  {
    name: 'a disabled block after the End of its flow, with a blank description',
    build: () => {
      const config = copyDefault();
      const flow = flowIn(config, 'specify');
      flow.blocks.push({ ...agentIn(flow), id: 'orphan-agent', enabled: false, description: '' });
      return config;
    },
    path: `pipeline.blocks[${SPECIFY_INDEX}].blocks[3]`,
  },
  {
    name: 'a disabled flow after the pipeline End, with a blank description',
    build: () => {
      const config = copyDefault();
      config.pipeline.blocks.push(stubFlow('orphan', false, ''));
      return config;
    },
    path: `pipeline.blocks[${PIPELINE_END_INDEX + 1}]`,
  },
  {
    name: 'a disabled block between live blocks, with a blank description',
    build: () => {
      const config = copyDefault();
      const flow = flowIn(config, 'specify');
      const agent = agentIn(flow);
      flow.blocks.splice(1, 0, { ...agent, id: 'disabled-agent', enabled: false, description: '' });
      return config;
    },
    path: `pipeline.blocks[${SPECIFY_INDEX}].blocks[1]`,
  },
  {
    name: 'a disabled flow between live blocks of the pipeline, with a blank description',
    build: () => {
      const config = copyDefault();
      config.pipeline.blocks.splice(SPECIFY_INDEX + 1, 0, stubFlow('extra', false, ''));
      return config;
    },
    path: `pipeline.blocks[${SPECIFY_INDEX + 1}]`,
  },
];

describe('F-04 AC-007: a disabled block or flow gives no finding, and is not on any path', () => {
  it.each(silentCases)('F-04 AC-007 gives no finding for $name', ({ build, path }) => {
    const config = build();
    expect(findingsAt(config, path)).toEqual([]);
    expect(reachabilityOf(config)).toEqual([]);
  });

  it('F-04 AC-007 a disabled block is not on any path: the enabled blocks after it are still reached', () => {
    const config = copyDefault();
    const flow = flowIn(config, 'specify');
    const agent = agentIn(flow);
    flow.blocks.splice(1, 1, { ...agent, id: 'disabled-agent', enabled: false, description: '' });
    expect(reachabilityOf(config)).toEqual([]);
    expect(analyzeStructure(config).filter((finding) => finding.severity === 'blocker')).toEqual([]);
  });
});
