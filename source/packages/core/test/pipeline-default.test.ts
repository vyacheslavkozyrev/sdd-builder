import { describe, expect, it } from 'vitest';
import defaultJson from '../../../templates/pipeline/default.json' with { type: 'json' };
import { defaultProjectConfig } from '../src/pipeline/default.js';
import type { ConnectionBlock, FlowBlock, PipelineBlock } from '../src/pipeline/model.js';
import { parsePipelineConfig } from '../src/pipeline/parse.js';

type JsonObject = Record<string, unknown>;

function flows(): FlowBlock[] {
  return defaultProjectConfig.pipeline.blocks.filter((block): block is FlowBlock => block.kind === 'flow');
}

/** The agents of a flow, by name and scope, in the order the flow runs them. */
function agentsOf(flow: FlowBlock): { name: string; scope: string }[] {
  return flow.blocks.flatMap((block) => (block.kind === 'agent' ? [{ name: block.name, scope: block.scope }] : []));
}

/** One row per gate or check between flows: the connection it sits on, its check, its decider and its fail route. */
function gateRows(): { between: string; checkType: string; decidedBy: string; fail: string }[] {
  const blocks: PipelineBlock[] = defaultProjectConfig.pipeline.blocks;
  const connections = new Map<string, ConnectionBlock>();
  for (const block of blocks) {
    if (block.kind === 'connection') connections.set(block.id, block);
  }
  return blocks.flatMap((block) => {
    if (block.kind !== 'condition') return [];
    const connection = connections.get(block.onConnection);
    if (connection === undefined) throw new Error(`gate ${block.id} sits on no connection`);
    const fail = block.failRoute.kind === 'back' ? `back to ${block.failRoute.blockId}` : block.failRoute.kind;
    return [{ between: `${connection.from} -> ${connection.to}`, checkType: block.checkType, decidedBy: block.decidedBy, fail }];
  });
}

function indexOfId(list: JsonObject[], id: string): number {
  const index = list.findIndex((item) => item['id'] === id);
  if (index === -1) throw new Error(`no block with id ${id}`);
  return index;
}

describe('F-01 AC-013 the default pipeline has six child flows in order', () => {
  it('lists the flows as specify, ux, plan, build, verify, complete', () => {
    expect(flows().map((flow) => flow.id)).toEqual(['specify', 'ux', 'plan', 'build', 'verify', 'complete']);
  });
});

describe('F-01 AC-014 the agents of each flow have the scope of building-blocks.md §4', () => {
  it('gives build four task-scoped agents, and feature scope to the other agents', () => {
    const scopes = Object.fromEntries(flows().map((flow) => [flow.id, agentsOf(flow)]));
    expect(scopes).toEqual({
      specify: [{ name: 'specify', scope: 'feature' }],
      ux: [{ name: 'ux', scope: 'feature' }],
      plan: [{ name: 'plan', scope: 'feature' }],
      build: [
        { name: 'implement', scope: 'task' },
        { name: 'review', scope: 'task' },
        { name: 'test', scope: 'task' },
        { name: 'commit', scope: 'task' },
      ],
      verify: [{ name: 'verify', scope: 'feature' }],
      complete: [{ name: 'complete', scope: 'feature' }],
    });
  });
});

describe('F-01 AC-015 the gates between the flows equal the table of building-blocks.md §4', () => {
  it('has the five gates and checks, with their check type, decider and fail route', () => {
    expect(gateRows()).toEqual([
      { between: 'specify -> ux', checkType: 'approval', decidedBy: 'human', fail: 'back to specify' },
      { between: 'ux -> plan', checkType: 'approval', decidedBy: 'human', fail: 'back to ux' },
      { between: 'plan -> build', checkType: 'approval', decidedBy: 'human', fail: 'back to plan' },
      { between: 'build -> verify', checkType: 'checks', decidedBy: 'agent', fail: 'stop' },
      { between: 'verify -> complete', checkType: 'approval', decidedBy: 'human', fail: 'back to verify' },
    ]);
  });

  it('runs the build flow steps in the order of building-blocks.md §4, with their fail routes and the 400-line limit', () => {
    const build = flows().find((flow) => flow.id === 'build');
    expect(build).toBeDefined();
    const steps = (build?.blocks ?? []).flatMap((block) => {
      if (block.kind === 'agent') return [`agent ${block.name}`];
      if (block.kind !== 'condition') return [];
      const fail = block.failRoute.kind === 'back' ? `back to ${block.failRoute.blockId}` : block.failRoute.kind;
      return [`condition ${block.checkType} fail ${fail}`];
    });
    expect(steps).toEqual([
      'agent implement',
      'agent review',
      'condition review fail back to build-implement',
      'agent test',
      'condition checks fail back to build-implement',
      'condition diff-size fail stop',
      'agent commit',
    ]);
    const diffSize = build?.blocks.find((block) => block.kind === 'condition' && block.checkType === 'diff-size');
    expect(diffSize).toMatchObject({ checkType: 'diff-size', threshold: 400 });
  });
});

describe('F-01 AC-016 the default pipeline is a valid configuration', () => {
  it('parses the JSON file without problems, to the exported default', () => {
    const result = parsePipelineConfig(defaultJson);
    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(result).toEqual({ ok: true, config: defaultProjectConfig });
  });

  it('gives the pipeline Start the required argument feature-id', () => {
    const start = defaultProjectConfig.pipeline.blocks.find((block) => block.kind === 'start');
    expect(start).toMatchObject({ kind: 'start', arguments: [{ name: 'feature-id', required: true }] });
  });
});

describe('F-01 AC-017 a changed copy of the default is refused at the path of the problem', () => {
  it('refuses a build agent whose scope is not one of the three scopes, and names its path', () => {
    const copy = structuredClone(defaultJson) as JsonObject;
    const pipeline = copy['pipeline'] as JsonObject;
    const blocks = pipeline['blocks'] as JsonObject[];
    const buildAt = indexOfId(blocks, 'build');
    const build = blocks[buildAt] as JsonObject;
    const flowBlocks = build['blocks'] as JsonObject[];
    const implementAt = indexOfId(flowBlocks, 'build-implement');
    (flowBlocks[implementAt] as JsonObject)['scope'] = 'sprint';

    expect(parsePipelineConfig(copy)).toEqual({
      ok: false,
      problems: [
        {
          path: `pipeline.blocks[${buildAt}].blocks[${implementAt}].scope`,
          message: 'must be project, feature or task',
        },
      ],
    });
  });
});
