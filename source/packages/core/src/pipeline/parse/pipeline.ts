import {
  childPath,
  readModel,
  readList,
  readObject,
  readOptional,
  readText,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';
import type { Flow, Pipeline } from '../model.js';
import { readArguments } from './argument.js';
import { readFlow } from './flow.js';
import { readRuleTags, readTools } from './lists.js';

// The pipeline object (pipeline-schema.md §2, `pipeline`; decisions 16, 26; AC-011 to AC-014, AC-019,
// AC-030, AC-071, AC-072, AC-086). A pipeline requires `name`, `description`, `arguments` and `flows`;
// `model`, `tools`, `ruleTags` and `body` are optional; no other key is allowed. An unknown key is refused
// at the path of that key; a missing required key is refused at the path of the pipeline. `name` is 1 to
// 100 code points and not blank; `description` and `body` are text of up to 1,000 code points. `flows`
// must be a list with at least one flow (AC-086); each flow is read by its own reader at its index, and an
// invalid flow is left out of the list while the others keep their order (AC-013). Uniqueness of ids and
// the links between flows are checked later.

const REQUIRED_KEYS: readonly string[] = ['name', 'description', 'arguments', 'flows'];
const OPTIONAL_KEYS: readonly string[] = ['model', 'tools', 'ruleTags', 'body'];
const PIPELINE_KEYS: readonly string[] = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

const readLongText: Reader<string> = (value, path, problems) => readText(value, path, { max: 1000 }, problems);

function readFlows(value: unknown, path: string, problems: ProblemCollector): Flow[] | undefined {
  const items = readList(value, path, problems);
  if (items === undefined) return undefined;

  if (items.length === 0) {
    problems.add(path, 'must hold at least one flow, got 0');
    return undefined;
  }

  const flows: Flow[] = [];
  items.forEach((item, index) => {
    const flow = readFlow(item, childPath(path, String(index)), problems);
    if (flow !== undefined) flows.push(flow);
  });
  // Every flow was invalid: each problem is already reported at its flow, and no flow is left to keep.
  return flows.length === 0 ? undefined : flows;
}

export function readPipeline(value: unknown, path: string, problems: ProblemCollector): Pipeline | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!PIPELINE_KEYS.includes(key)) {
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

  const name = readText(record.name, childPath(path, 'name'), { max: 100, nonBlank: true }, problems);
  const description = readLongText(record.description, childPath(path, 'description'), problems);
  const args = readArguments(record.arguments, childPath(path, 'arguments'), problems);
  const flows = readFlows(record.flows, childPath(path, 'flows'), problems);

  let optionalOk = true;
  const optional = <T>(key: string, read: Reader<T>): T | undefined => {
    const result = readOptional(record, key, path, problems, read);
    if (Object.hasOwn(record, key) && result === undefined) optionalOk = false;
    return result;
  };
  const model = optional('model', readModel);
  const tools = optional('tools', readTools);
  const ruleTags = optional('ruleTags', readRuleTags);
  const body = optional('body', readLongText);

  if (!optionalOk || name === undefined || description === undefined || args === undefined || flows === undefined) {
    return undefined;
  }
  return {
    name,
    description,
    arguments: args,
    flows,
    ...(model === undefined ? {} : { model }),
    ...(tools === undefined ? {} : { tools }),
    ...(ruleTags === undefined ? {} : { ruleTags }),
    ...(body === undefined ? {} : { body }),
  };
}
