// The flow field edits of the Flow panel (F-11 AC-020 to AC-023, AC-028), the Human approval flag (F-11
// AC-027), the flow's argument and rule tag rows (F-11 AC-024, AC-026) and its outcome artifact rows
// (F-11 AC-025). The same row and refusal helpers serve the pipeline's own lists (pipelineFields.ts), so a
// list is changed in one place. An edit is applied to a copy of the config, and the parser (`parseProjectConfig`
// in core) decides. A refused edit leaves the saved pipeline as it was and returns the parser's reason. Pure
// functions: no React and no I/O.

import { pipeline } from '@sddbuilder/core';

export type Pipeline = pipeline.Pipeline;
export type Flow = pipeline.Flow;
export type Model = pipeline.Model;
export type Rule = pipeline.Rule;
export type Problem = pipeline.Problem;
export type Artifact = pipeline.Artifact;
export type Argument = pipeline.Argument;
type RuleTag = pipeline.RuleTag;

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

// One argument row as the user types it (AC-024). Its place in the list is its position.
export interface ArgumentRow {
  readonly id: string;
  readonly required: boolean;
  readonly hint: string;
}

// The result of a row edit: the new pipeline, or the parser's reason for the row that was refused.
export type RowResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// Whose lists an edit changes: the pipeline's own lists (`'pipeline'`), or the lists of the flow at a position.
type Holder = 'pipeline' | number;

// The models the parser accepts. The keys are the type `Model`, so a model added to core must be added
// here too, and TypeScript reports the gap.
const MODEL_NAMES: Record<Model, true> = { haiku: true, sonnet: true, opus: true, inherit: true };

export function isModel(value: string): value is Model {
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

// A change to the document form of the holder: the pipeline's own document, or one flow's.
type DocumentChange = (document: Record<string, unknown>) => Record<string, unknown>;

// The pipeline as the document holds it, with `change` applied to the holder's document.
function documentWith(pipelineState: Pipeline, holder: Holder, change: DocumentChange): unknown {
  const document = toDocument(pipelineState) as Record<string, unknown>;
  if (holder === 'pipeline') return change(document);
  const flows = document.flows as Record<string, unknown>[];
  return { ...document, flows: flows.map((flow, index) => (index === holder ? change(flow) : flow)) };
}

// The change that sets a field of the document, or unsets it when the value is undefined.
export function fieldChange(field: string, value: unknown): DocumentChange {
  return (document) => {
    const next = { ...document };
    if (value === undefined) {
      delete next[field];
    } else {
      next[field] = value;
    }
    return next;
  };
}

function isUnder(path: string, placePath: string): boolean {
  return path === placePath || path.startsWith(`${placePath}.`);
}

// The parser's problem for an edit, or undefined when the edit is accepted. The problems the saved pipeline
// already had are left out, so an edit is refused only for what it causes. A problem at the edited value
// (`placePath`, or under it) is the problem when there is one; otherwise the first new problem is.
function refusalProblemOf(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  holder: Holder,
  change: DocumentChange,
  placePath: string,
): Problem | undefined {
  const before = new Set(problemsOf(toDocument(pipelineState), rules).map(problemKey));
  const refusals = problemsOf(documentWith(pipelineState, holder, change), rules).filter(
    (problem) => isUnder(problem.path, placePath) || !before.has(problemKey(problem)),
  );
  return refusals.find((problem) => isUnder(problem.path, placePath)) ?? refusals[0];
}

// The parser's reason for an edit, or undefined when the edit is accepted.
export function refusalOf(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  holder: Holder,
  change: DocumentChange,
  placePath: string,
): string | undefined {
  return refusalProblemOf(pipelineState, rules, holder, change, placePath)?.message;
}

// The position of the flow `flowId`, or a programmer error when the pipeline has no such flow.
function positionOf(pipelineState: Pipeline, flowId: string): number {
  const position = pipelineState.flows.findIndex((flow) => flow.id === flowId);
  if (position === -1) {
    throw new Error(`F-11: the pipeline has no flow "${flowId}"`);
  }
  return position;
}

// The flow at `position`, or a programmer error when there is none.
function flowIn(pipelineState: Pipeline, position: number): Flow {
  const flow = pipelineState.flows[position];
  if (flow === undefined) {
    throw new Error(`F-11: the pipeline has no flow at position ${position}`);
  }
  return flow;
}

// The name of the holder in a programmer-error message: "the pipeline" or "the flow "plan"".
function holderName(pipelineState: Pipeline, holder: Holder): string {
  return holder === 'pipeline' ? 'the pipeline' : `the flow "${flowIn(pipelineState, holder).id}"`;
}

function withFlow(pipelineState: Pipeline, position: number, flow: Flow): Pipeline {
  return { ...pipelineState, flows: pipelineState.flows.map((item, index) => (index === position ? flow : item)) };
}

// The list with its positions renumbered, so every row's index is its position again.
function renumber<T extends { readonly index: number }>(rows: readonly T[]): T[] {
  return rows.map((row, index) => ({ ...row, index }));
}

// The path of a row of a holder's list, as the parser names it.
function rowPath(holder: Holder, key: 'arguments' | 'artifacts' | 'ruleTags', rowPosition: number): string {
  return `${holderPath(holder)}.${key}.${rowPosition}`;
}

function holderPath(holder: Holder): string {
  return holder === 'pipeline' ? 'pipeline' : `pipeline.flows.${holder}`;
}

function argumentDocument(row: ArgumentRow): Record<string, unknown> {
  return { id: row.id, required: row.required, hint: row.hint };
}

function argumentsOf(pipelineState: Pipeline, holder: Holder): readonly Argument[] {
  return holder === 'pipeline' ? pipelineState.arguments : flowIn(pipelineState, holder).arguments;
}

function withArguments(pipelineState: Pipeline, holder: Holder, rows: readonly Argument[]): Pipeline {
  if (holder === 'pipeline') return { ...pipelineState, arguments: rows };
  return withFlow(pipelineState, holder, { ...flowIn(pipelineState, holder), arguments: rows });
}

function ruleTagsOf(pipelineState: Pipeline, holder: Holder): readonly RuleTag[] {
  const tags = holder === 'pipeline' ? pipelineState.ruleTags : flowIn(pipelineState, holder).ruleTags;
  return tags ?? [];
}

function withRuleTags(pipelineState: Pipeline, holder: Holder, tags: readonly RuleTag[]): Pipeline {
  if (holder === 'pipeline') return { ...pipelineState, ruleTags: tags };
  return withFlow(pipelineState, holder, { ...flowIn(pipelineState, holder), ruleTags: tags });
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
  const position = positionOf(pipelineState, flowId);
  const flow = flowIn(pipelineState, position);
  const prepared: FlowFieldEdit = edit.field === 'name' ? { field: 'name', value: edit.value.trim() } : edit;

  const reason = refusalOf(
    pipelineState,
    rules,
    position,
    fieldChange(prepared.field, prepared.value),
    `${holderPath(position)}.${prepared.field}`,
  );
  if (reason !== undefined) {
    return { ok: false, field: prepared.field, reason };
  }

  return { ok: true, pipeline: withFlow(pipelineState, position, editedFlow(flow, prepared)) };
}

// Sets the Human approval flag of the flow `flowId` to `approval` (AC-027). The flag is a checkbox, so it
// changes only the flow's `approval` value: every other field of the flow and of the pipeline is kept as it
// was. The edit goes through the parser like every field edit (AC-028), and its refusal is the parser's reason.
export function setFlowApproval(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  approval: boolean,
): RowResult {
  const position = positionOf(pipelineState, flowId);
  const flow = flowIn(pipelineState, position);
  const reason = refusalOf(
    pipelineState,
    rules,
    position,
    (document) => ({ ...document, approval }),
    `${holderPath(position)}.approval`,
  );
  if (reason !== undefined) return { ok: false, reason };

  return { ok: true, pipeline: withFlow(pipelineState, position, { ...flow, approval }) };
}

// Appends an argument row to the holder's list (AC-024, AC-043). The parser decides whether the row is valid:
// a file-safe id unique in the pipeline, a required flag and a hint of at most 100 characters. A refused row
// is not added and the reason is the parser's message for the row.
export function addArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  holder: Holder,
  row: ArgumentRow,
): RowResult {
  const rows = argumentsOf(pipelineState, holder);
  const rowPosition = rows.length;
  const reason = refusalOf(
    pipelineState,
    rules,
    holder,
    (document) => ({ ...document, arguments: [...rows.map(toDocument), argumentDocument(row)] }),
    rowPath(holder, 'arguments', rowPosition),
  );
  if (reason !== undefined) return { ok: false, reason };

  return { ok: true, pipeline: withArguments(pipelineState, holder, [...rows, { index: rowPosition, ...row }]) };
}

// Replaces the argument row at `rowPosition` of the holder's list (AC-024, AC-043). A refused edit keeps the
// saved row, and the reason is the parser's message for that row.
export function editArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  holder: Holder,
  rowPosition: number,
  row: ArgumentRow,
): RowResult {
  const rows = argumentsOf(pipelineState, holder);
  if (rows[rowPosition] === undefined) {
    throw new Error(`F-11: ${holderName(pipelineState, holder)} has no argument row ${rowPosition}`);
  }
  const reason = refusalOf(
    pipelineState,
    rules,
    holder,
    (document) => ({
      ...document,
      arguments: rows.map((item, index) => (index === rowPosition ? argumentDocument(row) : toDocument(item))),
    }),
    rowPath(holder, 'arguments', rowPosition),
  );
  if (reason !== undefined) return { ok: false, reason };

  const next = rows.map((item, index) => (index === rowPosition ? { index, ...row } : item));
  return { ok: true, pipeline: withArguments(pipelineState, holder, next) };
}

// Removes the argument row at `rowPosition` of the holder's list (AC-024, AC-043). Removing a row cannot make
// the pipeline invalid, so it is not refused; the rows after it are renumbered.
export function removeArgument(pipelineState: Pipeline, holder: Holder, rowPosition: number): Pipeline {
  const rows = argumentsOf(pipelineState, holder);
  if (rows[rowPosition] === undefined) {
    throw new Error(`F-11: ${holderName(pipelineState, holder)} has no argument row ${rowPosition}`);
  }
  return withArguments(pipelineState, holder, renumber(rows.filter((_item, index) => index !== rowPosition)));
}

// Adds the rule tag `ruleId` to the holder's tags (AC-026). `rules` are the rules of the Technical
// details step. A tag that names no rule of them, or that the list already has, is refused with the parser's
// wording, and a refused tag is not stored.
export function addRuleTag(pipelineState: Pipeline, rules: readonly Rule[], holder: Holder, ruleId: string): RowResult {
  const tags = ruleTagsOf(pipelineState, holder);
  const reason = refusalOf(
    pipelineState,
    rules,
    holder,
    (document) => ({ ...document, ruleTags: [...tags.map((tag) => tag.ruleId), ruleId] }),
    rowPath(holder, 'ruleTags', tags.length),
  );
  if (reason !== undefined) return { ok: false, reason };

  return { ok: true, pipeline: withRuleTags(pipelineState, holder, [...tags, { index: tags.length, ruleId }]) };
}

// Removes the rule tag at `rowPosition` of the holder's tags (AC-026). The tags after it are renumbered.
export function removeRuleTag(pipelineState: Pipeline, holder: Holder, rowPosition: number): Pipeline {
  const tags = ruleTagsOf(pipelineState, holder);
  if (tags[rowPosition] === undefined) {
    throw new Error(`F-11: ${holderName(pipelineState, holder)} has no rule tag row ${rowPosition}`);
  }
  return withRuleTags(pipelineState, holder, renumber(tags.filter((_tag, index) => index !== rowPosition)));
}

// Appends an argument row to the flow `flowId` (AC-024). The refusal and the row rules are those of addArgument.
export function addFlowArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  row: ArgumentRow,
): RowResult {
  return addArgument(pipelineState, rules, positionOf(pipelineState, flowId), row);
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
  return editArgument(pipelineState, rules, positionOf(pipelineState, flowId), rowPosition, row);
}

// Removes the argument row at `rowPosition` of the flow `flowId` (AC-024).
export function removeFlowArgument(pipelineState: Pipeline, flowId: string, rowPosition: number): Pipeline {
  return removeArgument(pipelineState, positionOf(pipelineState, flowId), rowPosition);
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
  return addRuleTag(pipelineState, rules, positionOf(pipelineState, flowId), ruleId);
}

// Removes the rule tag at `rowPosition` of the flow `flowId` (AC-026).
export function removeFlowRuleTag(pipelineState: Pipeline, flowId: string, rowPosition: number): Pipeline {
  return removeRuleTag(pipelineState, positionOf(pipelineState, flowId), rowPosition);
}

// One outcome artifact as the user types it (AC-025). Its place in the flow's list is its position.
export interface ArtifactRow {
  readonly label: string;
  readonly template: string;
}

// One field edit of an artifact row: its label or its template.
export type ArtifactEdit = { readonly field: ArtifactField; readonly value: string };

export type ArtifactField = 'label' | 'template';

// The result of an artifact add or edit: the new pipeline, or the field that was refused with the parser's
// reason. The field is the one the reason is shown beneath (AC-025).
export type ArtifactResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: ArtifactField; readonly reason: string };

function artifactDocument(artifact: Artifact | ArtifactRow): Record<string, unknown> {
  return { label: artifact.label, template: artifact.template };
}

// The artifact with one field replaced by the edit's value.
function artifactWith(artifact: Artifact, edit: ArtifactEdit): Artifact {
  return edit.field === 'label'
    ? { label: edit.value, template: artifact.template }
    : { label: artifact.label, template: edit.value };
}

// The field the refusal belongs to: the template when the parser's problem is at the template, otherwise
// the label (a problem with another artifact's label is shown at the label of the edited row).
function refusedField(problem: Problem, rowPathValue: string): ArtifactField {
  return isUnder(problem.path, `${rowPathValue}.template`) ? 'template' : 'label';
}

// Appends an artifact to the flow `flowId` (AC-025). The label is required, one line and not blank; the
// template may be empty and is at most 5000 characters. The parser decides; a refused artifact is not
// added, and the reason is the parser's message for the field it belongs to.
export function addFlowArtifact(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  row: ArtifactRow,
): ArtifactResult {
  const position = positionOf(pipelineState, flowId);
  const flow = flowIn(pipelineState, position);
  const rowPosition = flow.artifacts.length;
  const placePath = rowPath(position, 'artifacts', rowPosition);
  const problem = refusalProblemOf(
    pipelineState,
    rules,
    position,
    (document) => ({
      ...document,
      artifacts: [...flow.artifacts.map(artifactDocument), artifactDocument(row)],
    }),
    placePath,
  );
  if (problem !== undefined) {
    return { ok: false, field: refusedField(problem, placePath), reason: problem.message };
  }

  const artifacts = [...flow.artifacts, { label: row.label, template: row.template }];
  return { ok: true, pipeline: withFlow(pipelineState, position, { ...flow, artifacts }) };
}

// Replaces one field of the artifact at `rowPosition` of the flow `flowId` (AC-025). A refused edit keeps
// the saved values, and the reason is the parser's message for the field the edit changed.
export function editFlowArtifact(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  rowPosition: number,
  edit: ArtifactEdit,
): ArtifactResult {
  const position = positionOf(pipelineState, flowId);
  const flow = flowIn(pipelineState, position);
  if (flow.artifacts[rowPosition] === undefined) {
    throw new Error(`F-11: the flow "${flowId}" has no artifact row ${rowPosition}`);
  }
  const placePath = rowPath(position, 'artifacts', rowPosition);
  const editedPath = `${placePath}.${edit.field}`;
  const problem = refusalProblemOf(
    pipelineState,
    rules,
    position,
    (document) => ({
      ...document,
      artifacts: flow.artifacts.map((item, index) =>
        index === rowPosition ? artifactDocument(artifactWith(item, edit)) : artifactDocument(item),
      ),
    }),
    editedPath,
  );
  if (problem !== undefined) {
    return { ok: false, field: refusedField(problem, placePath), reason: problem.message };
  }

  const artifacts = flow.artifacts.map((item, index) => (index === rowPosition ? artifactWith(item, edit) : item));
  return { ok: true, pipeline: withFlow(pipelineState, position, { ...flow, artifacts }) };
}

// The blocks with each End block that named `removedLabel` set to `replacement` (AC-025, amendment 2026-11-22).
// The copy the parser checks and the saved flow both take their blocks from here, so the two cannot differ.
function endsMoved<B extends { readonly kind: string; readonly producedArtifact?: string }>(
  blocks: readonly B[],
  removedLabel: string,
  replacement: string,
): B[] {
  return blocks.map((block) =>
    block.kind === 'end' && block.producedArtifact === removedLabel ? { ...block, producedArtifact: replacement } : block,
  );
}

// The change that removes the artifact named `removedLabel` from the flow. Each End block of the flow that named
// it is set to the first remaining artifact. When no artifact remains, the ends are left as they are, so the
// parser refuses the removal with its own reason.
function removalChange(kept: readonly Artifact[], removedLabel: string): DocumentChange {
  return (document) => {
    const replacement = kept[0]?.label;
    const blocks = document.blocks as { readonly kind: string; readonly producedArtifact?: string }[];
    return {
      ...document,
      artifacts: kept.map(artifactDocument),
      blocks: replacement === undefined ? blocks : endsMoved(blocks, removedLabel, replacement),
    };
  };
}

// Removes the artifact at `rowPosition` of the flow `flowId` (AC-025). An artifact that an End block of the flow
// names can be removed when the flow has another artifact: each such End block is moved to the first remaining
// artifact (amendment 2026-11-22). When it is the flow's only artifact, the parser refuses the removal and the
// reason is its message. The artifacts after the removed one keep their order.
export function removeFlowArtifact(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  rowPosition: number,
): RowResult {
  const position = positionOf(pipelineState, flowId);
  const flow = flowIn(pipelineState, position);
  const removed = flow.artifacts[rowPosition];
  if (removed === undefined) {
    throw new Error(`F-11: the flow "${flowId}" has no artifact row ${rowPosition}`);
  }
  const kept = flow.artifacts.filter((_item, index) => index !== rowPosition);
  const reason = refusalOf(
    pipelineState,
    rules,
    position,
    removalChange(kept, removed.label),
    `${holderPath(position)}.artifacts`,
  );
  if (reason !== undefined) return { ok: false, reason };

  const replacement = kept[0]?.label;
  const blocks = replacement === undefined ? flow.blocks : endsMoved(flow.blocks, removed.label, replacement);
  return { ok: true, pipeline: withFlow(pipelineState, position, { ...flow, artifacts: kept, blocks }) };
}
