// Flow edits on the Map tab: add a flow after the last tab, rename it, and change its id (F-06 AC-006, AC-007).
// Pure: no DOM, no storage, no network. Every edit returns a new configuration; a refused edit returns a message
// and leaves the caller's configuration as it was. An unknown flow id is a programmer error and throws.
import { pipeline } from '@sddbuilder/core';

type ProjectConfig = pipeline.ProjectConfig;
type FlowBlock = pipeline.FlowBlock;
type PipelineBlock = pipeline.PipelineBlock;

/** An edit either succeeds with the new configuration, or is refused with the reason. */
export type ConfigEdit = { ok: true; config: ProjectConfig } | { ok: false; message: string };

/** The name a new flow gets; the user can change it (F-06 AC-006). */
export const DEFAULT_FLOW_NAME = 'New flow';

const DEFAULT_FLOW_ID = 'new-flow';

/**
 * Adds a flow after the last tab. Its id is file-safe and unused in the pipeline, including the ids of its own
 * Start and End. It holds one Start and one End, and the default name.
 */
export function addFlow(config: ProjectConfig): { config: ProjectConfig; flowId: string } {
  const flowId = freeFlowId(pipelineIds(config));
  const flow: FlowBlock = {
    kind: 'flow',
    id: flowId,
    name: DEFAULT_FLOW_NAME,
    description: '',
    enabled: true,
    blocks: [
      { kind: 'start', id: `${flowId}-start`, enabled: true },
      { kind: 'end', id: `${flowId}-end`, enabled: true, outcome: 'done' },
    ],
  };
  const blocks = config.pipeline.blocks;
  const at = insertionIndex(blocks);
  return { config: withBlocks(config, [...blocks.slice(0, at), flow, ...blocks.slice(at)]), flowId };
}

/** Sets the flow's name, trimmed. A blank name is refused and the flow keeps its name. */
export function renameFlow(config: ProjectConfig, flowId: string, name: string): ConfigEdit {
  requireFlow(config, flowId);
  const text = name.trim();
  if (text === '') {
    return refuse('A flow needs a name.');
  }
  return { ok: true, config: editFlow(config, flowId, (flow) => ({ ...flow, name: text })) };
}

/**
 * Changes the flow's id. Refused when the new id is not file-safe or is already used in the pipeline (a block, a
 * flow or a flow's child block). An accepted id is also written to the connections that run from or to the flow.
 */
export function setFlowId(config: ProjectConfig, flowId: string, newId: string): ConfigEdit {
  requireFlow(config, flowId);
  if (newId === flowId) {
    return { ok: true, config };
  }
  if (!pipeline.isValidId(newId)) {
    return refuse(`Flow id "${newId}" is refused: ${pipeline.ID_MESSAGE}. The flow keeps "${flowId}".`);
  }
  if (pipelineIds(config).has(newId)) {
    return refuse(`Flow id "${newId}" is already used in the pipeline. The flow keeps "${flowId}".`);
  }
  const blocks = config.pipeline.blocks.map((block): PipelineBlock => {
    if (block.kind === 'flow' && block.id === flowId) {
      return { ...block, id: newId };
    }
    if (block.kind === 'connection') {
      return {
        ...block,
        from: block.from === flowId ? newId : block.from,
        to: block.to === flowId ? newId : block.to,
      };
    }
    return block;
  });
  return { ok: true, config: withBlocks(config, blocks) };
}

function refuse(message: string): ConfigEdit {
  return { ok: false, message };
}

/** Every id in the pipeline: its own blocks, its flows and the blocks inside them. Disabled items count too. */
function pipelineIds(config: ProjectConfig): Set<string> {
  const ids = new Set<string>();
  for (const block of config.pipeline.blocks) {
    ids.add(block.id);
    if (block.kind === 'flow') {
      for (const child of block.blocks) {
        ids.add(child.id);
      }
    }
  }
  return ids;
}

/** The first of `new-flow`, `new-flow-2`, … whose flow id and its Start and End ids are all unused. */
function freeFlowId(taken: ReadonlySet<string>): string {
  for (let n = 1; ; n += 1) {
    const candidate = n === 1 ? DEFAULT_FLOW_ID : `${DEFAULT_FLOW_ID}-${n}`;
    if ([candidate, `${candidate}-start`, `${candidate}-end`].every((id) => !taken.has(id))) {
      return candidate;
    }
  }
}

/** The index a new flow takes: right after the last flow, or after the pipeline Start when there is no flow yet. */
function insertionIndex(blocks: readonly PipelineBlock[]): number {
  let last = -1;
  blocks.forEach((block, index) => {
    if (block.kind === 'flow') {
      last = index;
    }
  });
  if (last >= 0) {
    return last + 1;
  }
  return blocks.findIndex((block) => block.kind === 'start') + 1;
}

function requireFlow(config: ProjectConfig, flowId: string): void {
  if (!config.pipeline.blocks.some((block) => block.kind === 'flow' && block.id === flowId)) {
    throw new Error(`Unknown flow id: ${flowId}`);
  }
}

function editFlow(config: ProjectConfig, flowId: string, edit: (flow: FlowBlock) => FlowBlock): ProjectConfig {
  const blocks = config.pipeline.blocks.map((block): PipelineBlock => {
    return block.kind === 'flow' && block.id === flowId ? edit(block) : block;
  });
  return withBlocks(config, blocks);
}

function withBlocks(config: ProjectConfig, blocks: PipelineBlock[]): ProjectConfig {
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}
