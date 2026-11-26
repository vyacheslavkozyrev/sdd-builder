import {
  childPath,
  describeValue,
  NONE_REFUSAL,
  NONE_TEXT,
  readId,
  readObject,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { EndBlock } from '../model.js';

// The End block of a flow (pipeline-schema.md §2, `blockEnd`; AC-063). An end requires `id`,
// `kind` and `outcome`, and has no other key (such as `next`): an unknown key is refused at the path
// of that key. `outcome` is `done` or `stopped`. `producedArtifact` is optional (owner decision
// 2026-11-25): a blank value (empty or white space), or no key, is an end that produces no artifact;
// a non-empty value must name an artifact of its flow, a link checked later (AC-064, AC-065). The text `none` is
// refused (owner decision 2026-11-26; AC-032): blank is the only way to say an End produces no artifact.
// An invalid end is left out.

const END_KEYS: readonly string[] = ['id', 'kind', 'outcome', 'producedArtifact'];
const REQUIRED_END_KEYS: readonly string[] = ['id', 'kind', 'outcome'];
const OUTCOMES: readonly EndBlock['outcome'][] = ['done', 'stopped'];

function readOutcome(value: unknown, path: string, problems: ProblemCollector): EndBlock['outcome'] | undefined {
  const outcome = OUTCOMES.find((candidate) => candidate === value);
  if (outcome !== undefined) return outcome;
  problems.add(path, `must be done or stopped, got ${describeValue(value)}`);
  return undefined;
}

export function readEnd(
  value: unknown,
  path: string,
  problems: ProblemCollector,
  index: number,
): EndBlock | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!END_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of REQUIRED_END_KEYS) {
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
  const producedArtifact = Object.hasOwn(record, 'producedArtifact')
    ? readProducedArtifact(record.producedArtifact, childPath(path, 'producedArtifact'), problems)
    : '';
  if (id === undefined || outcome === undefined || producedArtifact === undefined) return undefined;
  return { index, id, kind: 'end', outcome, producedArtifact };
}

// A blank value (empty, or only white space) is no artifact and is read as ''. The text `none` is refused,
// whether or not the flow has an artifact labelled none (AC-032). Any other text is a label of at most 200
// code points; it is checked against the flow's artifacts later.
function readProducedArtifact(value: unknown, path: string, problems: ProblemCollector): string | undefined {
  if (typeof value === 'string' && !/\S/.test(value)) return '';
  if (value === NONE_TEXT) {
    problems.add(path, NONE_REFUSAL);
    return undefined;
  }
  return readText(value, path, { max: 200 }, problems);
}
