// The flow field edits of the Flow panel (F-11 AC-020 to AC-023, AC-028), and the flow's argument and
// rule tag rows (F-11 AC-024, AC-026). An edit is applied to a copy of the config, and the parser
// (`parseProjectConfig` in core) decides. A refused edit leaves the saved pipeline as it was and returns
// the parser's reason. Pure functions: no React and no I/O.

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

// One argument row as the user types it (AC-024). Its place in the flow's list is its position.
export interface ArgumentRow {
  readonly id: string;
  readonly required: boolean;
  readonly hint: string;
}

// The result of a row edit: the new pipeline, or the parser's reason for the row that was refused.
export type RowResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// The models the parser accepts. The keys are the type `Model`, so a model added to core must be added
// here too, and TypeScript reports the gap.
const MODEL_NAMES: Record<Model, true> = { haiku: true, sonnet: true, opus: true, inherit: true };

function isModel(value: string): value is Model {
  return Object.hasOwn(MODEL_NAMES, value);
}

// The document form of a value. Each row's `index` is its position, not a document key, so it is left out
// at every level; an unset value is left out too; a rule tag is written as its rule id, which is the form
// the document holds.
function toDocument(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toDocument);
  if (typeof value !== 'object' || value === null) return value;
  const document: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'index' || item === undefined) continue;
    document[key] = key === 'ruleTags' ? tagsToDocument(item) : toDocument(item);
  }
  return document;
}

function tagsToDocument(tags: unknown): unknown {
  if (!Array.isArray(tags)) return toDocument(tags);
  return tags.map((tag: unknown) => (typeof tag === 'object' && tag !== null && 'ruleId' in tag ? tag.ruleId : tag));
}

// The problems the parser finds in a pipeline. A pipeline that parses gives none.
function problemsOf(pipelineValue: unknown, rules: readonly Rule[]): readonly Problem[] {
  const result = pipeline.parseProjectConfig({ schemaVersion: 2, rules: toDocument(rules), pipeline: pipelineValue });
  return result.ok ? [] : result.problems;
}

function problemKey(problem: Problem): string {
  return `${problem.path}\n${problem.message}`;
}

// A change to the document form of one flow.
type FlowChange = (flow: Record<string, unknown>) => Record<string, unknown>;

// The pipeline as the document holds it. `changed` names the flow position that carries the change.
function documentPipeline(
  pipelineState: Pipeline,
  changed: { readonly position: number; readonly change: FlowChange } | undefined,
): unknown {
  return {
    ...(toDocument(pipelineState) as Record<string, unknown>),
    flows: pipelineState.flows.map((flow, index) => {
      const document = toDocument(flow) as Record<string, unknown>;
      return changed?.position === index ? changed.change(document) : document;
    }),
  };
}

// The change that sets a flow field, or unsets it when the value is undefined.
function fieldChange(edit: FlowFieldEdit): FlowChange {
  return (document) => {
    const next = { ...document };
    if (edit.value === undefined) {
      delete next[edit.field];
    } else {
      next[edit.field] = edit.value;
    }
    return next;
  };
}

function isUnder(path: string, placePath: string): boolean {
  return path === placePath || path.startsWith(`${placePath}.`);
}

// The parser's reason for an edit, or undefined when the edit is accepted. The problems the saved pipeline
// already had are left out, so an edit is refused only for what it causes. A problem at the edited value
// (`placePath`, or under it) is the reason when there is one; otherwise the first new problem is.
function refusalOf(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  changed: { readonly position: number; readonly change: FlowChange },
  placePath: string,
): string | undefined {
  const before = new Set(problemsOf(documentPipeline(pipelineState, undefined), rules).map(problemKey));
  const refusals = problemsOf(documentPipeline(pipelineState, changed), rules).filter(
    (problem) => isUnder(problem.path, placePath) || !before.has(problemKey(problem)),
  );
  const reason = refusals.find((problem) => isUnder(problem.path, placePath)) ?? refusals[0];
  return reason?.message;
}

// The flow `flowId` and its position, or a programmer error when the pipeline has no such flow.
function flowAt(pipelineState: Pipeline, flowId: string): { readonly position: number; readonly flow: Flow } {
  const position = pipelineState.flows.findIndex((flow) => flow.id === flowId);
  const flow = pipelineState.flows[position];
  if (flow === undefined) {
    throw new Error(`F-11: the pipeline has no flow "${flowId}"`);
  }
  return { position, flow };
}

function withFlow(pipelineState: Pipeline, position: number, flow: Flow): Pipeline {
  return { ...pipelineState, flows: pipelineState.flows.map((item, index) => (index === position ? flow : item)) };
}

// The flow's list with its positions renumbered, so every row's index is its position again.
function renumber<T extends { readonly index: number }>(rows: readonly T[]): T[] {
  return rows.map((row, index) => ({ ...row, index }));
}

function rowPath(position: number, key: 'arguments' | 'ruleTags', rowPosition: number): string {
  return `pipeline.flows.${position}.${key}.${rowPosition}`;
}

function argumentDocument(row: ArgumentRow): Record<string, unknown> {
  return { id: row.id, required: row.required, hint: row.hint };
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
  const { position, flow } = flowAt(pipelineState, flowId);
  const prepared: FlowFieldEdit = edit.field === 'name' ? { field: 'name', value: edit.value.trim() } : edit;

  const reason = refusalOf(
    pipelineState,
    rules,
    { position, change: fieldChange(prepared) },
    `pipeline.flows.${position}.${prepared.field}`,
  );
  if (reason !== undefined) {
    return { ok: false, field: prepared.field, reason };
  }

  return { ok: true, pipeline: withFlow(pipelineState, position, editedFlow(flow, prepared)) };
}

// Appends an argument row to the flow `flowId` (AC-024). The parser decides whether the row is valid:
// a file-safe id unique in the pipeline, a required flag and a hint of at most 100 characters. A refused
// row is not added and the reason is the parser's message for the row.
export function addFlowArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  row: ArgumentRow,
): RowResult {
  const { position, flow } = flowAt(pipelineState, flowId);
  const rowPosition = flow.arguments.length;
  const reason = refusalOf(
    pipelineState,
    rules,
    {
      position,
      change: (document) => ({
        ...document,
        arguments: [...flow.arguments.map(toDocument), argumentDocument(row)],
      }),
    },
    rowPath(position, 'arguments', rowPosition),
  );
  if (reason !== undefined) return { ok: false, reason };

  const rows = [...flow.arguments, { index: rowPosition, ...row }];
  return { ok: true, pipeline: withFlow(pipelineState, position, { ...flow, arguments: rows }) };
}

// Replaces the argument row at `rowPosition` of the flow `flowId` (AC-024). A refused edit keeps the saved
// row, and the reason is the parser's message for that row.
export function editFlowArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  rowPosition: number,
  row: ArgumentRow,
): RowResult {
  const { position, flow } = flowAt(pipelineState, flowId);
  if (flow.arguments[rowPosition] === undefined) {
    throw new Error(`F-11: the flow "${flowId}" has no argument row ${rowPosition}`);
  }
  const reason = refusalOf(
    pipelineState,
    rules,
    {
      position,
      change: (document) => ({
        ...document,
        arguments: flow.arguments.map((item, index) =>
          index === rowPosition ? argumentDocument(row) : toDocument(item),
        ),
      }),
    },
    rowPath(position, 'arguments', rowPosition),
  );
  if (reason !== undefined) return { ok: false, reason };

  const rows = flow.arguments.map((item, index) => (index === rowPosition ? { index, ...row } : item));
  return { ok: true, pipeline: withFlow(pipelineState, position, { ...flow, arguments: rows }) };
}

// Removes the argument row at `rowPosition` of the flow `flowId` (AC-024). Removing a row cannot make the
// pipeline invalid, so it is not refused; the rows after it are renumbered.
export function removeFlowArgument(pipelineState: Pipeline, flowId: string, rowPosition: number): Pipeline {
  const { position, flow } = flowAt(pipelineState, flowId);
  if (flow.arguments[rowPosition] === undefined) {
    throw new Error(`F-11: the flow "${flowId}" has no argument row ${rowPosition}`);
  }
  const rows = renumber(flow.arguments.filter((_item, index) => index !== rowPosition));
  return withFlow(pipelineState, position, { ...flow, arguments: rows });
}

// Adds the rule tag `ruleId` to the flow `flowId` (AC-026). `rules` are the rules of the Technical details
// step. A tag that names no rule of them, or that the flow already has, is refused with the parser's
// wording, and a refused tag is not stored.
export function addFlowRuleTag(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  ruleId: string,
): RowResult {
  const { position, flow } = flowAt(pipelineState, flowId);
  const tags = flow.ruleTags ?? [];
  const reason = refusalOf(
    pipelineState,
    rules,
    {
      position,
      change: (document) => ({ ...document, ruleTags: [...tags.map((tag) => tag.ruleId), ruleId] }),
    },
    rowPath(position, 'ruleTags', tags.length),
  );
  if (reason !== undefined) return { ok: false, reason };

  return {
    ok: true,
    pipeline: withFlow(pipelineState, position, { ...flow, ruleTags: [...tags, { index: tags.length, ruleId }] }),
  };
}

// Removes the rule tag at `rowPosition` of the flow `flowId` (AC-026). The tags after it are renumbered.
export function removeFlowRuleTag(pipelineState: Pipeline, flowId: string, rowPosition: number): Pipeline {
  const { position, flow } = flowAt(pipelineState, flowId);
  const tags = flow.ruleTags ?? [];
  if (tags[rowPosition] === undefined) {
    throw new Error(`F-11: the flow "${flowId}" has no rule tag row ${rowPosition}`);
  }
  const kept = renumber(tags.filter((_tag, index) => index !== rowPosition));
  return withFlow(pipelineState, position, { ...flow, ruleTags: kept });
}
