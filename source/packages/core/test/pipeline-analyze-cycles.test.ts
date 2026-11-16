// F-06 AC-009 (core part): a Connection that closes a cycle in its list is one blocker at the Connection's path. The
// cycle is found in the pipeline's Connections (between flows) and in each enabled child flow's (between blocks). A
// disabled Connection or a disabled flow gives none. The default pipeline has no cycle.
import { describe, expect, it } from 'vitest';
import { cycleFindings } from '../src/pipeline/analyze/cycles.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import type { AnalysisFinding, ConnectionBlock, FlowBlock, PipelineBlock, ProjectConfig } from '../src/pipeline/model.js';

/** A deep copy of the default pipeline, so the shared default is never changed. */
function copyDefault(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

function connection(id: string, from: string, to: string, enabled = true): ConnectionBlock {
  return { kind: 'connection', id, enabled, from, to, artifact: `${id} artifact` };
}

/** A flow with no blocks of its own, taken from the default so its fields are valid. */
function emptyFlow(id: string): FlowBlock {
  const flow = defaultProjectConfig.pipeline.blocks.find((block): block is FlowBlock => block.kind === 'flow');
  if (flow === undefined) throw new Error('the default pipeline has no flow');
  return { ...structuredClone(flow), id, blocks: [] };
}

/** The default pipeline with its child flow `index` holding the given blocks in place of its own. */
function withFlowBlocks(index: number, blocks: FlowBlock['blocks']): ProjectConfig {
  const config = copyDefault();
  const flow = config.pipeline.blocks[index];
  if (flow?.kind !== 'flow') throw new Error(`pipeline.blocks[${index}] is not a flow`);
  flow.blocks = blocks;
  return config;
}

/** A configuration whose pipeline holds only the given blocks (the default's fields kept). */
function withPipelineBlocks(blocks: PipelineBlock[]): ProjectConfig {
  const config = copyDefault();
  config.pipeline.blocks = blocks;
  return config;
}

function blocker(subject: string, id: string, from: string, to: string): AnalysisFinding {
  return {
    severity: 'blocker',
    subject,
    message: `connection "${id}" closes a cycle: "${to}" already leads back to "${from}"`,
  };
}

describe('F-06 AC-009: a Connection that closes a cycle inside a flow', () => {
  it('F-06 AC-009 gives no finding for the default pipeline', () => {
    expect(cycleFindings(defaultProjectConfig)).toEqual([]);
  });

  it('F-06 AC-009 gives no finding for an acyclic chain with a shortcut', () => {
    const config = withFlowBlocks(10, [
      connection('a-b', 'a', 'b'),
      connection('b-c', 'b', 'c'),
      connection('a-c', 'a', 'c'),
    ]);
    expect(cycleFindings(config)).toEqual([]);
  });

  it('F-06 AC-009 marks the second Connection of a two-block cycle, at its own path', () => {
    const config = withFlowBlocks(10, [connection('a-b', 'a', 'b'), connection('b-a', 'b', 'a')]);
    expect(cycleFindings(config)).toEqual([blocker('pipeline.blocks[10].blocks[1]', 'b-a', 'b', 'a')]);
  });

  it('F-06 AC-009 marks the Connection that closes a three-block cycle, and only that one', () => {
    const config = withFlowBlocks(10, [
      connection('a-b', 'a', 'b'),
      connection('b-c', 'b', 'c'),
      connection('c-a', 'c', 'a'),
    ]);
    expect(cycleFindings(config)).toEqual([blocker('pipeline.blocks[10].blocks[2]', 'c-a', 'c', 'a')]);
  });

  it('F-06 AC-009 marks a Connection from a block to itself', () => {
    const config = withFlowBlocks(10, [connection('a-a', 'a', 'a')]);
    expect(cycleFindings(config)).toEqual([blocker('pipeline.blocks[10].blocks[0]', 'a-a', 'a', 'a')]);
  });

  it('F-06 AC-009 gives no finding when the closing Connection is disabled', () => {
    const config = withFlowBlocks(10, [
      connection('a-b', 'a', 'b'),
      connection('b-a', 'b', 'a', false),
    ]);
    expect(cycleFindings(config)).toEqual([]);
  });

  it('F-06 AC-009 gives no finding for a cycle in a disabled flow', () => {
    const config = withFlowBlocks(10, [connection('a-b', 'a', 'b'), connection('b-a', 'b', 'a')]);
    const flow = config.pipeline.blocks[10];
    if (flow?.kind !== 'flow') throw new Error('pipeline.blocks[10] is not a flow');
    flow.enabled = false;
    expect(cycleFindings(config)).toEqual([]);
  });

  it('F-06 AC-009 reports two independent cycles in one flow, one blocker each, in list order', () => {
    const config = withFlowBlocks(10, [
      connection('a-b', 'a', 'b'),
      connection('b-a', 'b', 'a'),
      connection('c-d', 'c', 'd'),
      connection('d-c', 'd', 'c'),
    ]);
    expect(cycleFindings(config)).toEqual([
      blocker('pipeline.blocks[10].blocks[1]', 'b-a', 'b', 'a'),
      blocker('pipeline.blocks[10].blocks[3]', 'd-c', 'd', 'c'),
    ]);
  });
});

describe('F-06 AC-009: a Connection that closes a cycle between flows', () => {
  it('F-06 AC-009 marks the pipeline Connection that closes a cycle between two flows, at its path', () => {
    const config = withPipelineBlocks([
      emptyFlow('first'),
      emptyFlow('second'),
      connection('first-second', 'first', 'second'),
      connection('second-first', 'second', 'first'),
    ]);
    expect(cycleFindings(config)).toEqual([blocker('pipeline.blocks[3]', 'second-first', 'second', 'first')]);
  });

  it('F-06 AC-009 gives no finding for a disabled pipeline Connection that would close a cycle', () => {
    const config = withPipelineBlocks([
      emptyFlow('first'),
      emptyFlow('second'),
      connection('first-second', 'first', 'second'),
      connection('second-first', 'second', 'first', false),
    ]);
    expect(cycleFindings(config)).toEqual([]);
  });
});

describe('F-06 AC-009: the cycle finding in the analysis', () => {
  it('F-06 AC-009 appears in analyzeStructure as a blocker with the Connection path as subject', () => {
    const config = withFlowBlocks(10, [connection('a-b', 'a', 'b'), connection('b-a', 'b', 'a')]);
    const findings = analyzeStructure(config);
    expect(findings).toContainEqual(blocker('pipeline.blocks[10].blocks[1]', 'b-a', 'b', 'a'));
  });

  it('F-06 AC-009 gives the same findings in the same order on every call', () => {
    const config = withFlowBlocks(10, [connection('a-b', 'a', 'b'), connection('b-a', 'b', 'a')]);
    expect(cycleFindings(config)).toEqual(cycleFindings(config));
    expect(analyzeStructure(config)).toEqual(analyzeStructure(config));
  });

  it('F-06 AC-009 does not change the configuration it reads', () => {
    const config = withFlowBlocks(10, [connection('a-b', 'a', 'b'), connection('b-a', 'b', 'a')]);
    const before = structuredClone(config);
    cycleFindings(config);
    expect(config).toEqual(before);
  });
});
