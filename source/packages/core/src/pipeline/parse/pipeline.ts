// The pipeline parser (architecture.md §6 decision 33): the pipeline's name and description, its structured arguments,
// its flows in order, and the optional model, tools, rule tags and body. Shape only: whether a flow or a rule tag
// names something that exists is checked by F-03. Called by the config parser in ./project.ts.

import type { Argument, Flow, Id, Model, Pipeline } from '../model.js';
import {
  bodyText,
  booleanValue,
  childPath,
  idValue,
  itemPath,
  modelValue,
  nonBlankText,
  objectValue,
  type Problems,
  textList,
  visitKeys,
} from '../check/primitives.js';
import { idList, plainText } from './block.js';
import { parseFlow } from './flow.js';

const PIPELINE_KEYS = ['name', 'description', 'arguments', 'flows', 'model', 'tools', 'ruleTags', 'body'] as const;
const ARGUMENT_KEYS = ['id', 'required', 'hint'] as const;

export function parsePipeline(value: unknown, path: string, problems: Problems): Pipeline | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const found: {
    name: string | undefined;
    description: string | undefined;
    arguments: Argument[] | undefined;
    flows: Flow[] | undefined;
    model: Model | undefined;
    tools: string[] | undefined;
    ruleTags: Id[] | undefined;
    body: string | undefined;
  } = {
    name: undefined,
    description: undefined,
    arguments: undefined,
    flows: undefined,
    model: undefined,
    tools: undefined,
    ruleTags: undefined,
    body: undefined,
  };
  visitKeys(object, PIPELINE_KEYS, path, problems, (key) => {
    const at = childPath(path, key);
    const value = object[key];
    switch (key) {
      case 'name':
        found.name = nonBlankText(value, at, problems);
        break;
      case 'description':
        found.description = nonBlankText(value, at, problems);
        break;
      case 'arguments':
        // Required: an absent key is refused as a list that is not there (AC-006). An empty list is valid.
        found.arguments = parseArguments(value, at, problems);
        break;
      case 'flows':
        found.flows = parseFlows(value, at, problems);
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
    }
  });
  if (
    found.name === undefined ||
    found.description === undefined ||
    found.arguments === undefined ||
    found.flows === undefined ||
    problems.list.length > before
  ) {
    return undefined;
  }
  const pipeline: Pipeline = {
    name: found.name,
    description: found.description,
    arguments: found.arguments,
    flows: found.flows,
  };
  if (found.model !== undefined) {
    pipeline.model = found.model;
  }
  if (found.tools !== undefined) {
    pipeline.tools = found.tools;
  }
  if (found.ruleTags !== undefined) {
    pipeline.ruleTags = found.ruleTags;
  }
  if (found.body !== undefined) {
    pipeline.body = found.body;
  }
  return pipeline;
}

// The flows keep the order of the array. A flow that fails is refused at its own path; the others are still checked.
function parseFlows(value: unknown, path: string, problems: Problems): Flow[] | undefined {
  if (!Array.isArray(value)) {
    problems.add(path, 'must be a list of flows');
    return undefined;
  }
  const entries: readonly unknown[] = value;
  const before = problems.list.length;
  const flows: Flow[] = [];
  // An indexed loop, not forEach: forEach skips the holes of a sparse array, which would drop a flow silently.
  for (let index = 0; index < entries.length; index++) {
    const flow = parseFlow(entries[index], itemPath(path, index), problems);
    if (flow !== undefined) {
      flows.push(flow);
    }
  }
  return problems.list.length > before ? undefined : flows;
}

function parseArguments(value: unknown, path: string, problems: Problems): Argument[] | undefined {
  if (!Array.isArray(value)) {
    problems.add(path, 'must be a list of arguments');
    return undefined;
  }
  const entries: readonly unknown[] = value;
  const before = problems.list.length;
  const args: Argument[] = [];
  for (let index = 0; index < entries.length; index++) {
    const argument = parseArgument(entries[index], itemPath(path, index), problems);
    if (argument !== undefined) {
      args.push(argument);
    }
  }
  return problems.list.length > before ? undefined : args;
}

// An argument is `{ id, required, hint }`: the id rule, a boolean, and text. All three are needed and no other key is allowed.
function parseArgument(value: unknown, path: string, problems: Problems): Argument | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const found: { id: Id | undefined; required: boolean | undefined; hint: string | undefined } = {
    id: undefined,
    required: undefined,
    hint: undefined,
  };
  visitKeys(object, ARGUMENT_KEYS, path, problems, (key) => {
    const at = childPath(path, key);
    const value = object[key];
    if (key === 'id') {
      found.id = idValue(value, at, problems);
    } else if (key === 'required') {
      found.required = booleanValue(value, at, problems);
    } else if (key === 'hint') {
      found.hint = plainText(value, at, problems);
    }
  });
  if (
    found.id === undefined ||
    found.required === undefined ||
    found.hint === undefined ||
    problems.list.length > before
  ) {
    return undefined;
  }
  return { id: found.id, required: found.required, hint: found.hint };
}
