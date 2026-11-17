// The parser entry for the whole config (architecture.md §6 decisions 33 and 3). It takes any value,
// never throws, and returns either the typed config or every problem, in document order.

import type { ProjectConfig, Rule, Pipeline } from '../model.js';
import {
  childPath,
  createProblems,
  idValue,
  itemPath,
  nonBlankText,
  objectValue,
  type Problem,
  type Problems,
  visitKeys,
} from '../check/primitives.js';
import { checkIds } from './ids.js';
import { parsePipeline } from './pipeline.js';

export type ParseResult = { ok: true; config: ProjectConfig } | { ok: false; problems: Problem[] };

const ROOT_KEYS = ['schemaVersion', 'rules', 'pipeline'];
const RULE_KEYS = ['id', 'title', 'text'];

export function parseProjectConfig(input: unknown): ParseResult {
  const problems = createProblems();
  const root = objectValue(input, '', problems);
  if (root === undefined) {
    return { ok: false, problems: problems.list };
  }
  const found: { rules: Rule[] | undefined; pipeline: Pipeline | undefined } = {
    rules: undefined,
    pipeline: undefined,
  };
  visitKeys(root, ROOT_KEYS, '', problems, (key) => {
    const value = root[key];
    if (key === 'schemaVersion') {
      if (value !== 2) {
        problems.add('schemaVersion', 'must be the number 2');
      }
    } else if (key === 'rules') {
      found.rules = parseRules(value, 'rules', problems);
    } else if (value === undefined) {
      problems.add('pipeline', 'is required');
    } else {
      found.pipeline = parsePipeline(value, 'pipeline', problems);
    }
  });
  if (problems.list.length > 0 || found.rules === undefined || found.pipeline === undefined) {
    return { ok: false, problems: problems.list };
  }
  // The id pass runs only once the rest of the config is valid, and its problems join the same list.
  checkIds(found.pipeline, root['pipeline'], problems);
  if (problems.list.length > 0) {
    return { ok: false, problems: problems.list };
  }
  return { ok: true, config: { schemaVersion: 2, rules: found.rules, pipeline: found.pipeline } };
}

function parseRules(value: unknown, path: string, problems: Problems): Rule[] | undefined {
  if (!Array.isArray(value)) {
    problems.add(path, 'must be a list of rules');
    return undefined;
  }
  const entries: readonly unknown[] = value;
  const ids = new Set<string>();
  const rules: Rule[] = [];
  let valid = true;
  for (let index = 0; index < entries.length; index++) {
    const rule = parseRule(entries[index], itemPath(path, index), ids, problems);
    if (rule === undefined) {
      valid = false;
    } else {
      rules.push(rule);
    }
  }
  return valid ? rules : undefined;
}

function parseRule(value: unknown, path: string, ids: Set<string>, problems: Problems): Rule | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  // Each field is checked where it sits in the rule; a field that fails stays undefined and the rule is refused.
  const found: { id: string | undefined; title: string | undefined; text: string | undefined } = {
    id: undefined,
    title: undefined,
    text: undefined,
  };
  visitKeys(object, RULE_KEYS, path, problems, (key) => {
    const keyPath = childPath(path, key);
    if (key === 'id') {
      const id = idValue(object['id'], keyPath, problems);
      if (id !== undefined && ids.has(id)) {
        problems.add(keyPath, 'duplicates the id of an earlier rule');
      } else if (id !== undefined) {
        ids.add(id);
        found.id = id;
      }
    } else if (key === 'title') {
      found.title = nonBlankText(object['title'], keyPath, problems);
    } else if (key === 'text') {
      found.text = nonBlankText(object['text'], keyPath, problems);
    }
  });
  if (found.id === undefined || found.title === undefined || found.text === undefined) {
    return undefined;
  }
  return { id: found.id, title: found.title, text: found.text };
}
