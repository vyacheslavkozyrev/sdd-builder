import {
  childPath,
  describeValue,
  readId,
  readObject,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { EndBlock } from '../model.js';

// The End block of a flow (pipeline-schema.md §2, `blockEnd`; AC-063). An end requires `id`,
// `kind`, `outcome` and `producedArtifact`, and has no other key (such as `next`): an unknown key
// is refused at the path of that key. `outcome` is `done` or `stopped`. `producedArtifact` must name
// an artifact of its flow; that link is checked later (AC-064, AC-065). An invalid end is left out.

const END_KEYS: readonly string[] = ['id', 'kind', 'outcome', 'producedArtifact'];
const OUTCOMES: readonly EndBlock['outcome'][] = ['done', 'stopped'];

function readOutcome(value: unknown, path: string, problems: ProblemCollector): EndBlock['outcome'] | undefined {
  const outcome = OUTCOMES.find((candidate) => candidate === value);
  if (outcome !== undefined) return outcome;
  problems.add(path, `must be done or stopped, got ${describeValue(value)}`);
  return undefined;
}

export function readEnd(value: unknown, path: string, problems: ProblemCollector): EndBlock | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!END_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of END_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const id = readId(record.id, childPath(path, 'id'), problems);
  if (record.kind !== 'end') {
    problems.add(childPath(path, 'kind'), `must be end, got ${describeValue(record.kind)}`);
    return undefined;
  }
  const outcome = readOutcome(record.outcome, childPath(path, 'outcome'), problems);
  const producedArtifact = readText(
    record.producedArtifact,
    childPath(path, 'producedArtifact'),
    { max: 200, min: 1 },
    problems,
  );
  if (id === undefined || outcome === undefined || producedArtifact === undefined) return undefined;
  return { id, kind: 'end', outcome, producedArtifact };
}
