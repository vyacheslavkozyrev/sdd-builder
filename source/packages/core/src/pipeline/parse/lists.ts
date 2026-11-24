import {
  childPath,
  readId,
  readList,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { RuleTag } from '../model.js';

// The text and tag lists of an Agent, and of the pipeline and a flow where they recur (pipeline-schema.md
// §2; AC-050, AC-071 to AC-073). Each list is read item by item: an invalid item is refused at
// its own path and left out of the result, the others are kept. A list that is absent is accepted, and
// an empty list is accepted. `unique` lists refuse a repeated item at the path of the second entry.
// Each kept item keeps its document index, so a later check can report at the same place in the file.

type ItemReader = (value: unknown, path: string, problems: ProblemCollector) => string | undefined;

interface Entry {
  readonly value: string;
  readonly index: number;
}

function readStringList(
  value: unknown,
  path: string,
  problems: ProblemCollector,
  readItem: ItemReader,
  unique: boolean,
): Entry[] | undefined {
  const items = readList(value, path, problems);
  if (items === undefined) return undefined;

  const seen = new Set<string>();
  const result: Entry[] = [];
  items.forEach((item, index) => {
    const itemPath = childPath(path, String(index));
    const text = readItem(item, itemPath, problems);
    if (text === undefined) return;
    if (unique) {
      if (seen.has(text)) {
        problems.add(itemPath, `repeats ${text}; each entry must be listed once`);
        return;
      }
      seen.add(text);
    }
    result.push({ value: text, index });
  });
  return result;
}

// `tools`: text items of up to 100 code points; repeats are allowed (AC-050).
export function readTools(value: unknown, path: string, problems: ProblemCollector): string[] | undefined {
  return readStringList(
    value,
    path,
    problems,
    (item, itemPath, itemProblems) => readText(item, itemPath, { max: 100 }, itemProblems),
    false,
  )?.map((entry) => entry.value);
}

// `ruleTags`: rule ids, no repeats (AC-071, AC-072). Whether a tag names a rule is checked later (AC-070).
// Each tag keeps its document index.
export function readRuleTags(value: unknown, path: string, problems: ProblemCollector): RuleTag[] | undefined {
  return readStringList(
    value,
    path,
    problems,
    (item, itemPath, itemProblems) => readId(item, itemPath, itemProblems),
    true,
  )?.map((entry) => ({ ruleId: entry.value, index: entry.index }));
}
