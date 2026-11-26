import { afterEach, describe, expect, it, vi } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { addBlock } from '../src/builder/blocks.js';
import { addFlow, newId, nextFlowName, tabOrder } from '../src/builder/model.js';
import type { Pipeline } from '../src/builder/model.js';

type Flow = model.Flow;

// A flow with the required fields only. The id and the name are the ones given; the index is 0
// unless another is given (pipelineOf renumbers flows by position).
function flow(id: string, name: string = id, index?: number): Flow {
  return {
    index: index ?? 0,
    id,
    name,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks: [],
  };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

describe('F-11 AC-001 tab row order', () => {
  it('F-11 AC-001 an empty pipeline has the Pipeline tab only', () => {
    expect(tabOrder(pipelineOf())).toEqual([{ kind: 'pipeline' }]);
  });

  it.each([1, 3])('F-11 AC-001 the Pipeline tab is always first and present, with %i flow(s)', (count) => {
    const flows = Array.from({ length: count }, (_, i) => flow(`flow-${i + 1}`));
    const tabs = tabOrder(pipelineOf(...flows));
    expect(tabs).toHaveLength(count + 1);
    expect(tabs[0]).toEqual({ kind: 'pipeline' });
  });

  it('F-11 AC-001 the Pipeline tab comes first, then one tab per flow in pipeline order', () => {
    const tabs = tabOrder(pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c'), flow('3220de8a-cda2-5056-9296-97da044f7176')));
    expect(tabs).toEqual([
      { kind: 'pipeline' },
      { kind: 'flow', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' },
      { kind: 'flow', id: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' },
      { kind: 'flow', id: '3220de8a-cda2-5056-9296-97da044f7176' },
    ]);
  });

  it('F-11 AC-001 the tab row follows the list order, not the ids in sorted order', () => {
    const tabs = tabOrder(pipelineOf(flow('92de9bc8-5aab-5343-97cd-31a2761e2d02'), flow('aab39af1-f7ee-5872-8009-be002cd04380')));
    expect(tabs.slice(1)).toEqual([
      { kind: 'flow', id: '92de9bc8-5aab-5343-97cd-31a2761e2d02' },
      { kind: 'flow', id: 'aab39af1-f7ee-5872-8009-be002cd04380' },
    ]);
  });

  it('F-11 AC-001 the tab row does not change the pipeline it reads', () => {
    const before = pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = JSON.stringify(before);
    tabOrder(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

// A lower-case GUID in the 8-4-4-4-12 form (F-16 AC-027).
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('F-11 AC-003 the default name is the lowest free flow-N', () => {
  it.each([
    ['an empty pipeline', [], 'flow-1'],
    ['flow-1 taken by a name', [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'flow-1')], 'flow-2'],
    ['flow-1 is an id, which does not take the name', [flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')], 'flow-1'],
    ['flow-1 and flow-2 taken by names', [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'flow-1'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'flow-2')], 'flow-3'],
    ['a gap: flow-1 and flow-3 taken by names', [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'flow-1'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'flow-3')], 'flow-2'],
    ['flow-2 taken by a name, flow-1 free', [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'flow-2')], 'flow-1'],
    ['flow-01 is not flow-1', [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'flow-01')], 'flow-1'],
    ['flow-x is not a number', [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'flow-x')], 'flow-1'],
  ])('F-11 AC-003 with %s the default name is %s', (_label, flows, expected) => {
    expect(nextFlowName(pipelineOf(...flows))).toBe(expected);
  });

  it('F-11 AC-003 zero is never used, even in an empty pipeline', () => {
    expect(nextFlowName(pipelineOf())).not.toBe('flow-0');
  });
});

describe('F-11 AC-003 + appends an empty flow after the last one', () => {
  it('F-11 AC-003 the new flow is appended after the last flow', () => {
    const { pipeline } = addFlow(pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')));
    expect(pipeline.flows.slice(0, 2).map((f) => f.id)).toEqual(['ea3211a4-b64b-5204-9451-6fe12fd7c655', 'a0c3aad4-8765-5b23-8df5-7c03d481233c']);
    expect(pipeline.flows[2]?.id).toMatch(GUID);
  });

  it('F-16 AC-027 the new flow gets a GUID id, and the default name flow-1', () => {
    const { pipeline, flowId } = addFlow(pipelineOf());
    const added = pipeline.flows[0];
    expect(added?.id).toMatch(GUID);
    expect(added?.name).toBe('flow-1');
    expect(flowId).toBe(added?.id);
  });

  it('F-11 AC-003 the new flow has no description, no arguments, a blank body, no blocks and no artifacts', () => {
    const { pipeline } = addFlow(pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    const added = pipeline.flows[1];
    expect(added).toBeDefined();
    expect(added && 'description' in added).toBe(false);
    expect(added?.arguments).toEqual([]);
    expect(added?.body).toBe('');
    expect(added?.blocks).toEqual([]);
    expect(added?.artifacts).toEqual([]);
  });

  it('F-11 AC-003 the new flow has no outgoing next and no approval', () => {
    const { pipeline } = addFlow(pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    const added = pipeline.flows[1];
    expect(added && 'next' in added).toBe(false);
    expect(added?.approval).toBe(false);
  });

  it('F-11 AC-003 the new flow gets an index after every existing one, so none repeats', () => {
    const existing: Pipeline = {
      ...pipelineOf(),
      flows: [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'a0c3aad4-8765-5b23-8df5-7c03d481233c', 4)],
    };
    const { pipeline } = addFlow(existing);
    expect(pipeline.flows[2]?.index).toBe(5);
  });

  it('F-11 AC-003 the new flow is the last tab and its id is reported to open the tab', () => {
    const { pipeline, flowId } = addFlow(pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(tabOrder(pipeline).at(-1)).toEqual({ kind: 'flow', id: flowId });
  });

  it('F-11 AC-003 two adds in a row give the names flow-1 then flow-2, with two different GUID ids', () => {
    const first = addFlow(pipelineOf());
    const second = addFlow(first.pipeline);
    expect(second.flowId).toMatch(GUID);
    expect(second.flowId).not.toBe(first.flowId);
    expect(second.pipeline.flows.map((f) => f.name)).toEqual(['flow-1', 'flow-2']);
  });

  it('F-11 AC-003 an add does not change the pipeline it was given', () => {
    const before = pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = JSON.stringify(before);
    addFlow(before);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(before.flows).toHaveLength(1);
  });

  it('F-11 AC-003 an add keeps the pipeline fields and the existing flows as they were', () => {
    const existing = pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const { pipeline } = addFlow(existing);
    expect(pipeline.name).toBe('Demo');
    expect(pipeline.description).toBe('A demo pipeline.');
    expect(pipeline.flows[0]).toBe(existing.flows[0]);
  });
});

describe('F-12 AC-006 a flow created on the Pipeline tab starts with no blocks', () => {
  it('F-12 AC-006 the added flow has an empty block list', () => {
    const { pipeline } = addFlow(pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(pipeline.flows[1]?.blocks).toEqual([]);
  });

  it('F-12 AC-006 an added flow after a flow with blocks has no blocks of its own', () => {
    const planned = addBlock(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), 'start').flow;
    const { pipeline } = addFlow(pipelineOf(planned));
    expect(pipeline.flows[0]?.blocks).toHaveLength(1);
    expect(pipeline.flows[1]?.blocks).toEqual([]);
  });
});

describe('F-12 AC-049 each flow keeps its own blocks', () => {
  it('F-12 AC-049 adding a flow keeps the blocks of every flow before it', () => {
    const planned = addBlock(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), 'start').flow;
    const before = pipelineOf(planned, flow('a0c3aad4-8765-5b23-8df5-7c03d481233c'));
    const { pipeline } = addFlow(before);
    expect(pipeline.flows[0]?.blocks).toBe(before.flows[0]?.blocks);
    expect(pipeline.flows[1]?.blocks).toBe(before.flows[1]?.blocks);
  });

  it('F-12 AC-049 a block added on a flow tab leaves the other flow\'s blocks unchanged', () => {
    const before = pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), addBlock(flow('a0c3aad4-8765-5b23-8df5-7c03d481233c'), 'start').flow);
    const after = {
      ...before,
      flows: before.flows.map((f) => (f.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655' ? addBlock(f, 'agent').flow : f)),
    };
    expect(after.flows[0]?.blocks).toHaveLength(1);
    expect(after.flows[1]).toBe(before.flows[1]);
    expect(after.flows[1]?.blocks[0]?.kind).toBe('start');
  });
});

describe('F-16 AC-021 block ids are unique across the pipeline', () => {
  it('F-16 AC-021 a second flow does not reuse the block id of the first flow', () => {
    const first = addBlock(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), 'start').flow;
    const second = addBlock(flow('a0c3aad4-8765-5b23-8df5-7c03d481233c'), 'start').flow;
    expect(first.blocks[0]?.id).toMatch(GUID);
    expect(second.blocks[0]?.id).toMatch(GUID);
    expect(second.blocks[0]?.id).not.toBe(first.blocks[0]?.id);
  });
});

describe('F-16 AC-027 newId gives a lower-case GUID with or without randomUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('F-16 AC-027 uses crypto.randomUUID when the browser has it, in lower case', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '1F2E3D4C-5B6A-4978-8899-AABBCCDDEEFF' });
    expect(newId()).toBe('1f2e3d4c-5b6a-4978-8899-aabbccddeeff');
  });

  it('F-16 AC-027 with randomUUID removed from the global, newId still returns a lower-case version 4 GUID', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: <T extends ArrayBufferView>(bytes: T): T => real.getRandomValues(bytes) });
    for (let i = 0; i < 20; i += 1) {
      const id = newId();
      expect(id).toMatch(GUID);
      expect(id[14]).toBe('4');
      expect('89ab').toContain(id[19] ?? '');
    }
  });

  it('F-16 AC-027 the GUID fallback fills the bytes it is given, so the id follows them', () => {
    vi.stubGlobal('crypto', { getRandomValues: <T extends ArrayBufferView>(bytes: T): T => {
      new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength).fill(0xff);
      return bytes;
    } });
    expect(newId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });
});

describe('F-16 AC-027 flow ids are generated GUIDs', () => {
  it('F-16 AC-027 flow ids stay unique and GUID-shaped after several adds and a removal', () => {
    let state = pipelineOf();
    for (let count = 0; count < 3; count += 1) {
      state = addFlow(state).pipeline;
    }
    state = { ...state, flows: state.flows.filter((_flow, position) => position !== 1) };
    state = addFlow(state).pipeline;
    const ids = state.flows.map((item) => item.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(GUID);
    }
  });
});
