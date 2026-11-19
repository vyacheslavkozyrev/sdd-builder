import {
  childPath,
  describeValue,
  readList,
  readObject,
  type ProblemCollector,
} from '../check/primitives.js';
import type { Block } from '../model.js';
import { readAgent } from './agent.js';
import { readCondition } from './condition.js';
import { readEnd } from './end.js';
import { readStart } from './start.js';

// The blocks of a flow (pipeline-schema.md §2, `block` and §5; AC-040 to AC-042). A flow has at least
// two blocks: a list with fewer is refused at the path of `blocks` (AC-040). Each block is dispatched on
// its `kind`, which is one of start, agent, condition or end (AC-041); a block without a `kind` is refused
// at its own path (AC-042). The block is then read by the reader of its kind, which refuses any key that
// does not belong to that kind as an unknown key (AC-042). An id is checked by those readers; uniqueness
// across the project is checked later (AC-043). Returns the blocks that parse, in document order; returns
// undefined when the value is not a list.

const MIN_BLOCKS = 2;

function readBlock(value: unknown, path: string, problems: ProblemCollector, index: number): Block | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  if (!Object.hasOwn(record, 'kind')) {
    problems.add(path, 'is missing the key kind');
    return undefined;
  }
  const kind = record.kind;
  switch (kind) {
    case 'start':
      return readStart(record, path, problems, index);
    case 'agent':
      return readAgent(record, path, problems, index);
    case 'condition':
      return readCondition(record, path, problems, index);
    case 'end':
      return readEnd(record, path, problems, index);
    default:
      problems.add(
        childPath(path, 'kind'),
        `must be start, agent, condition or end, got ${describeValue(kind)}`,
      );
      return undefined;
  }
}

export function readBlocks(value: unknown, path: string, problems: ProblemCollector): Block[] | undefined {
  const items = readList(value, path, problems);
  if (items === undefined) return undefined;

  if (items.length < MIN_BLOCKS) {
    problems.add(path, `must hold at least ${MIN_BLOCKS} blocks, got ${items.length}`);
  }

  const blocks: Block[] = [];
  items.forEach((item, index) => {
    const block = readBlock(item, childPath(path, String(index)), problems, index);
    if (block !== undefined) blocks.push(block);
  });
  return blocks;
}
