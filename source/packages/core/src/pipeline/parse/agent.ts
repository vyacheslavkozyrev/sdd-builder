import {
  childPath,
  describeValue,
  readFileSafeName,
  readId,
  readModel,
  readObject,
  readOptional,
  readText,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';
import type { AgentBlock } from '../model.js';
import { readArguments } from './argument.js';
import { readRuleTags, readTools } from './lists.js';

// The Agent block of a flow (pipeline-schema.md §2, `blockAgent`; AC-047 to AC-055). An agent requires
// `id`, `kind`, `name`, `description`, `arguments` and `next`; `model`, `tools`, `ruleTags` and `body` are
// optional; no other key is allowed (`reads` and `writes` were removed, amended 2026-11-24). An unknown key is refused at the path
// of that key; a missing required key is refused at the path of the agent. `name` is a file-safe name, unique
// across agents (AC-048, checked later). `description` is non-blank text of up to 1,000 code points.
// `body` is non-blank text of up to 1,000 code points (F-12 AC-028). `next` names a block, and is checked
// later (AC-054).
// An optional key that is present but refused makes the agent incomplete, and it is left out.

const REQUIRED_KEYS: readonly string[] = ['id', 'kind', 'name', 'description', 'arguments', 'next'];
const OPTIONAL_KEYS: readonly string[] = ['model', 'tools', 'ruleTags', 'body'];
const AGENT_KEYS: readonly string[] = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

const readBody: Reader<string> = (value, path, problems) =>
  readText(value, path, { max: 1000, nonBlank: true }, problems);

export function readAgent(
  value: unknown,
  path: string,
  problems: ProblemCollector,
  index: number,
): AgentBlock | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!AGENT_KEYS.includes(key)) {
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
  if (record.kind !== 'agent') {
    problems.add(childPath(path, 'kind'), `must be agent, got ${describeValue(record.kind)}`);
    return undefined;
  }
  const name = readFileSafeName(record.name, childPath(path, 'name'), problems);
  const description = readText(
    record.description,
    childPath(path, 'description'),
    { max: 1000, nonBlank: true },
    problems,
  );
  const args = readArguments(record.arguments, childPath(path, 'arguments'), problems);
  const next = readId(record.next, childPath(path, 'next'), problems);

  let optionalOk = true;
  const optional = <T>(key: string, read: Reader<T>): T | undefined => {
    const result = readOptional(record, key, path, problems, read);
    if (Object.hasOwn(record, key) && result === undefined) optionalOk = false;
    return result;
  };
  const model = optional('model', readModel);
  const tools = optional('tools', readTools);
  const ruleTags = optional('ruleTags', readRuleTags);
  const body = optional('body', readBody);

  if (
    !optionalOk ||
    id === undefined ||
    name === undefined ||
    description === undefined ||
    args === undefined ||
    next === undefined
  ) {
    return undefined;
  }
  return {
    index,
    id,
    kind: 'agent',
    name,
    description,
    arguments: args,
    next,
    ...(model === undefined ? {} : { model }),
    ...(tools === undefined ? {} : { tools }),
    ...(ruleTags === undefined ? {} : { ruleTags }),
    ...(body === undefined ? {} : { body }),
  };
}
