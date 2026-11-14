// Field-level rules of the Connection and End blocks. A Connection's `from` and `to` name a block
// (or, in the pipeline, a flow) of the same list; its artifact is a label. An End has an outcome
// (`done` or `stopped`) and an optional produced artifact. Unknown keys are refused at their path.
import type { ConnectionBlock, EndBlock, EndOutcome } from './model.js';
import type { ConnectionStructure, EndStructure } from './parse-structure.js';
import {
  checkKeys,
  childPath,
  has,
  readOptionalString,
  readString,
  requirePresent,
  type ListIds,
  type Obj,
  type PipelineProblem,
} from './parse-util.js';

const CONNECTION_KEYS: readonly string[] = ['kind', 'id', 'enabled', 'from', 'to', 'artifact'];
const END_KEYS: readonly string[] = ['kind', 'id', 'enabled', 'outcome', 'produced'];

function isEndOutcome(value: unknown): value is EndOutcome {
  return value === 'done' || value === 'stopped';
}

/** A `from` or `to` of a Connection: the id of a block or flow of the same list. */
function readReference(obj: Obj, key: 'from' | 'to', path: string, ids: ListIds, problems: PipelineProblem[]): string | undefined {
  const value = readString(obj, key, path, problems);
  if (value === undefined) return undefined;
  if (ids.ids.includes(value)) return value;
  problems.push({ path: childPath(path, key), message: 'must name a block in the same list' });
  return undefined;
}

/** A Connection between two blocks of a flow, or between two flows of the pipeline. */
export function toConnection(block: ConnectionStructure, ids: ListIds, problems: PipelineProblem[]): ConnectionBlock | undefined {
  checkKeys(block.fields, CONNECTION_KEYS, block.path, problems);
  const from = readReference(block.fields, 'from', block.path, ids, problems);
  const to = readReference(block.fields, 'to', block.path, ids, problems);
  const artifact = readString(block.fields, 'artifact', block.path, problems);
  if (from === undefined || to === undefined || artifact === undefined) return undefined;
  return { kind: 'connection', id: block.id, enabled: block.enabled, from, to, artifact };
}

/** The exit of a flow or the pipeline. The produced artifact may be left out. */
export function toEnd(block: EndStructure, problems: PipelineProblem[]): EndBlock | undefined {
  const { fields: obj, path } = block;
  checkKeys(obj, END_KEYS, path, problems);
  const outcome = readOutcome(obj, path, problems);
  const producedGiven = has(obj, 'produced');
  const produced = producedGiven ? readOptionalString(obj, 'produced', path, problems) : undefined;
  if (outcome === undefined || (producedGiven && produced === undefined)) return undefined;
  return {
    kind: 'end',
    id: block.id,
    enabled: block.enabled,
    outcome,
    ...(produced === undefined ? {} : { produced }),
  };
}

function readOutcome(obj: Obj, path: string, problems: PipelineProblem[]): EndOutcome | undefined {
  if (!requirePresent(obj, 'outcome', path, problems)) return undefined;
  const value = obj['outcome'];
  if (isEndOutcome(value)) return value;
  problems.push({ path: childPath(path, 'outcome'), message: 'must be done or stopped' });
  return undefined;
}
