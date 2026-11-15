// F-04 AC-009: an enabled agent with scope `task` or `feature` needs an iteration source, an artifact produced earlier in
// pipeline order or, in the first flow, a pipeline Start argument. Without one it is one warning at its path. The default
// pipeline gives none. Assertions are on the inputs warnings only (the message names the agent and "iteration source").
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import type { AnalysisFinding } from '../src/model.js';
import { inputFindings } from '../src/pipeline/analyze/inputs.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import type {
  AgentBlock,
  ChildBlock,
  ConnectionBlock,
  EndBlock,
  FlowBlock,
  PipelineBlock,
  PipelineStartBlock,
  ProjectConfig,
} from '../src/pipeline/model.js';

/** A deep copy of the default pipeline, so the shared default is never changed. */
function copyDefault(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

function blockAt(config: ProjectConfig, index: number): PipelineBlock {
  const block = config.pipeline.blocks[index];
  if (block === undefined) throw new Error(`no pipeline block at index ${index}`);
  return block;
}

function startAt(config: ProjectConfig): PipelineStartBlock {
  const block = blockAt(config, 0);
  if (block.kind !== 'start') throw new Error('pipeline block 0 is not the Start');
  return block;
}

function flowAt(config: ProjectConfig, index: number): FlowBlock {
  const block = blockAt(config, index);
  if (block.kind !== 'flow') throw new Error(`pipeline block ${index} is not a flow`);
  return block;
}

function childAt(config: ProjectConfig, flowIndex: number, childIndex: number): ChildBlock {
  const child = flowAt(config, flowIndex).blocks[childIndex];
  if (child === undefined) throw new Error(`no child ${childIndex} in flow ${flowIndex}`);
  return child;
}

function agentAt(config: ProjectConfig, flowIndex: number, childIndex: number): AgentBlock {
  const child = childAt(config, flowIndex, childIndex);
  if (child.kind !== 'agent') throw new Error(`child ${childIndex} of flow ${flowIndex} is not an agent`);
  return child;
}

function endAt(config: ProjectConfig, flowIndex: number, childIndex: number): EndBlock {
  const child = childAt(config, flowIndex, childIndex);
  if (child.kind !== 'end') throw new Error(`child ${childIndex} of flow ${flowIndex} is not an End`);
  return child;
}

function connectionAt(config: ProjectConfig, index: number): ConnectionBlock {
  const block = blockAt(config, index);
  if (block.kind !== 'connection') throw new Error(`pipeline block ${index} is not a connection`);
  return block;
}

/** The inputs warnings: each one names an agent with no iteration source. */
function inputsOf(findings: AnalysisFinding[]): AnalysisFinding[] {
  return findings.filter((finding) => finding.message.includes('iteration source'));
}

/** The subjects of the inputs warnings, in order. */
function subjectsOf(config: ProjectConfig): string[] {
  return inputsOf(inputFindings(config)).map((finding) => finding.subject);
}

// Default pipeline indexes: 1 = specify flow, 4 = ux flow, 10 = build flow. Connection 2 = specify-to-ux (stories.md).
const SPECIFY_FLOW = 1;
const UX_FLOW = 4;
const SPECIFY_CONNECTION = 2;
const SPECIFY_AGENT = 1;

describe('F-04 AC-009 iteration sources of the agents', () => {
  it('F-04 AC-009 gives no inputs warning for the default pipeline', () => {
    expect(inputFindings(copyDefault())).toEqual([]);
  });

  it('F-04 AC-009 the default pipeline gives no inputs warning in the full analysis', () => {
    expect(inputsOf(analyzeStructure(copyDefault()))).toEqual([]);
  });

  it('F-04 AC-009 an inputs warning is a warning whose subject is the agent path', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    expect(inputFindings(config)).toEqual([
      {
        severity: 'warning',
        subject: `pipeline.blocks[${SPECIFY_FLOW}].blocks[${SPECIFY_AGENT}]`,
        message:
          'agent "specify-agent" has no iteration source: no earlier artifact and the pipeline Start declares no argument',
      },
    ]);
  });

  it('F-04 AC-009 a project-scope agent gives no inputs warning', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    agentAt(config, SPECIFY_FLOW, SPECIFY_AGENT).scope = 'project';
    expect(subjectsOf(config)).toEqual([]);
  });

  it('F-04 AC-009 a disabled agent gives no inputs warning', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    agentAt(config, SPECIFY_FLOW, SPECIFY_AGENT).enabled = false;
    expect(subjectsOf(config)).toEqual([]);
  });

  it('F-04 AC-009 a disabled flow gives no inputs warning', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    flowAt(config, SPECIFY_FLOW).enabled = false;
    expect(subjectsOf(config)).toEqual([]);
  });

  it('F-04 AC-009 an artifact produced in an earlier flow counts as the iteration source', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    // The ux agent sits after the specify flow's End (stories.md) and the specify-to-ux connection.
    expect(subjectsOf(config)).toEqual([`pipeline.blocks[${SPECIFY_FLOW}].blocks[${SPECIFY_AGENT}]`]);
    expect(subjectsOf(config)).not.toContain(`pipeline.blocks[${UX_FLOW}].blocks[1]`);
  });

  it('F-04 AC-009 an artifact produced only in a later flow does not count', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    // Remove the artifacts before the ux agent: the specify flow's End and the specify-to-ux connection.
    delete endAt(config, SPECIFY_FLOW, 2).produced;
    connectionAt(config, SPECIFY_CONNECTION).enabled = false;
    expect(subjectsOf(config)).toEqual([
      `pipeline.blocks[${SPECIFY_FLOW}].blocks[${SPECIFY_AGENT}]`,
      `pipeline.blocks[${UX_FLOW}].blocks[1]`,
    ]);
  });

  it('F-04 AC-009 a disabled connection does not count as an artifact', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    delete endAt(config, SPECIFY_FLOW, 2).produced;
    connectionAt(config, SPECIFY_CONNECTION).enabled = false;
    expect(subjectsOf(config)).toContain(`pipeline.blocks[${UX_FLOW}].blocks[1]`);
  });

  it('F-04 AC-009 a disabled End does not count as an artifact', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    endAt(config, SPECIFY_FLOW, 2).enabled = false;
    connectionAt(config, SPECIFY_CONNECTION).enabled = false;
    expect(subjectsOf(config)).toContain(`pipeline.blocks[${UX_FLOW}].blocks[1]`);
  });

  it('F-04 AC-009 an empty artifact label does not count as an artifact', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    endAt(config, SPECIFY_FLOW, 2).produced = '';
    connectionAt(config, SPECIFY_CONNECTION).artifact = '';
    expect(subjectsOf(config)).toContain(`pipeline.blocks[${UX_FLOW}].blocks[1]`);
  });

  it('F-04 AC-009 a task-scope agent is checked like a feature-scope one', () => {
    const config = copyDefault();
    startAt(config).arguments = [];
    agentAt(config, SPECIFY_FLOW, SPECIFY_AGENT).scope = 'task';
    expect(subjectsOf(config)).toEqual([`pipeline.blocks[${SPECIFY_FLOW}].blocks[${SPECIFY_AGENT}]`]);
  });

  it('F-04 AC-009 a first-flow agent counts the pipeline Start argument as its iteration source', () => {
    const config = copyDefault();
    expect(startAt(config).arguments.length).toBeGreaterThan(0);
    expect(subjectsOf(config)).toEqual([]);
  });

  it('F-04 AC-009 the default pipeline is not changed by the checks', () => {
    const before = JSON.stringify(defaultProjectConfig);
    const config = copyDefault();
    startAt(config).arguments = [];
    inputFindings(config);
    expect(JSON.stringify(defaultProjectConfig)).toBe(before);
  });
});
