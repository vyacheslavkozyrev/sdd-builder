// Builder map state: the workflows and the connections between them.
// Pure: no DOM, no storage, no network. Every edit returns a new state; a refused
// edit returns a message and leaves the caller's state as it was.
import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS, wouldCreateCycle } from '@sddbuilder/core';
import type { Gate, GateType, MapConnection, Scope, Workflow } from '@sddbuilder/core';

/** The map as the builder holds it. Held in memory only (AC-003). */
export interface MapState {
  readonly workflows: readonly Workflow[];
  readonly connections: readonly MapConnection[];
}

/** An edit either succeeds with the new state, or is refused with the reason. */
export type EditResult = { ok: true; state: MapState } | { ok: false; message: string };

const ITERATION_SOURCE: Record<Scope, string> = {
  project: 'project',
  feature: 'features.md',
  task: 'plan.md',
};

const GATE_TYPES: readonly string[] = ['approval', 'checks', 'review', 'diff-size'];

function isGateType(value: string): value is GateType {
  return GATE_TYPES.includes(value);
}

/** The reference process, copied fresh on every call so no session shares objects with another. */
export function startState(): MapState {
  return {
    workflows: structuredClone(DEFAULT_WORKFLOWS),
    connections: structuredClone(DEFAULT_CONNECTIONS),
  };
}

/** Adds a workflow with a unique id; refuses a blank name or one that duplicates another workflow's name. */
export function addWorkflow(state: MapState, name: string, scope: Scope): EditResult {
  if (!Object.hasOwn(ITERATION_SOURCE, scope)) {
    throw new Error(`Unknown scope: ${scope}`);
  }
  const trimmed = name.trim();
  if (trimmed === '') {
    return refuse('A workflow needs a name.');
  }
  const key = trimmed.toLowerCase();
  if (state.workflows.some((w) => w.name.trim().toLowerCase() === key)) {
    return refuse(`A workflow named "${trimmed}" already exists.`);
  }
  const workflow: Workflow = {
    id: uniqueId(slug(trimmed), state.workflows.map((w) => w.id)),
    name: trimmed,
    scope,
    iterationSource: ITERATION_SOURCE[scope],
    enabled: true,
    steps: [],
    conditions: [],
  };
  return { ok: true, state: { ...state, workflows: [...state.workflows, workflow] } };
}

/** Removes a workflow and every connection to or from it. */
export function removeWorkflow(state: MapState, workflowId: string): MapState {
  requireWorkflow(state, workflowId);
  return {
    workflows: state.workflows.filter((w) => w.id !== workflowId),
    connections: state.connections.filter((c) => c.from !== workflowId && c.to !== workflowId),
  };
}

/** Adds the connection `from → to` with no artifact and no gate. Refuses self-links, duplicates and cycles. */
export function connect(state: MapState, from: string, to: string): EditResult {
  requireWorkflow(state, from);
  requireWorkflow(state, to);
  if (from === to) {
    return refuse('A workflow cannot be connected to itself.');
  }
  if (state.connections.some((c) => c.from === from && c.to === to)) {
    return refuse('These two workflows are already connected in that direction.');
  }
  if (wouldCreateCycle(state.connections, from, to)) {
    return refuse('This connection would close a cycle on the map.');
  }
  const connection: MapConnection = {
    id: uniqueId(`${from}-${to}`, state.connections.map((c) => c.id)),
    from,
    to,
  };
  return { ok: true, state: { ...state, connections: [...state.connections, connection] } };
}

/** Removes one connection; both workflows stay. */
export function removeConnection(state: MapState, connectionId: string): MapState {
  requireConnection(state, connectionId);
  return { ...state, connections: state.connections.filter((c) => c.id !== connectionId) };
}

/** Sets the artifact label, trimmed. An empty label clears it. */
export function setArtifact(state: MapState, connectionId: string, label: string): MapState {
  const text = label.trim();
  return editConnection(state, connectionId, (c) => {
    const copy: MapConnection = { ...c };
    if (text === '') {
      delete copy.artifact;
    } else {
      copy.artifact = text;
    }
    return copy;
  });
}

/**
 * Sets the gate of a connection, or clears it with `null`. The type must be one of the four
 * gate types, since input may come from a form as text. A `diff-size` gate needs `threshold`
 * to be a whole number of at least 1; any other threshold is refused. The threshold is
 * ignored for the other gate types.
 */
export function setGate(state: MapState, connectionId: string, type: string | null, threshold = ''): EditResult {
  requireConnection(state, connectionId);
  if (type === null) {
    return { ok: true, state: editConnection(state, connectionId, withoutGate) };
  }
  if (!isGateType(type)) {
    return refuse('The gate must be approval, checks, review or diff-size, or cleared.');
  }
  let gate: Gate = { id: `${connectionId}-gate`, type, required: false };
  if (type === 'diff-size') {
    const text = threshold.trim();
    const value = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value < 1) {
      return refuse('The diff-size threshold must be a whole number of at least 1.');
    }
    gate = { ...gate, threshold: value };
  }
  return { ok: true, state: editConnection(state, connectionId, (c) => ({ ...withoutGate(c), gate })) };
}

function refuse(message: string): EditResult {
  return { ok: false, message };
}

function withoutGate(connection: MapConnection): MapConnection {
  const copy: MapConnection = { ...connection };
  delete copy.gate;
  return copy;
}

function editConnection(
  state: MapState,
  connectionId: string,
  edit: (connection: MapConnection) => MapConnection,
): MapState {
  requireConnection(state, connectionId);
  return {
    ...state,
    connections: state.connections.map((c) => (c.id === connectionId ? edit(c) : c)),
  };
}

function requireWorkflow(state: MapState, workflowId: string): void {
  if (!state.workflows.some((w) => w.id === workflowId)) {
    throw new Error(`Unknown workflow id: ${workflowId}`);
  }
}

function requireConnection(state: MapState, connectionId: string): void {
  if (!state.connections.some((c) => c.id === connectionId)) {
    throw new Error(`Unknown connection id: ${connectionId}`);
  }
}

/** A lowercase id from a name: letters and digits separated by dashes. */
function slug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base === '' ? 'workflow' : base;
}

function uniqueId(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) {
    return base;
  }
  let n = 2;
  while (taken.includes(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}
