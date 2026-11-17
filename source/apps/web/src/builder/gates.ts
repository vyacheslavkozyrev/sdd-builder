// Gates on arrows (F-11 AC-017, AC-018, AC-019, model part). A pure function: it returns a new pipeline or a
// refusal with its reason, and never changes the pipeline it is given. A gate is the source flow's
// `connectedTo.gate` (architecture.md §6, decision 33): an approval, or a check with a type and, for
// `diff size` only, a threshold.
//
// The rules are the parser's. The candidate gate is parsed with `pipeline.parseProjectConfig`, and a refusal
// takes the parser's message for the field, so the wording matches the Analyze step.

import { pipeline } from '@sddbuilder/core';
import { NO_ARROW_REASON } from './connect.js';

type Pipeline = pipeline.Pipeline;
type Gate = pipeline.Gate;
type CheckType = 'checks' | 'diff size';

const CHECK_TYPES: readonly CheckType[] = ['checks', 'diff size'];

export const GATE_EXISTS_REASON =
  'This arrow already has a gate. An arrow holds one gate: remove the existing gate first.';

// The values as the form holds them: text for the description, the type and the threshold. A blank threshold
// is no threshold.
export type GateRequest =
  | { readonly kind: 'approval'; readonly description: string }
  | {
      readonly kind: 'check';
      readonly description: string;
      readonly type: string;
      readonly threshold: string;
    };

export type GateResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// The parser's field names, as the refusal shows them.
const FIELD_LABELS: Readonly<Record<string, string>> = {
  kind: 'Kind',
  description: 'Description',
  type: 'Type',
  threshold: 'Threshold',
};

// Adds a gate to the arrow that starts at `sourceId`. A refusal names its reason and leaves the pipeline as it
// was: no arrow, a second gate on the arrow (AC-019), or a value the parser refuses (AC-017, AC-018).
export function addGate(config: Pipeline, sourceId: string, request: GateRequest): GateResult {
  const index = config.flows.findIndex((flow) => flow.id === sourceId);
  const link = config.flows[index]?.connectedTo;
  if (link === undefined) {
    return { ok: false, reason: NO_ARROW_REASON };
  }
  if (link.gate !== undefined) {
    return { ok: false, reason: GATE_EXISTS_REASON };
  }
  const gatePath = `pipeline.flows[${index}].connectedTo.gate`;
  // `rules` is empty on purpose: a gate does not use rules, and the candidate is not a saved config.
  // Only problems at the gate path refuse the gate; a problem elsewhere in the pipeline is for the Analyze step.
  const candidate = {
    schemaVersion: 2,
    rules: [],
    pipeline: {
      ...config,
      flows: config.flows.map((flow, i) =>
        i === index ? { ...flow, connectedTo: { ...link, gate: rawGate(request) } } : flow,
      ),
    },
  };
  const parsed = pipeline.parseProjectConfig(candidate);
  if (!parsed.ok) {
    const problem = parsed.problems.find(
      (found) => found.path === gatePath || found.path.startsWith(`${gatePath}.`),
    );
    if (problem !== undefined) {
      const key = problem.path.slice(gatePath.length + 1);
      const label = FIELD_LABELS[key] ?? 'Gate';
      return { ok: false, reason: `${label} ${problem.message}.` };
    }
  }
  const gate = typedGate(request);
  const flows = config.flows.map((flow, i) =>
    i === index ? { ...flow, connectedTo: { ...link, gate } } : flow,
  );
  return { ok: true, pipeline: { ...config, flows } };
}

// The gate as the parser reads it. A threshold is a number when its text is digits, and otherwise the text itself,
// which the parser refuses with its own message.
function rawGate(request: GateRequest): Record<string, unknown> {
  if (request.kind === 'approval') {
    return { kind: 'approval', description: request.description };
  }
  const threshold = rawThreshold(request.threshold);
  return {
    kind: 'check',
    description: request.description,
    type: request.type,
    ...(threshold === undefined ? {} : { threshold }),
  };
}

// Blank is no threshold. Surrounding spaces are not part of the value (' 3' is 3). Only plain digits are a number:
// '1e3', '1.5' and '-2' stay text and are refused by the parser.
function rawThreshold(text: string): number | string | undefined {
  const value = text.trim();
  if (value === '') {
    return undefined;
  }
  return /^\d+$/.test(value) ? Number(value) : value;
}

function typedThreshold(text: string): number | undefined {
  const value = rawThreshold(text);
  if (typeof value === 'string') {
    throw new Error('The parser accepted a threshold that is not a whole number.');
  }
  return value;
}

// The typed gate for a value the parser has accepted. The throws are programmer errors: the parser refuses these
// values before this is reached (see addGate).
function typedGate(request: GateRequest): Gate {
  if (request.kind === 'approval') {
    return { kind: 'approval', description: request.description };
  }
  const type = CHECK_TYPES.find((option) => option === request.type);
  if (type === undefined) {
    throw new Error('The parser accepted a check type that is not checks or diff size.');
  }
  const threshold = typedThreshold(request.threshold);
  return {
    kind: 'check',
    description: request.description,
    type,
    ...(threshold === undefined ? {} : { threshold }),
  };
}
