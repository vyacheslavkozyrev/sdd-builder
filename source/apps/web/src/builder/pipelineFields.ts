// The pipeline-level fields of the Pipeline panel (F-11 AC-043 to AC-045, AC-028): name, description, model,
// tools, body, and the pipeline's own argument and rule tag rows. Every edit goes through the parser
// (`parseProjectConfig` in core), as the flow edits do in fields.ts, and the row and refusal helpers are
// those of fields.ts. A refused edit keeps the saved pipeline and returns the parser's reason for the field.
// Pure functions: no React and no I/O.

import {
  addArgument,
  addRuleTag,
  editArgument,
  fieldChange,
  isModel,
  refusalOf,
  removeArgument,
  removeRuleTag,
  type ArgumentRow,
  type Pipeline,
  type Rule,
  type RowResult,
} from './fields.js';

// The pipeline's fields that a text or choice edit changes.
export type PipelineField = 'name' | 'description' | 'body' | 'model' | 'tools';

// One field edit of the pipeline. The tools are given as the user types them: a comma-separated list.
// A model of `undefined` unsets the model; any other model text is given to the parser, which refuses it.
export type PipelineFieldEdit =
  | { readonly field: 'name'; readonly value: string }
  | { readonly field: 'description'; readonly value: string }
  | { readonly field: 'body'; readonly value: string }
  | { readonly field: 'model'; readonly value: string | undefined }
  | { readonly field: 'tools'; readonly value: string };

export type PipelineFieldResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: PipelineField; readonly reason: string };

// The edit as the parser checks it: the name is trimmed (AC-020 rule, as for a flow) and the tools are a list.
type PreparedEdit =
  | { readonly field: 'name'; readonly value: string }
  | { readonly field: 'description'; readonly value: string }
  | { readonly field: 'body'; readonly value: string }
  | { readonly field: 'model'; readonly value: string | undefined }
  | { readonly field: 'tools'; readonly value: readonly string[] };

// The tools as typed: items separated by commas. Each item is trimmed and an empty item is left out; the
// parser checks each remaining item (AC-045).
function toolsOf(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function prepare(edit: PipelineFieldEdit): PreparedEdit {
  switch (edit.field) {
    case 'name':
      return { field: 'name', value: edit.value.trim() };
    case 'tools':
      return { field: 'tools', value: toolsOf(edit.value) };
    default:
      return edit;
  }
}

// The typed pipeline after an accepted edit. The parser has already accepted the value, so a model that is
// not a `Model` here is a programmer error, not user input.
function editedPipeline(pipelineState: Pipeline, edit: PreparedEdit): Pipeline {
  switch (edit.field) {
    case 'name':
      return { ...pipelineState, name: edit.value };
    case 'description':
      return { ...pipelineState, description: edit.value };
    case 'body':
      return { ...pipelineState, body: edit.value };
    case 'tools':
      return { ...pipelineState, tools: [...edit.value] };
    case 'model': {
      if (edit.value === undefined) {
        const { model: _unset, ...rest } = pipelineState;
        return rest;
      }
      if (!isModel(edit.value)) {
        throw new Error(`F-11: the parser accepted the model "${edit.value}", which is not a model`);
      }
      return { ...pipelineState, model: edit.value };
    }
  }
}

// Applies one field edit to the pipeline. The parser checks a copy of it; the edit is refused only when the copy
// has a problem at the edited field, and the reason is the parser's. A problem elsewhere in the pipeline does not
// refuse it: the text typed is kept (F-16 AC-025). A refused edit returns no pipeline, so the saved value stays.
export function editPipelineField(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  edit: PipelineFieldEdit,
): PipelineFieldResult {
  const prepared = prepare(edit);
  const reason = refusalOf(
    pipelineState,
    rules,
    'pipeline',
    fieldChange(prepared.field, prepared.value),
    `pipeline.${prepared.field}`,
    'field',
  );
  if (reason !== undefined) {
    return { ok: false, field: prepared.field, reason };
  }
  return { ok: true, pipeline: editedPipeline(pipelineState, prepared) };
}

// Appends an argument row to the pipeline's own arguments (AC-043): the same rules as a flow's rows.
export function addPipelineArgument(pipelineState: Pipeline, rules: readonly Rule[], row: ArgumentRow): RowResult {
  return addArgument(pipelineState, rules, 'pipeline', row);
}

// Replaces the argument row at `rowPosition` of the pipeline (AC-043). A refused edit keeps the saved row.
export function editPipelineArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  rowPosition: number,
  row: ArgumentRow,
): RowResult {
  return editArgument(pipelineState, rules, 'pipeline', rowPosition, row);
}

// Removes the argument row at `rowPosition` of the pipeline (AC-043).
export function removePipelineArgument(pipelineState: Pipeline, rowPosition: number): Pipeline {
  return removeArgument(pipelineState, 'pipeline', rowPosition);
}

// Adds the rule tag `ruleId` to the pipeline (AC-026, AC-045). `rules` are the rules of the Technical details step;
// a tag that names no rule of them, or that the pipeline already has, is refused with the parser's wording.
export function addPipelineRuleTag(pipelineState: Pipeline, rules: readonly Rule[], ruleId: string): RowResult {
  return addRuleTag(pipelineState, rules, 'pipeline', ruleId);
}

// Removes the rule tag at `rowPosition` of the pipeline (AC-026).
export function removePipelineRuleTag(pipelineState: Pipeline, rowPosition: number): Pipeline {
  return removeRuleTag(pipelineState, 'pipeline', rowPosition);
}
