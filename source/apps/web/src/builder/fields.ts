// Field edits on the Pipeline and flow panels (F-11 AC-027 to AC-029). A pure function: it returns the new pipeline or a
// refusal with its reason, and never changes the pipeline it is given. An edit is applied only when the candidate
// pipeline passes `pipeline.parseProjectConfig` with no problem at the edited field, so the refusal text is the
// parser's message and matches the Analyze step. The one rule the parser does not have is the flow name's uniqueness,
// which is checked here (owner decision, 2026-11-17). A flow's id is never changed by an edit.

import { pipeline } from '@sddbuilder/core';

type Pipeline = pipeline.Pipeline;
type Argument = pipeline.Argument;
type Id = pipeline.Id;
type Model = pipeline.Model;

export type PipelineEdit =
  | { readonly field: 'name'; readonly value: string }
  | { readonly field: 'description'; readonly value: string }
  | { readonly field: 'arguments'; readonly value: Argument[] }
  | { readonly field: 'model'; readonly value: Model | undefined }
  | { readonly field: 'tools'; readonly value: string[] | undefined }
  | { readonly field: 'ruleTags'; readonly value: Id[] | undefined }
  | { readonly field: 'body'; readonly value: string | undefined };

export type FlowEdit =
  | { readonly field: 'name'; readonly value: string }
  | { readonly field: 'description'; readonly value: string }
  | { readonly field: 'arguments'; readonly value: string }
  | { readonly field: 'model'; readonly value: Model | undefined }
  | { readonly field: 'body'; readonly value: string | undefined };

export type FieldResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

export const NAME_TAKEN_REASON = "Name must be unique among the flows' names.";

// The panel's label for each field, as a refusal shows it.
const LABELS: Readonly<Record<PipelineEdit['field'], string>> = {
  name: 'Name',
  description: 'Description',
  arguments: 'Arguments',
  model: 'Model',
  tools: 'Tools',
  ruleTags: 'Rule tags',
  body: 'Body',
};

// Applies an edit to the pipeline's own field. `undefined` removes an optional field.
export function applyPipelineField(config: Pipeline, edit: PipelineEdit): FieldResult {
  const candidate = replaceKey(config, edit.field, edit.value);
  return checkCandidate(candidate, `pipeline.${edit.field}`, LABELS[edit.field]);
}

// Applies an edit to a flow's field. The flow is found by its id, which the edit never changes. An unknown flow id is a
// programmer error and throws, as typescript.md gives for an unknown id: the panel only opens on a flow in the pipeline.
export function applyFlowField(config: Pipeline, flowId: string, edit: FlowEdit): FieldResult {
  const index = config.flows.findIndex((flow) => flow.id === flowId);
  const flow = config.flows[index];
  if (flow === undefined) {
    throw new Error(`The pipeline has no flow with the id ${flowId}.`);
  }
  const candidate: Pipeline = {
    ...config,
    flows: config.flows.map((other, i) => (i === index ? replaceKey(flow, edit.field, edit.value) : other)),
  };
  const result = checkCandidate(candidate, `pipeline.flows[${index}].${edit.field}`, LABELS[edit.field]);
  if (!result.ok || edit.field !== 'name') {
    return result;
  }
  // Names clash after trimming, as the blank check trims, so two names that look the same on the Map clash. The
  // comparison is case-sensitive: the file name comes from the id, so a case difference is not a file clash.
  const taken = config.flows.some((other, i) => i !== index && other.name.trim() === edit.value.trim());
  return taken ? { ok: false, reason: NAME_TAKEN_REASON } : result;
}

// Parses the candidate as a whole config. A problem at the edited field (its path, or a path inside it) refuses the
// edit with the parser's message; a problem anywhere else does not, because it is not this edit's to report.
function checkCandidate(candidate: Pipeline, fieldPath: string, label: string): FieldResult {
  // `rules` is empty on purpose: the candidate is not a saved config, and rule tags are checked by the analyzer.
  const parsed = pipeline.parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: candidate });
  if (!parsed.ok) {
    const problem = parsed.problems.find((found) => namesField(found.path, fieldPath));
    if (problem !== undefined) {
      const inside = problem.path.slice(fieldPath.length).replace(/^\./, '');
      const at = inside === '' ? '' : ` at ${inside}`;
      return { ok: false, reason: `${label}${at} ${problem.message}.` };
    }
  }
  return { ok: true, pipeline: candidate };
}

function namesField(path: string, fieldPath: string): boolean {
  return path === fieldPath || path.startsWith(`${fieldPath}.`) || path.startsWith(`${fieldPath}[`);
}

// A copy of the object with one key set. `undefined` removes the key, so an optional field is absent, not undefined.
function replaceKey<T extends object>(object: T, key: string, value: unknown): T {
  const copy = { ...object } as Record<string, unknown>;
  if (value === undefined) {
    delete copy[key];
  } else {
    copy[key] = value;
  }
  return copy as T;
}
