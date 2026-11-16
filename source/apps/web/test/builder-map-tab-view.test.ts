import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { gateTargetAt } from '../src/builder/map-edit.js';
import { connectionBoxes, mapTabView } from '../src/builder/map-tab-view.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type ChildBlock = pipeline.ChildBlock;
type FlowBlock = pipeline.FlowBlock;
type ConnectionBlock = pipeline.ConnectionBlock;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;
type Route = pipeline.Route;

const START: PipelineBlock = { kind: 'start', id: 'pipeline-start', enabled: true, arguments: [] };
const END: PipelineBlock = { kind: 'end', id: 'pipeline-end', enabled: true, outcome: 'done' };

function config(blocks: PipelineBlock[]): ProjectConfig {
  return { ...structuredClone(pipeline.defaultProjectConfig), pipeline: { name: 'P', blocks } };
}

function flow(id: string, blocks: ChildBlock[] = [], enabled = true): FlowBlock {
  return { kind: 'flow', id, name: id.toUpperCase(), description: 'does work', enabled, blocks };
}

function agent(id: string, scope: pipeline.Scope, enabled = true): ChildBlock {
  return { kind: 'agent', id, enabled, name: id, scope, description: 'job' };
}

function connection(id: string, from: string, to: string, artifact = 'handover', enabled = true): ConnectionBlock {
  return { kind: 'connection', id, enabled, from, to, artifact };
}

function gate(
  id: string,
  onConnection: string,
  passRoute: Route,
  failRoute: Route,
  enabled = true,
): PipelineConditionBlock {
  return {
    kind: 'condition',
    id,
    enabled,
    description: 'passes',
    decidedBy: 'human',
    checkType: 'approval',
    passRoute,
    failRoute,
    onConnection,
  };
}

const NEXT: Route = { kind: 'next' };
const STOP: Route = { kind: 'stop' };
const BACK_TO_A: Route = { kind: 'back', blockId: 'a' };

describe('F-06 AC-001 flow nodes show name, scope and block count, in order', () => {
  it('F-06 AC-001 draws the default pipeline as six flows, left to right, with their scope and count', () => {
    const view = mapTabView(pipeline.defaultProjectConfig);
    expect(view.nodes.map((node) => node.name)).toEqual(['Specify', 'UX', 'Plan', 'Build', 'Verify', 'Complete']);
    expect(view.nodes.map((node) => node.column)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(view.nodes.find((node) => node.id === 'build')).toMatchObject({ scope: 'task', blockCount: 9 });
    expect(view.nodes.find((node) => node.id === 'specify')).toMatchObject({ scope: 'feature', blockCount: 3 });
    expect(view.edges).toHaveLength(5);
  });

  it('F-06 AC-001 the scope is the one scope of the enabled Agent blocks, mixed or no agent otherwise', () => {
    const cases: Array<{ name: string; blocks: ChildBlock[]; scope: string }> = [
      { name: 'one scope', blocks: [agent('a', 'task'), agent('b', 'task')], scope: 'task' },
      { name: 'two scopes', blocks: [agent('a', 'task'), agent('b', 'feature')], scope: 'mixed' },
      { name: 'no agent', blocks: [], scope: 'no agent' },
      { name: 'only a switched-off agent', blocks: [agent('a', 'task', false)], scope: 'no agent' },
      {
        name: 'a switched-off agent does not make it mixed',
        blocks: [agent('a', 'task'), agent('b', 'project', false)],
        scope: 'task',
      },
    ];
    for (const { name, blocks, scope } of cases) {
      const view = mapTabView(config([START, flow('f', blocks), END]));
      expect(view.nodes[0]?.scope, name).toBe(scope);
    }
  });

  it('F-06 AC-001 counts every block of a flow, switched off or not', () => {
    const view = mapTabView(config([START, flow('f', [agent('a', 'task', false), agent('b', 'task')]), END]));
    expect(view.nodes[0]?.blockCount).toBe(2);
  });

  it('F-06 AC-001 a switched-off flow stays on the Map with its enabled flag', () => {
    const view = mapTabView(config([START, flow('f', [], false), END]));
    expect(view.nodes[0]).toMatchObject({ id: 'f', enabled: false });
  });
});

describe('F-06 AC-002 the tab row and the flow nodes open the flow tabs', () => {
  it('F-06 AC-002 the tab row is the Map, then one tab per flow in order, then the + tab', () => {
    const view = mapTabView(config([START, flow('a'), flow('b', [], false), END]));
    expect(view.tabs).toEqual([
      { kind: 'map', label: 'Map' },
      { kind: 'flow', flowId: 'a', label: 'A', enabled: true },
      { kind: 'flow', flowId: 'b', label: 'B', enabled: false },
      { kind: 'add', label: '+' },
    ]);
  });

  it('F-06 AC-002 a config with no flows has the Map and the + tab only', () => {
    const view = mapTabView(config([START, END]));
    expect(view.tabs).toEqual([
      { kind: 'map', label: 'Map' },
      { kind: 'add', label: '+' },
    ]);
    expect(view.nodes).toEqual([]);
  });

  it('F-06 AC-002 each flow node names the tab that opens it', () => {
    const view = mapTabView(pipeline.defaultProjectConfig);
    const flowTabs = view.tabs.flatMap((tab) => (tab.kind === 'flow' ? [tab.flowId] : []));
    expect(view.nodes.map((node) => node.id)).toEqual(flowTabs);
  });
});

describe('F-06 AC-003 a Connection between two flows is an arrow with its artifact label', () => {
  it('F-06 AC-003 draws the connection between two flows with its artifact', () => {
    const view = mapTabView(config([START, flow('a'), flow('b'), connection('c', 'a', 'b', 'plan.md'), END]));
    expect(view.edges).toEqual([{ id: 'c', from: 'a', to: 'b', enabled: true, label: 'plan.md', gates: [] }]);
  });

  it('F-06 AC-003 a blank artifact is no label', () => {
    const view = mapTabView(config([START, flow('a'), flow('b'), connection('c', 'a', 'b', '   '), END]));
    expect(view.edges[0]?.label).toBeNull();
  });

  it('F-06 AC-003 the artifact label is trimmed of surrounding spaces', () => {
    const view = mapTabView(config([START, flow('a'), flow('b'), connection('c', 'a', 'b', '  plan.md  '), END]));
    expect(view.edges[0]?.label).toBe('plan.md');
  });

  it('F-06 AC-003 a connection to an id that is not a flow is not an edge', () => {
    const view = mapTabView(config([START, flow('a'), connection('c', 'a', 'missing'), END]));
    expect(view.edges).toEqual([]);
  });

  it('F-06 AC-003 a switched-off connection is kept with its enabled flag', () => {
    const view = mapTabView(config([START, flow('a'), flow('b'), connection('c', 'a', 'b', 'x', false), END]));
    expect(view.edges[0]).toMatchObject({ id: 'c', enabled: false });
  });

  it('F-06 AC-003 a connection that touches the pipeline Start or End is not an edge between flows', () => {
    const view = mapTabView(
      config([START, flow('a'), connection('s', 'pipeline-start', 'a'), connection('e', 'a', 'pipeline-end'), END]),
    );
    expect(view.edges).toEqual([]);
  });
});

describe('F-06 AC-004 a gate on a connection is a diamond with its pass and fail outputs', () => {
  it('F-06 AC-004 a gate sits on its connection with its check type, decider and labelled outputs', () => {
    const view = mapTabView(
      config([START, flow('a'), flow('b'), connection('c', 'a', 'b'), gate('g', 'c', NEXT, STOP), END]),
    );
    expect(view.edges[0]?.gates).toEqual([
      { id: 'g', enabled: true, text: 'approval · human', pass: 'pass: next', fail: 'fail: stop' },
    ]);
  });

  it('F-06 AC-004 a back route is labelled with the flow it returns to', () => {
    const view = mapTabView(
      config([START, flow('a'), flow('b'), connection('c', 'a', 'b'), gate('g', 'c', NEXT, BACK_TO_A), END]),
    );
    expect(view.edges[0]?.gates[0]?.fail).toBe('fail: back to A');
  });

  it('F-06 AC-004 a back route to an id that is not a flow shows the id', () => {
    const view = mapTabView(
      config([
        START,
        flow('a'),
        flow('b'),
        connection('c', 'a', 'b'),
        gate('g', 'c', NEXT, { kind: 'back', blockId: 'zz' }),
        END,
      ]),
    );
    expect(view.edges[0]?.gates[0]?.fail).toBe('fail: back to zz');
  });

  it('F-06 AC-004 a switched-off gate is kept with its enabled flag', () => {
    const view = mapTabView(
      config([START, flow('a'), flow('b'), connection('c', 'a', 'b'), gate('g', 'c', NEXT, STOP, false), END]),
    );
    expect(view.edges[0]?.gates[0]).toMatchObject({ id: 'g', enabled: false });
  });

  it('F-06 AC-004 a gate on a connection that is not drawn is not drawn anywhere', () => {
    const view = mapTabView(
      config([START, flow('a'), connection('s', 'pipeline-start', 'a'), gate('g', 's', NEXT, STOP), END]),
    );
    expect(view.edges).toEqual([]);
  });

  it('F-06 AC-004 the default pipeline draws a gate on each of its five connections', () => {
    const view = mapTabView(pipeline.defaultProjectConfig);
    expect(view.edges.map((edge) => edge.gates.length)).toEqual([1, 1, 1, 1, 1]);
    expect(view.edges[3]?.gates[0]).toMatchObject({ text: 'checks · agent', fail: 'fail: stop' });
  });
});

describe('F-06 AC-004 the Map toolbox offers Connection, Approval and Check', () => {
  it('F-06 AC-004 lists the three toolbox items with their hints', () => {
    const view = mapTabView(pipeline.defaultProjectConfig);
    expect(view.toolbox).toEqual([
      { kind: 'connection', label: 'Connection', hint: 'runs after · artifact' },
      { kind: 'approval', label: 'Approval', hint: 'human decides: gate' },
      { kind: 'check', label: 'Check', hint: 'agent or diff size: gate' },
    ]);
  });
});

describe('F-06 AC-010 a gate drop lands in a box centred on the connection arrow', () => {
  const columns = new Map([
    ['a', 0],
    ['b', 1],
  ]);
  const edge = { id: 'a-to-b', from: 'a', to: 'b', enabled: true, label: 'Plan', gates: [] };

  it('F-06 AC-010 the box is centred on the midpoint between the two flows', () => {
    const [box] = connectionBoxes([edge], columns);
    // The arrow runs from x 96 (right side of flow a) to x 192 (left side of flow b); its midpoint is (144, 40).
    expect(box).toEqual({ connectionId: 'a-to-b', x: 96, y: 16, width: 96, height: 48 });
  });

  it('F-06 AC-010 a connection whose flow is not drawn gets no box', () => {
    expect(connectionBoxes([{ ...edge, to: 'missing' }], columns)).toEqual([]);
    expect(connectionBoxes([{ ...edge, from: 'missing' }], columns)).toEqual([]);
  });

  it('F-06 AC-010 a drop on the arrow resolves to its connection; the box edges are exclusive on the right and bottom', () => {
    const boxes = connectionBoxes([edge], columns);
    expect(gateTargetAt({ x: 144, y: 40 }, boxes)).toBe('a-to-b');
    expect(gateTargetAt({ x: 192, y: 40 }, boxes)).toBeNull();
    expect(gateTargetAt({ x: 144, y: 64 }, boxes)).toBeNull();
  });
});
