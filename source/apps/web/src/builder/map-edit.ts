// Connections between flows and the gates on them, on the Map tab (F-06 AC-008, AC-010, AC-011, AC-012). Pure: no DOM,
// no storage, no network. A Connection carries an artifact label; a gate (an approval or a check) sits on one
// Connection, and a connection holds at most one gate. Every edit returns a new configuration; a refused edit returns
// a message and leaves the caller's configuration as it was. An unknown block id is a programmer error and throws.
import { pipeline } from '@sddbuilder/core';
import { pipelineIds } from './flow-edit.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;
type ConnectionBlock = pipeline.ConnectionBlock;

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

function refuse(message: string): MapEdit {
  return { ok: false, message };
}

function withBlocks(config: ProjectConfig, blocks: PipelineBlock[]): ProjectConfig {
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}
