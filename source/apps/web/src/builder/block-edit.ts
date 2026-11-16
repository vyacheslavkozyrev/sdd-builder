// Block edits inside a flow on the flow tab: add a block, connect two blocks, move a block up or down, set a
// Condition's routes, switch a block off and on, and delete a block (F-06 AC-017 to AC-021, AC-032, AC-034, AC-035).
// Pure: no DOM, no storage, no network. Every edit returns a new configuration; a refused edit returns a message and
// leaves the caller's configuration as it was. An unknown flow or block id is a programmer error and throws.
import { pipeline } from '@sddbuilder/core';
import { pipelineIds } from './flow-edit.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type FlowBlock = pipeline.FlowBlock;
type ChildBlock = pipeline.ChildBlock;
type ConditionBlock = pipeline.ConditionBlock;
type ConnectionBlock = pipeline.ConnectionBlock;
type Route = pipeline.Route;

/** A block edit either succeeds with the new configuration and the id of the block it concerns, or is refused. */
export type BlockEdit = { ok: true; config: ProjectConfig; id: string } | { ok: false; message: string };

/** The block kinds the toolbox adds directly. A Connection is added with `addFlowConnection`, which names two blocks. */
export type NewBlockKind = 'start' | 'agent' | 'condition' | 'end';

/** The direction a block moves in its flow. */
export type MoveDirection = 'up' | 'down';

/** The routes of a Condition in a flow, and its round limit (kept only when a route goes back). */
export interface ConditionRoutes {
  pass: Route;
  fail: Route;
  roundLimit: number | undefined;
}

/** The description a new Agent block gets. The user writes the real one in the property panel. */
const AGENT_PLACEHOLDER = "the agent's job is not written yet.";

/** What a new Condition checks by default: the checks pass, decided by an agent (F-06 AC-018, amendment 2). */
const CONDITION_DEFAULT_DESCRIPTION = 'the checks pass.';

/**
 * Adds a block to a flow. A Start is placed first in the flow, and only when the flow has none (a second Start is
 * refused, F-06 AC-018). Other blocks go right after the selected block, or at the end of the flow when none is
 * selected. An End goes last. No block goes after an End block, so the End blocks stay last (F-06 AC-017, AC-019).
 * A new Agent block is named after its id, or with the first free numeric suffix when another Agent block already has
 * that name, so agent names stay unique (F-06 AC-027).
 */
export function addBlock(config: ProjectConfig, flowId: string, kind: NewBlockKind, selectedId: string | null): BlockEdit {
  const flow = requireFlow(config, flowId);
  if (kind === 'start' && flow.blocks.some((block) => block.kind === 'start')) {
    return refuse(`The flow "${flow.name}" already has a Start: a flow has one Start. The block was not added.`);
  }
  const id = uniqueId(`${flowId}-${kind}`, pipelineIds(config));
  if (!pipeline.isValidId(id)) {
    return refuse(`Block id "${id}" is refused: ${pipeline.ID_MESSAGE}. The block was not added.`);
  }
  const block = newBlock(kind, id, uniqueId(id, agentNames(config)));
  const at = kind === 'start' ? 0 : kind === 'end' ? flow.blocks.length : insertionIndex(flow, selectedId);
  return { ok: true, config: withFlowBlocks(config, flowId, insertAt(flow.blocks, at, block)), id };
}

/**
 * Adds a Connection that joins two blocks of the same flow, with a non-empty artifact label (F-06 AC-020). A block in
 * another flow is refused. The id is `<from>-to-<to>`, made unique by a numeric suffix. The Connection goes after the
 * later of its two blocks, and before the End blocks.
 */
export function addFlowConnection(config: ProjectConfig, flowId: string, from: string, to: string, artifact: string): BlockEdit {
  const flow = requireFlow(config, flowId);
  const known = pipelineIds(config);
  const elsewhere = [from, to].find((id) => !flow.blocks.some((block) => block.id === id) && known.has(id));
  if (elsewhere !== undefined) {
    return refuse(`"${elsewhere}" is not a block of "${flow.name}": a connection joins two blocks of one flow.`);
  }
  const fromAt = requireChild(flow, from);
  const toAt = requireChild(flow, to);
  if (from === to) {
    return refuse('A connection joins two different blocks. The connection was not added.');
  }
  const label = artifact.trim();
  if (label === '') {
    return refuse('A connection needs an artifact label. The connection was not added.');
  }
  const id = uniqueId(`${from}-to-${to}`, pipelineIds(config));
  if (!pipeline.isValidId(id)) {
    return refuse(`Connection id "${id}" is refused: ${pipeline.ID_MESSAGE}. The connection was not added.`);
  }
  const connection: ConnectionBlock = { kind: 'connection', id, enabled: true, from, to, artifact: label };
  const at = Math.min(Math.max(fromAt, toAt) + 1, endRunStart(flow.blocks));
  return { ok: true, config: withFlowBlocks(config, flowId, insertAt(flow.blocks, at, connection)), id };
}

/**
 * Moves a block one place up or down in its flow; the other blocks keep their order (F-06 AC-019). A move that would
 * put the Start after another block, or an End block before a block that is not an End, is refused. So is a move that
 * would leave a Condition's back route pointing to a block after it (F-06 AC-021), and a move past the first or the
 * last block.
 */
export function moveBlock(config: ProjectConfig, flowId: string, blockId: string, direction: MoveDirection): BlockEdit {
  const flow = requireFlow(config, flowId);
  const at = requireChild(flow, blockId);
  const to = direction === 'up' ? at - 1 : at + 1;
  if (to < 0 || to >= flow.blocks.length) {
    return refuse(`"${blockId}" is already at the ${direction === 'up' ? 'top' : 'bottom'} of the flow.`);
  }
  const moved = [...flow.blocks];
  [moved[at], moved[to]] = [moved[to] as ChildBlock, moved[at] as ChildBlock];
  if (!isOrdered(moved)) {
    return refuse(`"${blockId}" cannot move there: the Start stays first and the End blocks stay last.`);
  }
  if (!backRoutesEarlier(moved)) {
    return refuse(`"${blockId}" cannot move there: a back route would point to a later block. The block was not moved.`);
  }
  return { ok: true, config: withFlowBlocks(config, flowId, moved), id: blockId };
}

/**
 * Sets a Condition's pass and fail routes (F-06 AC-021). A route is the next block, stop, or a back route to an earlier
 * block of the same flow. A back route to a block after the Condition, to a block of another flow, or to an unknown
 * block is refused. The round limit is a positive whole number, or undefined for no limit; it is kept only when a route
 * goes back, and dropped otherwise.
 */
export function setConditionRoutes(config: ProjectConfig, flowId: string, conditionId: string, routes: ConditionRoutes): BlockEdit {
  const flow = requireFlow(config, flowId);
  const at = requireChild(flow, conditionId);
  const condition = flow.blocks[at];
  if (condition?.kind !== 'condition') {
    throw new Error(`Block ${conditionId} is not a Condition`);
  }
  for (const route of [routes.pass, routes.fail]) {
    if (route.kind === 'back' && !flow.blocks.slice(0, at).some((block) => block.id === route.blockId)) {
      return refuse(`The back route must go to an earlier block of "${flow.name}". The condition was not changed.`);
    }
  }
  const goesBack = routes.pass.kind === 'back' || routes.fail.kind === 'back';
  if (routes.roundLimit !== undefined && !isPositiveWholeNumber(routes.roundLimit)) {
    return refuse('A round limit is a positive whole number, or empty for no limit. The condition was not changed.');
  }
  const next: ConditionBlock = { ...condition, passRoute: routes.pass, failRoute: routes.fail };
  if (goesBack && routes.roundLimit !== undefined) {
    next.roundLimit = routes.roundLimit;
  } else {
    delete next.roundLimit;
  }
  return { ok: true, config: withFlowBlocks(config, flowId, replaceAt(flow.blocks, at, next)), id: conditionId };
}

/**
 * The blocks a Condition's back route may point to: the blocks before it in the same flow, in order. A Condition
 * offers no back route to a block after it or to another flow (F-06 AC-021).
 */
export function backRouteTargets(config: ProjectConfig, flowId: string, conditionId: string): string[] {
  const flow = requireFlow(config, flowId);
  const at = requireChild(flow, conditionId);
  return flow.blocks.slice(0, at).map((block) => block.id);
}

/**
 * Switches a block off or on. It stays in its place with its properties, so switching it on again restores it
 * (F-06 AC-032).
 */
export function setBlockEnabled(config: ProjectConfig, flowId: string, blockId: string, enabled: boolean): ProjectConfig {
  const flow = requireFlow(config, flowId);
  const at = requireChild(flow, blockId);
  const blocks = replaceAt(flow.blocks, at, { ...(flow.blocks[at] as ChildBlock), enabled });
  return withFlowBlocks(config, flowId, blocks);
}

/** The question the confirmation dialog asks before a block is deleted (F-06 AC-034). It names the block. */
export function deleteBlockQuestion(config: ProjectConfig, flowId: string, blockId: string): string {
  const flow = requireFlow(config, flowId);
  const block = flow.blocks[requireChild(flow, blockId)] as ChildBlock;
  const label = block.kind === 'agent' ? block.name : block.id;
  return `Delete ${label}? Its connections are removed. Routes that pointed to it are left unwired and marked until you set them again.`;
}

/**
 * Removes a block from its flow, with the connections that run from or to it (F-06 AC-034). The routes of a Condition
 * that pointed to it keep their target, which no longer exists, so the structural analysis marks them. The Start of a
 * flow cannot be deleted; the refusal names the flow (F-06 AC-035). Call it only after the user has confirmed.
 */
export function deleteBlock(config: ProjectConfig, flowId: string, blockId: string): BlockEdit {
  const flow = requireFlow(config, flowId);
  const at = requireChild(flow, blockId);
  if (flow.blocks[at]?.kind === 'start') {
    return refuse(`Refused: the Start block of ${flow.name} cannot be deleted. A flow has one Start.`);
  }
  const blocks = flow.blocks.filter(
    (block, index) => index !== at && !(block.kind === 'connection' && (block.from === blockId || block.to === blockId)),
  );
  return { ok: true, config: withFlowBlocks(config, flowId, blocks), id: blockId };
}

/** The names of the Agent blocks in the project, in any flow and enabled or not (F-06 AC-027). */
function agentNames(config: ProjectConfig): Set<string> {
  const names = new Set<string>();
  for (const block of config.pipeline.blocks) {
    if (block.kind !== 'flow') continue;
    for (const child of block.blocks) {
      if (child.kind === 'agent') names.add(child.name);
    }
  }
  return names;
}

/** A new Agent block takes `name` as its name; the other kinds take no name and ignore it. */
function newBlock(kind: NewBlockKind, id: string, name: string): ChildBlock {
  if (kind === 'start') return { kind: 'start', id, enabled: true };
  if (kind === 'end') return { kind: 'end', id, enabled: true, outcome: 'done' };
  if (kind === 'agent') {
    return { kind: 'agent', id, enabled: true, name, scope: 'project', description: AGENT_PLACEHOLDER };
  }
  return {
    kind: 'condition',
    id,
    enabled: true,
    checkType: 'checks',
    decidedBy: 'agent',
    description: CONDITION_DEFAULT_DESCRIPTION,
    passRoute: { kind: 'next' },
    failRoute: { kind: 'stop' },
  };
}

/**
 * The index a new block takes: right after the selected block, or at the end when none is selected. The index never
 * passes the first End block, so the End blocks stay last.
 */
function insertionIndex(flow: FlowBlock, selectedId: string | null): number {
  const limit = endRunStart(flow.blocks);
  if (selectedId === null) return limit;
  const selected = requireChild(flow, selectedId);
  return Math.min(selected + 1, limit);
}

/** The index of the first End block, or the number of blocks when the flow has none. */
function endRunStart(blocks: readonly ChildBlock[]): number {
  const at = blocks.findIndex((block) => block.kind === 'end');
  return at < 0 ? blocks.length : at;
}

/** True when the Start, if any, is first and no End block comes before a block that is not an End. */
function isOrdered(blocks: readonly ChildBlock[]): boolean {
  const start = blocks.findIndex((block) => block.kind === 'start');
  if (start > 0) return false;
  const firstEnd = endRunStart(blocks);
  return blocks.slice(firstEnd).every((block) => block.kind === 'end');
}

function requireFlow(config: ProjectConfig, flowId: string): FlowBlock {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  if (flow?.kind !== 'flow') {
    throw new Error(`Unknown flow id: ${flowId}`);
  }
  return flow;
}

/** True when every back route of a Condition names a block before that Condition (the core parser's rule). */
function backRoutesEarlier(blocks: readonly ChildBlock[]): boolean {
  return blocks.every((block, index) => {
    if (block.kind !== 'condition') return true;
    return [block.passRoute, block.failRoute].every(
      (route) => route.kind !== 'back' || blocks.slice(0, index).some((item) => item.id === route.blockId),
    );
  });
}

/** The index of a block in its flow. An id that is not in the flow is a programmer error and throws. */
function requireChild(flow: FlowBlock, blockId: string): number {
  const at = flow.blocks.findIndex((block) => block.id === blockId);
  if (at < 0) {
    throw new Error(`Unknown block id ${blockId} in flow ${flow.id}`);
  }
  return at;
}

/** The base id, or the base with the first free numeric suffix (`-2`, `-3`, …) when it is taken. */
function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function insertAt(blocks: readonly ChildBlock[], at: number, block: ChildBlock): ChildBlock[] {
  return [...blocks.slice(0, at), block, ...blocks.slice(at)];
}

function replaceAt(blocks: readonly ChildBlock[], at: number, block: ChildBlock): ChildBlock[] {
  return blocks.map((item, index) => (index === at ? block : item));
}

function isPositiveWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function refuse(message: string): BlockEdit {
  return { ok: false, message };
}

function withFlowBlocks(config: ProjectConfig, flowId: string, blocks: ChildBlock[]): ProjectConfig {
  const pipelineBlocks = config.pipeline.blocks.map((block): PipelineBlock => {
    return block.kind === 'flow' && block.id === flowId ? { ...block, blocks } : block;
  });
  return { ...config, pipeline: { ...config.pipeline, blocks: pipelineBlocks } };
}
