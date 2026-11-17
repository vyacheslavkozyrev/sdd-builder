// The flow parser (architecture.md §6 decision 33): a flow holds its blocks in order. Its optional `connectedTo` is the
// arrow to the next flow, with an optional gate: an approval, or a check with a type and, for `diff size`, a threshold.
// Shape only: whether `to` names a flow that exists is checked by F-03. The pipeline that holds the flows is in ./pipeline.ts.

import type { Block, Flow, FlowLink, Gate, Id, Model } from '../model.js';
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
  visitKeys,
} from '../check/primitives.js';
import { CHECK_TYPES, idList, parseBlock, plainText } from './block.js';

const FLOW_KEYS = [
  'id',
  'name',
  'description',
  'arguments',
  'model',
  'ruleTags',
  'body',
  'blocks',
  'connectedTo',
] as const;
const GATE_KINDS = ['approval', 'check'] as const;

export function parseFlow(value: unknown, path: string, problems: Problems): Flow | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const found: {
    id: Id | undefined;
    name: string | undefined;
    description: string | undefined;
    arguments: string | undefined;
    model: Model | undefined;
    ruleTags: Id[] | undefined;
    body: string | undefined;
    blocks: Block[] | undefined;
    connectedTo: FlowLink | undefined;
  } = {
    id: undefined,
    name: undefined,
    description: undefined,
    arguments: undefined,
    model: undefined,
    ruleTags: undefined,
    body: undefined,
    blocks: undefined,
    connectedTo: undefined,
  };
  visitKeys(object, FLOW_KEYS, path, problems, (key) => {
    const at = childPath(path, key);
    const value = object[key];
    switch (key) {
      case 'id':
        found.id = idValue(value, at, problems);
        break;
      case 'name':
        found.name = nonBlankText(value, at, problems);
        break;
      case 'description':
        found.description = nonBlankText(value, at, problems);
        break;
      case 'arguments':
        found.arguments = plainText(value, at, problems);
        break;
      case 'model':
        if (value !== undefined) {
          found.model = modelValue(value, at, problems);
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
      case 'blocks':
        found.blocks = parseBlocks(value, at, problems);
        break;
      case 'connectedTo':
        if (value !== undefined) {
          found.connectedTo = parseFlowLink(value, at, problems);
        }
        break;
    }
  });
  if (
    found.id === undefined ||
    found.name === undefined ||
    found.description === undefined ||
    found.arguments === undefined ||
    found.blocks === undefined ||
    problems.list.length > before
  ) {
    return undefined;
  }
  const flow: Flow = {
    id: found.id,
    name: found.name,
    description: found.description,
    arguments: found.arguments,
    blocks: found.blocks,
  };
  if (found.model !== undefined) {
    flow.model = found.model;
  }
  if (found.ruleTags !== undefined) {
    flow.ruleTags = found.ruleTags;
  }
  if (found.body !== undefined) {
    flow.body = found.body;
  }
  if (found.connectedTo !== undefined) {
    flow.connectedTo = found.connectedTo;
  }
  return flow;
}

// The blocks keep the order of the array. An empty array is accepted; a block that fails is refused at its own path.
function parseBlocks(value: unknown, path: string, problems: Problems): Block[] | undefined {
  if (!Array.isArray(value)) {
    problems.add(path, 'must be a list of blocks');
    return undefined;
  }
  const entries: readonly unknown[] = value;
  const before = problems.list.length;
  const blocks: Block[] = [];
  // An indexed loop, not forEach: forEach skips the holes of a sparse array, which would drop a block silently.
  for (let index = 0; index < entries.length; index++) {
    const block = parseBlock(entries[index], itemPath(path, index), problems);
    if (block !== undefined) {
      blocks.push(block);
    }
  }
  return problems.list.length > before ? undefined : blocks;
}

function parseFlowLink(value: unknown, path: string, problems: Problems): FlowLink | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const found: { to: Id | undefined; label: string | undefined; gate: Gate | undefined } = {
    to: undefined,
    label: undefined,
    gate: undefined,
  };
  visitKeys(object, ['to', 'label', 'gate'], path, problems, (key) => {
    const at = childPath(path, key);
    if (key === 'to') {
      found.to = idValue(object['to'], at, problems);
    } else if (key === 'label') {
      found.label = nonBlankText(object['label'], at, problems);
    } else if (key === 'gate' && object['gate'] !== undefined) {
      found.gate = parseGate(object['gate'], at, problems);
    }
  });
  if (found.to === undefined || found.label === undefined || problems.list.length > before) {
    return undefined;
  }
  const link: FlowLink = { to: found.to, label: found.label };
  if (found.gate !== undefined) {
    link.gate = found.gate;
  }
  return link;
}

// A gate is `{ kind: 'approval', description }` or `{ kind: 'check', description, type, threshold? }`. The threshold
// belongs to a `diff size` check: it is required there and refused on a `checks` check. Any other kind is refused.
function parseGate(value: unknown, path: string, problems: Problems): Gate | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const kind = enumValue(object['kind'], GATE_KINDS, childPath(path, 'kind'), problems);
  if (kind === undefined) {
    return undefined;
  }
  const found: {
    description: string | undefined;
    type: (typeof CHECK_TYPES)[number] | undefined;
    threshold: number | undefined;
  } = { description: undefined, type: undefined, threshold: undefined };
  const allowed = kind === 'approval' ? ['kind', 'description'] : ['kind', 'description', 'type', 'threshold'];
  visitKeys(object, allowed, path, problems, (key) => {
    const at = childPath(path, key);
    const value = object[key];
    if (key === 'description') {
      found.description = nonBlankText(value, at, problems);
    } else if (key === 'type') {
      found.type = enumValue(value, CHECK_TYPES, at, problems);
    } else if (key === 'threshold' && value !== undefined) {
      // A missing threshold is checked after the visit, against the type.
      if (object['type'] === 'checks') {
        problems.add(at, 'is not allowed on a checks gate');
      } else {
        found.threshold = positiveWholeNumber(value, at, problems);
      }
    }
  });
  if (kind === 'check' && found.type === 'diff size' && object['threshold'] === undefined) {
    problems.add(childPath(path, 'threshold'), 'is required on a diff size gate');
  }
  if (found.description === undefined || problems.list.length > before) {
    return undefined;
  }
  if (kind === 'approval') {
    return { kind: 'approval', description: found.description };
  }
  if (found.type === undefined) {
    return undefined;
  }
  const gate: Gate = { kind: 'check', description: found.description, type: found.type };
  if (found.threshold !== undefined) {
    gate.threshold = found.threshold;
  }
  return gate;
}
