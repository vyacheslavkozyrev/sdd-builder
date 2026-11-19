import {
  childPath,
  readId,
  readList,
  readObject,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { Rule } from '../model.js';

// The `rules` list of a project config (pipeline-schema.md §2, §3; AC-066 to AC-069). A rule
// requires `id`, `title` and `text`. A rule that is missing one of them, or has an unknown key,
// is refused with the path of the rule itself. Its fields are then checked one by one, each
// problem at the path of its field. An invalid rule is left out of the result; the others are kept.

const RULE_KEYS: readonly string[] = ['id', 'title', 'text'];

function readRule(value: unknown, path: string, problems: ProblemCollector): Rule | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!RULE_KEYS.includes(key)) {
      problems.add(path, `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of RULE_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const id = readId(record.id, childPath(path, 'id'), problems);
  const title = readText(record.title, childPath(path, 'title'), { max: 100 }, problems);
  const text = readText(record.text, childPath(path, 'text'), { max: 1000 }, problems);
  if (id === undefined || title === undefined || text === undefined) return undefined;
  return { id, title, text };
}

// Returns the rules that parse, in document order. Returns undefined when the value is not a list.
export function readRules(value: unknown, path: string, problems: ProblemCollector): Rule[] | undefined {
  const items = readList(value, path, problems);
  if (items === undefined) return undefined;

  const rules: Rule[] = [];
  items.forEach((item, index) => {
    const rule = readRule(item, childPath(path, String(index)), problems);
    if (rule !== undefined) rules.push(rule);
  });
  return rules;
}
