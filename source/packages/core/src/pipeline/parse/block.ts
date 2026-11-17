// The block parser (architecture.md §6 decision 33): dispatches on `kind` and checks the fields each kind allows.
// Start, Approval and End are parsed in F-02 T003, Agent and Check in F-02 T005. Start, Agent and Approval take an
// optional `connectedTo` (F-02 T004); Check requires both outputs; End takes none.

import type { Agent, Approval, Block, BlockLink, Check, End, Id, Model, Route, Start } from '../model.js';
import {
  bodyText,
  childPath,
  enumValue,
  idValue,
  itemPath,
  modelValue,
  nonBlankText,
  objectValue,
  positiveWholeNumber,
  type Problems,
  textList,
  visitKeys,
} from '../check/primitives.js';
import { parseBlockLink, parseRoute } from './link.js';

const BLOCK_KINDS = ['start', 'agent', 'approval', 'check', 'end'] as const;
const END_OUTCOMES = ['done', 'stopped'] as const;
export const CHECK_TYPES = ['checks', 'diff size'] as const;
// `outcome` is not an agent key, so an agent that has it is refused as an unknown key (F-02 AC-005).
const AGENT_KEYS = [
  'id',
  'kind',
  'name',
  'description',
  'arguments',
  'restrictions',
  'model',
  'tools',
  'reads',
  'writes',
  'ruleTags',
  'body',
  'connectedTo',
] as const;

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
    case 'agent':
      return parseAgent(object, path, problems);
    case 'approval':
      return parseApproval(object, path, problems);
    case 'check':
      return parseCheck(object, path, problems);
    case 'end':
      return parseEnd(object, path, problems);
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

function parseAgent(object: Readonly<Record<string, unknown>>, path: string, problems: Problems): Agent | undefined {
  const before = problems.list.length;
  const found: {
    id: Id | undefined;
    name: Id | undefined;
    description: string | undefined;
    arguments: string | undefined;
    restrictions: string | undefined;
    model: Model | undefined;
    tools: string[] | undefined;
    reads: string[] | undefined;
    writes: string[] | undefined;
    ruleTags: Id[] | undefined;
    body: string | undefined;
    connectedTo: BlockLink | undefined;
  } = {
    id: undefined,
    name: undefined,
    description: undefined,
    arguments: undefined,
    restrictions: undefined,
    model: undefined,
    tools: undefined,
    reads: undefined,
    writes: undefined,
    ruleTags: undefined,
    body: undefined,
    connectedTo: undefined,
  };
  visitKeys(object, AGENT_KEYS, path, problems, (key) => {
    const at = childPath(path, key);
    const value = object[key];
    switch (key) {
      case 'id':
        found.id = idValue(value, at, problems);
        break;
      case 'name':
        found.name = idValue(value, at, problems);
        break;
      case 'description':
        found.description = plainText(value, at, problems);
        break;
      case 'arguments':
        found.arguments = plainText(value, at, problems);
        break;
      case 'restrictions':
        if (value !== undefined) {
          found.restrictions = plainText(value, at, problems);
        }
        break;
      case 'model':
        if (value !== undefined) {
          found.model = modelValue(value, at, problems);
        }
        break;
      case 'tools':
        if (value !== undefined) {
          found.tools = textList(value, at, problems);
        }
        break;
      case 'reads':
        if (value !== undefined) {
          found.reads = textList(value, at, problems);
        }
        break;
      case 'writes':
        if (value !== undefined) {
          found.writes = textList(value, at, problems);
        }
        break;
      case 'ruleTags':
        if (value !== undefined) {
          found.ruleTags = idList(value, at, problems);
        }
        break;
      case 'body':
        if (value !== undefined) {
          found.body = bodyText(value, at, problems);
        }
        break;
      case 'connectedTo':
        if (value !== undefined) {
          found.connectedTo = parseBlockLink(value, at, problems);
        }
        break;
    }
  });
  if (
    found.id === undefined ||
    found.name === undefined ||
    found.description === undefined ||
    found.arguments === undefined ||
    problems.list.length > before
  ) {
    return undefined;
  }
  const agent: Agent = {
    id: found.id,
    kind: 'agent',
    name: found.name,
    description: found.description,
    arguments: found.arguments,
  };
  if (found.restrictions !== undefined) {
    agent.restrictions = found.restrictions;
  }
  if (found.model !== undefined) {
    agent.model = found.model;
  }
  if (found.tools !== undefined) {
    agent.tools = found.tools;
  }
  if (found.reads !== undefined) {
    agent.reads = found.reads;
  }
  if (found.writes !== undefined) {
    agent.writes = found.writes;
  }
  if (found.ruleTags !== undefined) {
    agent.ruleTags = found.ruleTags;
  }
  if (found.body !== undefined) {
    agent.body = found.body;
  }
  if (found.connectedTo !== undefined) {
    agent.connectedTo = found.connectedTo;
  }
  return agent;
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

function parseCheck(object: Readonly<Record<string, unknown>>, path: string, problems: Problems): Check | undefined {
  const before = problems.list.length;
  const found: {
    id: Id | undefined;
    description: string | undefined;
    type: Check['type'] | undefined;
    threshold: number | undefined;
    connectedTo: Check['connectedTo'] | undefined;
  } = { id: undefined, description: undefined, type: undefined, threshold: undefined, connectedTo: undefined };
  visitKeys(object, ['id', 'kind', 'description', 'type', 'threshold', 'connectedTo'], path, problems, (key) => {
    const at = childPath(path, key);
    const value = object[key];
    if (key === 'id') {
      found.id = idValue(value, at, problems);
    } else if (key === 'description') {
      found.description = nonBlankText(value, at, problems);
    } else if (key === 'type') {
      found.type = enumValue(value, CHECK_TYPES, at, problems);
    } else if (key === 'threshold' && value !== undefined) {
      // A missing threshold is checked after the visit, against the type.
      if (object['type'] === 'checks') {
        problems.add(at, 'is not allowed on a checks check');
      } else {
        found.threshold = positiveWholeNumber(value, at, problems);
      }
    } else if (key === 'connectedTo') {
      if (value === undefined) {
        problems.add(at, 'is required: a check has a true and a false output');
      } else {
        found.connectedTo = parseCheckOutputs(value, at, problems);
      }
    }
  });
  if (found.type === 'diff size' && object['threshold'] === undefined) {
    problems.add(childPath(path, 'threshold'), 'is required on a diff size check');
  }
  if (
    found.id === undefined ||
    found.description === undefined ||
    found.type === undefined ||
    found.connectedTo === undefined ||
    problems.list.length > before
  ) {
    return undefined;
  }
  const check: Check = {
    id: found.id,
    kind: 'check',
    description: found.description,
    type: found.type,
    connectedTo: found.connectedTo,
  };
  if (found.threshold !== undefined) {
    check.threshold = found.threshold;
  }
  return check;
}

// The two outputs of a Check: `true` and `false`, each a route (F-02 T004). Both are required.
function parseCheckOutputs(
  value: unknown,
  path: string,
  problems: Problems,
): Check['connectedTo'] | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const found: { true: Route | undefined; false: Route | undefined } = { true: undefined, false: undefined };
  visitKeys(object, ['true', 'false'], path, problems, (key) => {
    if (key === 'true') {
      found.true = parseRoute(object['true'], childPath(path, 'true'), problems);
    } else if (key === 'false') {
      found.false = parseRoute(object['false'], childPath(path, 'false'), problems);
    }
  });
  if (found.true === undefined || found.false === undefined || problems.list.length > before) {
    return undefined;
  }
  return { true: found.true, false: found.false };
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
// The same holds for an agent's `description`, `arguments` and `restrictions`: the schema marks none of them non-blank,
// and an agent that takes no arguments has `arguments: ""`.
export function plainText(value: unknown, path: string, problems: Problems): string | undefined {
  if (typeof value !== 'string') {
    problems.add(path, 'must be text');
    return undefined;
  }
  return value;
}

// A list of rule ids (`ruleTags`): the text-list rules (no blank, no duplicate), then the id rule on each entry (decision 18).
export function idList(value: unknown, path: string, problems: Problems): Id[] | undefined {
  const entries = textList(value, path, problems);
  if (entries === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  entries.forEach((entry, index) => {
    idValue(entry, itemPath(path, index), problems);
  });
  return problems.list.length > before ? undefined : entries;
}
