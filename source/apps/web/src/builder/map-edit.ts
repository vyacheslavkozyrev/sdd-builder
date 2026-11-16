// Connections between flows and the gates on them, on the Map tab (F-06 AC-008, AC-010 to AC-016). Pure: no DOM,
// no storage, no network. A Connection carries an artifact label; a gate (an approval or a check) sits on one
// Connection, and a connection holds at most one gate. Every edit returns a new configuration; a refused edit returns
// a message and leaves the caller's configuration as it was. An unknown block id is a programmer error and throws.
import { pipeline } from '@sddbuilder/core';
import { pipelineIds } from './flow-edit.js';
import { checkDescription, checkRoundLimit, checkThreshold } from './entry-checks.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;
type ConnectionBlock = pipeline.ConnectionBlock;
type Route = pipeline.Route;

/**
 * The settings the gate panel saves. The description is what passing means. The threshold (lines) is read for a
 * `diff-size` gate only. The round limit is the panel's text: empty means no limit, and it is kept only when the fail
 * route goes back.
 */
export interface GateSettings {
  description: string;
  threshold?: number;
  failRoute: Route;
  roundLimit: string;
}

/** An edit either succeeds with the new configuration and the id of the block it made, or is refused with the reason. */
export type MapEdit =
  | { ok: true; config: ProjectConfig; id: string }
  | { ok: false; message: string };

/**
 * The gate the panel or the drop places on a connection. An approval is decided by a person; a check is decided by an
 * agent, and its type is `checks` or `diff-size` (the review is an Agent block, not a check type).
 */
export type GateChoice =
  | { checkType: 'approval' }
  | { checkType: 'checks' }
  | { checkType: 'diff-size'; threshold: number };

/** The rectangle a connection occupies on the Map, in the Map's own coordinates. */
export interface ConnectionBox {
  connectionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A point on the Map, in the same coordinates as the boxes. */
export interface MapPoint {
  x: number;
  y: number;
}

/**
 * Adds a Connection from one flow to another with an artifact label. The label is trimmed and must not be empty. The
 * id is `<from>-to-<to>`, made unique by a numeric suffix when it is taken. A connection that closes a cycle is kept:
 * the structural analysis marks it (F-06 AC-009).
 */
export function addConnection(config: ProjectConfig, from: string, to: string, artifact: string): MapEdit {
  requireFlow(config, from);
  requireFlow(config, to);
  const label = artifact.trim();
  if (label === '') {
    return refuse('A connection needs an artifact label. The connection was not added.');
  }
  const taken = pipelineIds(config);
  const id = uniqueId(`${from}-to-${to}`, taken);
  if (!pipeline.isValidId(id)) {
    return refuse(`Connection id "${id}" is refused: ${pipeline.ID_MESSAGE}. The connection was not added.`);
  }
  const connection: ConnectionBlock = { kind: 'connection', id, enabled: true, from, to, artifact: label };
  return { ok: true, config: withBlocks(config, insertBeforeEnd(config.pipeline.blocks, connection)), id };
}

/**
 * Places a gate on a connection. A connection that already has a gate refuses a second one (F-06 AC-010, AC-011,
 * AC-012): "one gate per connection". The gate's description is the default for its kind, using the connection's
 * artifact label for an approval. Its pass route is the next flow and its fail route is stop. Its id is
 * `<connection>-gate`, made unique by a numeric suffix when it is taken.
 */
export function addGate(config: ProjectConfig, connectionId: string, choice: GateChoice): MapEdit {
  const connection = requireConnection(config, connectionId);
  if (config.pipeline.blocks.some((block) => block.kind === 'condition' && block.onConnection === connectionId)) {
    return refuse(`"${connectionId}" already has a gate: one gate per connection. The gate was not added.`);
  }
  if (choice.checkType === 'diff-size' && !isPositiveWholeNumber(choice.threshold)) {
    return refuse('A diff-size threshold is a positive whole number of lines. The gate was not added.');
  }
  const id = uniqueId(`${connectionId}-gate`, pipelineIds(config));
  if (!pipeline.isValidId(id)) {
    return refuse(`Gate id "${id}" is refused: ${pipeline.ID_MESSAGE}. The gate was not added.`);
  }
  const gate = gateBlock(id, connection, choice);
  return { ok: true, config: withBlocks(config, insertAfter(config.pipeline.blocks, connectionId, gate)), id };
}

/**
 * The fail routes a gate on a connection is offered: stop, or back to a flow no later than the one the connection
 * starts from (F-06 AC-014). That flow is included, since a gate that fails back to the flow it follows is a retry
 * (building-blocks §7); flows after it are not offered.
 */
export function failRouteOptions(config: ProjectConfig, gateId: string): Route[] {
  const gate = requireGate(config, gateId);
  return [{ kind: 'stop' }, ...sourceAndEarlierFlowIds(config, gate).map((blockId): Route => ({ kind: 'back', blockId }))];
}

/**
 * Saves a gate's settings: its description (required, F-06 AC-016), its threshold for a `diff-size` gate (a positive
 * whole number, AC-013), its fail route (stop or back to an earlier flow, AC-014) and its round limit (empty for none,
 * else a positive whole number, AC-015). The pass route stays the next flow. A refused edit saves nothing.
 */
export function setGateSettings(config: ProjectConfig, gateId: string, settings: GateSettings): MapEdit {
  const gate = requireGate(config, gateId);
  const description = checkDescription(settings.description);
  if (!description.ok) return refuse(`${description.message} The settings were not saved.`);
  let threshold: number | undefined;
  if (gate.checkType === 'diff-size') {
    const check = checkThreshold(settings.threshold ?? Number.NaN);
    if (!check.ok) return refuse(`${check.message} The settings were not saved.`);
    threshold = check.value;
  }
  const roundLimit = checkRoundLimit(settings.roundLimit);
  if (!roundLimit.ok) return refuse(`${roundLimit.message} The settings were not saved.`);
  const offered = failRouteOptions(config, gateId).some((option) => sameRoute(option, settings.failRoute));
  if (!offered) {
    return refuse('A fail route is stop, or back to an earlier flow. The settings were not saved.');
  }
  const next: PipelineConditionBlock = { ...gate, description: description.value, failRoute: settings.failRoute };
  if (settings.failRoute.kind === 'back' && roundLimit.value !== undefined) {
    next.roundLimit = roundLimit.value;
  } else {
    delete next.roundLimit;
  }
  if (next.checkType === 'diff-size' && threshold !== undefined) {
    next.threshold = threshold;
  }
  const blocks = config.pipeline.blocks.map((block) => (block.id === gateId ? next : block));
  return { ok: true, config: withBlocks(config, blocks), id: gateId };
}

/**
 * The connection whose rectangle contains the point, or null when none does. A point on the edge of a box counts as
 * inside its top and left edges only, so two boxes that touch never both match. When boxes overlap, the first one in
 * the list wins. The Map view uses this to resolve where a dragged gate is dropped.
 */
export function gateTargetAt(point: MapPoint, boxes: readonly ConnectionBox[]): string | null {
  const hit = boxes.find(
    (box) =>
      point.x >= box.x && point.x < box.x + box.width && point.y >= box.y && point.y < box.y + box.height,
  );
  return hit?.connectionId ?? null;
}

/** The default gate of a choice: its check type, who decides it, its description and its routes. */
function gateBlock(id: string, connection: ConnectionBlock, choice: GateChoice): PipelineConditionBlock {
  const common = {
    kind: 'condition' as const,
    id,
    enabled: true,
    passRoute: { kind: 'next' as const },
    failRoute: { kind: 'stop' as const },
    onConnection: connection.id,
  };
  if (choice.checkType === 'approval') {
    return {
      ...common,
      checkType: 'approval',
      decidedBy: 'human',
      description: `the user approves ${connection.artifact} as written.`,
    };
  }
  if (choice.checkType === 'checks') {
    return { ...common, checkType: 'checks', decidedBy: 'agent', description: 'the checks pass.' };
  }
  return {
    ...common,
    checkType: 'diff-size',
    decidedBy: 'agent',
    description: 'the checks pass.',
    threshold: choice.threshold,
  };
}

function isPositiveWholeNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** The base id, or the base with the first free numeric suffix (`-2`, `-3`, …) when it is taken. */
function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Places a block before the pipeline End, so the End stays last. Appends when the pipeline has no End. */
function insertBeforeEnd(blocks: readonly PipelineBlock[], block: PipelineBlock): PipelineBlock[] {
  const at = blocks.findIndex((item) => item.kind === 'end');
  return at < 0 ? [...blocks, block] : [...blocks.slice(0, at), block, ...blocks.slice(at)];
}

/** Places a block right after the block with the given id. */
function insertAfter(blocks: readonly PipelineBlock[], afterId: string, block: PipelineBlock): PipelineBlock[] {
  const at = blocks.findIndex((item) => item.id === afterId);
  return [...blocks.slice(0, at + 1), block, ...blocks.slice(at + 1)];
}

function requireFlow(config: ProjectConfig, flowId: string): void {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  if (flow?.kind !== 'flow') {
    throw new Error(`Unknown flow id: ${flowId}`);
  }
}

function requireConnection(config: ProjectConfig, connectionId: string): ConnectionBlock {
  const connection = config.pipeline.blocks.find((block) => block.kind === 'connection' && block.id === connectionId);
  if (connection?.kind !== 'connection') {
    throw new Error(`Unknown connection id: ${connectionId}`);
  }
  return connection;
}

function requireGate(config: ProjectConfig, gateId: string): PipelineConditionBlock {
  const gate = config.pipeline.blocks.find((block) => block.kind === 'condition' && block.id === gateId);
  if (gate?.kind !== 'condition') {
    throw new Error(`Unknown gate id: ${gateId}`);
  }
  return gate;
}

/** The ids of the flow the gate's connection starts from and the flows before it, in pipeline order. */
function sourceAndEarlierFlowIds(config: ProjectConfig, gate: PipelineConditionBlock): string[] {
  const connection = requireConnection(config, gate.onConnection);
  const flowIds = config.pipeline.blocks.flatMap((block): string[] => (block.kind === 'flow' ? [block.id] : []));
  const at = flowIds.indexOf(connection.from);
  return at < 0 ? [] : flowIds.slice(0, at + 1);
}

function sameRoute(a: Route, b: Route): boolean {
  if (a.kind === 'back') return b.kind === 'back' && a.blockId === b.blockId;
  return a.kind === b.kind;
}

function refuse(message: string): MapEdit {
  return { ok: false, message };
}

function withBlocks(config: ProjectConfig, blocks: PipelineBlock[]): ProjectConfig {
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}
