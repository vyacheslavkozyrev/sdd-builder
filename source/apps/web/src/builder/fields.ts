// The flow field edits of the Flow panel (F-11 AC-020 to AC-023, AC-028). An edit is applied to a copy
// of the config, and the parser (`parseProjectConfig` in core) decides. A refused edit leaves the saved
// pipeline as it was and returns the parser's reason. Pure functions: no React and no I/O.

import { pipeline } from '@sddbuilder/core';

export type Pipeline = pipeline.Pipeline;
export type Flow = pipeline.Flow;
export type Model = pipeline.Model;
export type Rule = pipeline.Rule;
export type Problem = pipeline.Problem;

// One field edit of a flow. A model of `undefined` unsets the model (AC-023); any other model text is
// given to the parser, which refuses it.
export type FlowFieldEdit =
  | { readonly field: 'name'; readonly value: string }
  | { readonly field: 'description'; readonly value: string }
  | { readonly field: 'body'; readonly value: string }
  | { readonly field: 'model'; readonly value: string | undefined };

export type FlowFieldResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: FlowFieldEdit['field']; readonly reason: string };

// The models the parser accepts. The keys are the type `Model`, so a model added to core must be added
// here too, and TypeScript reports the gap.
const MODEL_NAMES: Record<Model, true> = { haiku: true, sonnet: true, opus: true, inherit: true };

function isModel(value: string): value is Model {
  return Object.hasOwn(MODEL_NAMES, value);
}

// The problems the parser finds in a pipeline. A pipeline that parses gives none.
function problemsOf(pipelineValue: unknown, rules: readonly Rule[]): readonly Problem[] {
  const result = pipeline.parseProjectConfig({ schemaVersion: 2, rules, pipeline: pipelineValue });
  return result.ok ? [] : result.problems;
}

function problemKey(problem: Problem): string {
  return `${problem.path}\n${problem.message}`;
}

// The flow as the document holds it, with the edit applied when given. The model's `index` is not a
// document key, so it is left out; an unset value is left out of the document too.
function documentFlow(flow: Flow, edit: FlowFieldEdit | undefined): Record<string, unknown> {
  const document: Record<string, unknown> = { ...flow };
  delete document.index;
  if (edit !== undefined) {
    if (edit.value === undefined) {
      delete document[edit.field];
    } else {
      document[edit.field] = edit.value;
    }
  }
  return document;
}

// The pipeline as the document holds it. `changed` names the flow position that carries the edit.
function documentPipeline(
  pipelineState: Pipeline,
  changed: { readonly position: number; readonly edit: FlowFieldEdit } | undefined,
): unknown {
  return {
    ...pipelineState,
    flows: pipelineState.flows.map((flow, index) =>
      documentFlow(flow, changed?.position === index ? changed.edit : undefined),
    ),
  };
}

// The typed flow after an accepted edit. The parser has already accepted the value, so a model that is
// not a `Model` here is a programmer error, not user input.
function editedFlow(flow: Flow, edit: FlowFieldEdit): Flow {
  switch (edit.field) {
    case 'name':
      return { ...flow, name: edit.value };
    case 'description':
      return { ...flow, description: edit.value };
    case 'body':
      return { ...flow, body: edit.value };
    case 'model': {
      if (edit.value === undefined) {
        const { model: _unset, ...rest } = flow;
        return rest;
      }
      if (!isModel(edit.value)) {
        throw new Error(`F-11: the parser accepted the model "${edit.value}", which is not a model`);
      }
      return { ...flow, model: edit.value };
    }
  }
}

// Applies one field edit to the flow `flowId`. The name is trimmed first (AC-020); the other values
// are kept as written. The parser checks the copy. The edit is refused when the copy has a problem at
// the edited field, or a problem that the saved pipeline did not have (a duplicate name is reported at
// the other flow, so it is found this way). A flow that is not connected yet is not refused by an edit
// of its name, because that problem was already there.
export function editFlowField(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  edit: FlowFieldEdit,
): FlowFieldResult {
  const position = pipelineState.flows.findIndex((flow) => flow.id === flowId);
  const flow = pipelineState.flows[position];
  if (flow === undefined) {
    throw new Error(`F-11: the pipeline has no flow "${flowId}"`);
  }
  const prepared: FlowFieldEdit = edit.field === 'name' ? { field: 'name', value: edit.value.trim() } : edit;

  const before = new Set(problemsOf(documentPipeline(pipelineState, undefined), rules).map(problemKey));
  const fieldPath = `pipeline.flows.${position}.${prepared.field}`;
  const copy = documentPipeline(pipelineState, { position, edit: prepared });
  const refusals = problemsOf(copy, rules).filter(
    (problem) => problem.path === fieldPath || !before.has(problemKey(problem)),
  );
  const reason = refusals.find((problem) => problem.path === fieldPath) ?? refusals[0];
  if (reason !== undefined) {
    return { ok: false, field: prepared.field, reason: reason.message };
  }

  return {
    ok: true,
    pipeline: {
      ...pipelineState,
      flows: pipelineState.flows.map((item, index) => (index === position ? editedFlow(flow, prepared) : item)),
    },
  };
}
