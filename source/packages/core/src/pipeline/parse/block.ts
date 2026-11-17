// The block parser (architecture.md §6 decision 33): dispatches on `kind` and checks the fields each kind allows.
// Start, Approval and End are parsed, and Start and Approval take an optional `connectedTo` link (F-02 T004).
// Agent and Check are parsed in F-02 T005; until then those kinds are refused.

import type { Approval, Block, BlockLink, End, Id, Start } from '../model.js';
import {
  childPath,
  enumValue,
  idValue,
  nonBlankText,
  objectValue,
  type Problems,
  visitKeys,
} from '../check/primitives.js';
import { parseBlockLink } from './link.js';

const BLOCK_KINDS = ['start', 'agent', 'approval', 'check', 'end'] as const;
const END_OUTCOMES = ['done', 'stopped'] as const;

export function parseBlock(value: unknown, path: string, problems: Problems): Block | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const kind = enumValue(object['kind'], BLOCK_KINDS, childPath(path, 'kind'), problems);
  switch (kind) {
    case undefined:
      return undefined;
    case 'start':
      return parseStart(object, path, problems);
    case 'approval':
      return parseApproval(object, path, problems);
    case 'end':
      return parseEnd(object, path, problems);
    case 'agent':
    case 'check':
      // Refused for now, so a block is never returned as typed before its parser exists.
      problems.add(childPath(path, 'kind'), `${kind} blocks are not parsed yet (F-02 T005)`);
      return undefined;
  }
}

function parseStart(object: Readonly<Record<string, unknown>>, path: string, problems: Problems): Start | undefined {
  const before = problems.list.length;
  const found: { id: Id | undefined; connectedTo: BlockLink | undefined } = { id: undefined, connectedTo: undefined };
  visitKeys(object, ['id', 'kind', 'connectedTo'], path, problems, (key) => {
    if (key === 'id') {
      found.id = idValue(object['id'], childPath(path, 'id'), problems);
    } else if (key === 'connectedTo' && object['connectedTo'] !== undefined) {
      found.connectedTo = parseBlockLink(object['connectedTo'], childPath(path, 'connectedTo'), problems);
    }
  });
  if (found.id === undefined || problems.list.length > before) {
    return undefined;
  }
  const start: Start = { id: found.id, kind: 'start' };
  if (found.connectedTo !== undefined) {
    start.connectedTo = found.connectedTo;
  }
  return start;
}

function parseApproval(
  object: Readonly<Record<string, unknown>>,
  path: string,
  problems: Problems,
): Approval | undefined {
  const before = problems.list.length;
  const found: {
    id: Id | undefined;
    description: string | undefined;
    connectedTo: BlockLink | undefined;
  } = { id: undefined, description: undefined, connectedTo: undefined };
  visitKeys(object, ['id', 'kind', 'description', 'connectedTo'], path, problems, (key) => {
    if (key === 'id') {
      found.id = idValue(object['id'], childPath(path, 'id'), problems);
    } else if (key === 'description') {
      found.description = nonBlankText(object['description'], childPath(path, 'description'), problems);
    } else if (key === 'connectedTo' && object['connectedTo'] !== undefined) {
      found.connectedTo = parseBlockLink(object['connectedTo'], childPath(path, 'connectedTo'), problems);
    }
  });
  if (found.id === undefined || found.description === undefined || problems.list.length > before) {
    return undefined;
  }
  const approval: Approval = { id: found.id, kind: 'approval', description: found.description };
  if (found.connectedTo !== undefined) {
    approval.connectedTo = found.connectedTo;
  }
  return approval;
}

function parseEnd(object: Readonly<Record<string, unknown>>, path: string, problems: Problems): End | undefined {
  const found: {
    id: Id | undefined;
    outcome: (typeof END_OUTCOMES)[number] | undefined;
    producedArtifact: string | undefined;
  } = { id: undefined, outcome: undefined, producedArtifact: undefined };
  const before = problems.list.length;
  visitKeys(object, ['id', 'kind', 'outcome', 'producedArtifact'], path, problems, (key) => {
    if (key === 'id') {
      found.id = idValue(object['id'], childPath(path, 'id'), problems);
    } else if (key === 'outcome') {
      found.outcome = enumValue(object['outcome'], END_OUTCOMES, childPath(path, 'outcome'), problems);
    } else if (key === 'producedArtifact' && object['producedArtifact'] !== undefined) {
      found.producedArtifact = plainText(object['producedArtifact'], childPath(path, 'producedArtifact'), problems);
    }
  });
  if (found.id === undefined || found.outcome === undefined || problems.list.length > before) {
    return undefined;
  }
  const end: End = { id: found.id, kind: 'end', outcome: found.outcome };
  if (found.producedArtifact !== undefined) {
    end.producedArtifact = found.producedArtifact;
  }
  return end;
}

// Text that may be empty: `producedArtifact` is optional text, not non-blank text (stories AC-014; decision 33).
function plainText(value: unknown, path: string, problems: Problems): string | undefined {
  if (typeof value !== 'string') {
    problems.add(path, 'must be text');
    return undefined;
  }
  return value;
}
