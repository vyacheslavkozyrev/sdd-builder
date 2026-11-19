import {
  childPath,
  readBoolean,
  readId,
  readModel,
  readObject,
  readOptional,
  readText,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';
import type { Flow } from '../model.js';
import { readArguments } from './argument.js';
import { readArtifacts } from './artifact.js';
import { readBlocks } from './block.js';
import { readRuleTags } from './lists.js';

// The flow object of a pipeline (pipeline-schema.md §2, `flow`; decisions 38, 39; AC-007, AC-008,
// AC-020 to AC-025, AC-027, AC-029, AC-030, AC-039, AC-071, AC-072). A flow requires `id`, `name`,
// `body`, `arguments`, `artifacts`, `approval` and `blocks`; `description`, `model`, `ruleTags` and
// `next` are optional; no other key is allowed. An unknown key is refused at the path of that key;
// a missing required key is refused at the path of the flow. `name` is 1 to 100 code points and not
// blank; `description` and `body` are text of up to 1,000 code points. `approval` is a boolean.
// `id` follows the id rule and is unique across the project (checked later). `next` names a flow and
// is checked later (AC-031 to AC-035). An optional key that is present but refused makes the flow
// incomplete, and it is left out.

const REQUIRED_KEYS: readonly string[] = ['id', 'name', 'body', 'arguments', 'artifacts', 'approval', 'blocks'];
const OPTIONAL_KEYS: readonly string[] = ['description', 'model', 'ruleTags', 'next'];
const FLOW_KEYS: readonly string[] = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

const readLongText: Reader<string> = (value, path, problems) => readText(value, path, { max: 1000 }, problems);

export function readFlow(value: unknown, path: string, problems: ProblemCollector): Flow | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!FLOW_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const id = readId(record.id, childPath(path, 'id'), problems);
  const name = readText(record.name, childPath(path, 'name'), { max: 100, nonBlank: true }, problems);
  const body = readLongText(record.body, childPath(path, 'body'), problems);
  const args = readArguments(record.arguments, childPath(path, 'arguments'), problems);
  const artifacts = readArtifacts(record.artifacts, childPath(path, 'artifacts'), problems);
  const approval = readBoolean(record.approval, childPath(path, 'approval'), problems);
  const blocks = readBlocks(record.blocks, childPath(path, 'blocks'), problems);

  let optionalOk = true;
  const optional = <T>(key: string, read: Reader<T>): T | undefined => {
    const result = readOptional(record, key, path, problems, read);
    if (Object.hasOwn(record, key) && result === undefined) optionalOk = false;
    return result;
  };
  const description = optional('description', readLongText);
  const model = optional('model', readModel);
  const ruleTags = optional('ruleTags', readRuleTags);
  const next = optional('next', readId);

  if (
    !optionalOk ||
    id === undefined ||
    name === undefined ||
    body === undefined ||
    args === undefined ||
    artifacts === undefined ||
    approval === undefined ||
    blocks === undefined
  ) {
    return undefined;
  }
  return {
    id,
    name,
    arguments: args,
    body,
    artifacts,
    approval,
    blocks,
    ...(description === undefined ? {} : { description }),
    ...(model === undefined ? {} : { model }),
    ...(ruleTags === undefined ? {} : { ruleTags }),
    ...(next === undefined ? {} : { next }),
  };
}
