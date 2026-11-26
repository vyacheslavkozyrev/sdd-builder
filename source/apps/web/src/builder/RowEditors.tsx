import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type { FocusEventHandler, KeyboardEvent, ReactNode } from 'react';
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography, useTheme } from '@mui/material';
import type { pipeline as core } from '@sddbuilder/core';
import {
  addFlowArgument,
  addFlowArtifact,
  addFlowRuleTag,
  editFlowArgument,
  editFlowArtifact,
  removeFlowArgument,
  removeFlowArtifact,
  removeFlowRuleTag,
} from './fields.js';
import type {
  Argument,
  ArgumentRow,
  ArtifactField,
  ArtifactRow,
  Flow,
  Pipeline,
  Rule,
  RowResult,
} from './fields.js';
import {
  addAgentArgument,
  addAgentRuleTag,
  editAgentArgument,
  removeAgentArgument,
  removeAgentRuleTag,
} from './blockAgentFields.js';
import { agentAt } from './blockFields.js';
import { newId } from './model.js';
import {
  addPipelineArgument,
  addPipelineRuleTag,
  editPipelineArgument,
  removePipelineArgument,
  removePipelineRuleTag,
} from './pipelineFields.js';
import { getRowEditorStyles } from './rowEditorStyles.js';
import { emptyReasonOf, isEmptyText, keyUpText, refusalOf } from './requiredText.js';

// The row and list editors of the builder panels (F-11 AC-024 to AC-026, AC-043). The flow panel, the pipeline
// panel and the Agent panel of the flow tab (F-12 AC-022, AC-027) use the same editors: an argument list and a
// rule tag list take a `target` (the pipeline's own lists, the lists of one flow, or the lists of one Agent); the
// outcome artifact list belongs to a flow.
//
// The editors hold no pipeline value. Each edit calls the parser's functions (fields.ts and pipelineFields.ts),
// which check a copy of the pipeline (`parseProjectConfig` in core). An accepted edit is reported through
// `onChange`. A refused edit keeps the saved row and shows the parser's reason beneath the row or the field
// it belongs to. The only state is the open draft (a new row or an artifact form) and the last refusal.

export type ListTarget =
  | { readonly kind: 'pipeline' }
  | { readonly kind: 'flow'; readonly flowId: string }
  | { readonly kind: 'agent'; readonly flowId: string; readonly blockId: string };

export interface ListProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly onChange: (pipelineState: Pipeline) => void;
}

export interface TargetListProps extends ListProps {
  readonly target: ListTarget;
}

export interface ArtifactListProps extends ListProps {
  readonly flowId: string;
}

// Where a refusal shows: beneath the saved row at a position, or beneath the new row being added.
type RowKey = number | 'new';

interface RowRefusal {
  readonly row: RowKey;
  readonly reason: string;
}

type RuleTagValue = core.RuleTag;

// The reasons of an artifact group, one for each field the parser refused.
type Refusals = Partial<Record<ArtifactField, string | undefined>>;

// The open new group of the artifact list: its draft and the reasons the parser gave for it.
interface ArtifactAdd {
  readonly draft: ArtifactRow;
  readonly refusals: Refusals;
}

// The last refusal of the artifact list: the row, the field (or the removal of the row), the parser's reason and a
// count that changes on each refusal. A label refused with text keeps no reason: it reverts with nothing shown.
interface ArtifactRefusal {
  readonly position: number;
  readonly target: ArtifactField | 'removal';
  readonly reason: string | undefined;
  readonly attempt: number;
}

// A refusal that shows: it has a reason.
type ShownRefusal = ArtifactRefusal & { readonly reason: string };

const EMPTY_ARTIFACT: ArtifactRow = { label: '', template: '' };

// The help text under an artifact's template (F-11 screen 10).
export const TEMPLATE_HELP_TEXT =
  'The template is the starting structure of this artifact: the headings or fields its file must have. The agent fills them in. May be empty.';

// The flow `flowId` of the pipeline. A missing flow is a programmer error: the panel only shows flows of the pipeline.
function flowOf(pipelineState: Pipeline, flowId: string): Flow {
  const flow = pipelineState.flows.find((item) => item.id === flowId);
  if (flow === undefined) {
    throw new Error(`F-11: the pipeline has no flow "${flowId}"`);
  }
  return flow;
}

function argumentsOf(pipelineState: Pipeline, target: ListTarget): readonly Argument[] {
  switch (target.kind) {
    case 'pipeline':
      return pipelineState.arguments;
    case 'flow':
      return flowOf(pipelineState, target.flowId).arguments;
    case 'agent':
      return agentAt(pipelineState, target.flowId, target.blockId).agent.arguments;
  }
}

function tagsOf(pipelineState: Pipeline, target: ListTarget): readonly RuleTagValue[] {
  switch (target.kind) {
    case 'pipeline':
      return pipelineState.ruleTags ?? [];
    case 'flow':
      return flowOf(pipelineState, target.flowId).ruleTags ?? [];
    case 'agent':
      return agentAt(pipelineState, target.flowId, target.blockId).agent.ruleTags ?? [];
  }
}

function addArgumentTo(pipelineState: Pipeline, rules: readonly Rule[], target: ListTarget, row: ArgumentRow): RowResult {
  switch (target.kind) {
    case 'pipeline':
      return addPipelineArgument(pipelineState, rules, row);
    case 'flow':
      return addFlowArgument(pipelineState, rules, target.flowId, row);
    case 'agent':
      return addAgentArgument(pipelineState, rules, target.flowId, target.blockId, row);
  }
}

function editArgumentAt(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  target: ListTarget,
  position: number,
  row: ArgumentRow,
): RowResult {
  switch (target.kind) {
    case 'pipeline':
      return editPipelineArgument(pipelineState, rules, position, row);
    case 'flow':
      return editFlowArgument(pipelineState, rules, target.flowId, position, row);
    case 'agent':
      return editAgentArgument(pipelineState, rules, target.flowId, target.blockId, position, row);
  }
}

function removeArgumentAt(pipelineState: Pipeline, target: ListTarget, position: number): Pipeline {
  switch (target.kind) {
    case 'pipeline':
      return removePipelineArgument(pipelineState, position);
    case 'flow':
      return removeFlowArgument(pipelineState, target.flowId, position);
    case 'agent':
      return removeAgentArgument(pipelineState, target.flowId, target.blockId, position);
  }
}

function addRuleTagTo(pipelineState: Pipeline, rules: readonly Rule[], target: ListTarget, ruleId: string): RowResult {
  switch (target.kind) {
    case 'pipeline':
      return addPipelineRuleTag(pipelineState, rules, ruleId);
    case 'flow':
      return addFlowRuleTag(pipelineState, rules, target.flowId, ruleId);
    case 'agent':
      return addAgentRuleTag(pipelineState, rules, target.flowId, target.blockId, ruleId);
  }
}

function removeRuleTagAt(pipelineState: Pipeline, target: ListTarget, position: number): Pipeline {
  switch (target.kind) {
    case 'pipeline':
      return removePipelineRuleTag(pipelineState, position);
    case 'flow':
      return removeFlowRuleTag(pipelineState, target.flowId, position);
    case 'agent':
      return removeAgentRuleTag(pipelineState, target.flowId, target.blockId, position);
  }
}

function artifactAt(pipelineState: Pipeline, flowId: string, position: number): ArtifactRow {
  const artifact = flowOf(pipelineState, flowId).artifacts[position];
  if (artifact === undefined) {
    throw new Error(`F-11: the flow "${flowId}" has no artifact row ${position}`);
  }
  return { label: artifact.label, template: artifact.template };
}

function refusalFor(field: ArtifactField, reason: string): Refusals {
  return field === 'label' ? { label: reason } : { template: reason };
}

// The count of the last refusal at `position`, or 0 when the last refusal is for another row. A refusal that keeps a
// row's text keeps the count, so the row is not drawn again; a refusal that reverts the row counts up.
function attemptOf(current: { readonly position: number; readonly attempt: number } | undefined, position: number): number {
  return current !== undefined && current.position === position ? current.attempt : 0;
}

// The refusal left when a save of the row at `position` is accepted. The row's own refusal is drawn again from the
// saved values, so a blank text left in it is replaced by the saved one with no error. A refusal of another row stays,
// since its text is still blank and refused.
function settledRefusal<
  T extends { readonly position: number; readonly attempt: number; readonly reason: string | undefined },
>(current: T | undefined, position: number): T | undefined {
  if (current === undefined || current.position !== position) return current;
  return { ...current, reason: undefined, attempt: current.attempt + 1 };
}

// The refusal left when the row at `position` is removed. A refusal above it stays, since its row keeps its place and
// its blank text; a refusal at or below it goes, and the rows that move up are drawn from their saved values.
function removedRefusal<T extends { readonly position: number }>(current: T | undefined, position: number): T | undefined {
  return current !== undefined && current.position < position ? current : undefined;
}

// The reason of a refused value, in red beneath its field or row. The id names it for aria-describedby.
function Refusal({ id, reason }: { readonly id: string; readonly reason: string }) {
  const styles = getRowEditorStyles(useTheme());
  return (
    <Typography id={id} component="p" sx={styles.refusal}>
      {reason}
    </Typography>
  );
}

function describedBy(shown: boolean, id: string): string | undefined {
  return shown ? id : undefined;
}

// The text of a new argument line, its required flag (ticked before the line is saved) and the parser's reason
// for it, when the name was refused.
interface NewArgument {
  readonly text: string;
  readonly required: boolean;
  readonly refusal: string | undefined;
}

// A saved row whose name was typed and not yet left: its position and the text in the field.
interface SavedEdit {
  readonly position: number;
  readonly text: string;
}

// The last refusal of a saved row: its position, the parser's reason, and a count that changes on each refusal.
interface ArgumentRefusal {
  readonly position: number;
  readonly reason: string | undefined;
  readonly attempt: number;
}

// The pipeline the step holds now. The step sets it after each render, so a list that unmounts reads the pipeline as it
// is at that moment, not the one the list last rendered: a flow or block deleted in the same step is not written back.
export const CurrentPipelineContext = createContext<{ readonly current: Pipeline } | undefined>(undefined);

// Whether the holder of a list is still in the pipeline (its flow, and for an Agent its block).
function holderExists(pipelineState: Pipeline, target: ListTarget): boolean {
  switch (target.kind) {
    case 'pipeline':
      return true;
    case 'flow':
      return pipelineState.flows.some((flow) => flow.id === target.flowId);
    case 'agent':
      return pipelineState.flows.some(
        (flow) =>
          flow.id === target.flowId && flow.blocks.some((block) => block.id === target.blockId && block.kind === 'agent'),
      );
  }
}

// The list with a saved row's edited name written in, or undefined when the row is gone, its name is unchanged, or the
// name or the parser refuses it. A refused edit is discarded with no error, as the saved list keeps its name (F-16 AC-023).
function withEditedName(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  target: ListTarget,
  edit: SavedEdit,
): Pipeline | undefined {
  const saved = argumentsOf(pipelineState, target)[edit.position];
  if (saved === undefined || edit.text === saved.hint || nameRefusal(edit.text) !== undefined) return undefined;
  const result = editArgumentAt(pipelineState, rules, target, edit.position, {
    id: saved.id,
    required: saved.required,
    hint: edit.text,
  });
  return result.ok ? result.pipeline : undefined;
}

// The reason shown for a name with no letter or digit (F-16 AC-026). The name is the argument's hint; its id is a GUID.
const NAME_REASON = 'Needs a letter or digit.';

// The refusal of a typed name with no letter or digit, or undefined when the name has one. A name that passes here is
// still checked by the parser with the rest of the row.
function nameRefusal(name: string): RowResult | undefined {
  return /[\p{L}\p{N}]/u.test(name) ? undefined : { ok: false, reason: NAME_REASON };
}

// The parser's answer for a new line: the row it adds, with a new GUID as its id and the typed name as its hint (F-16 AC-027).
function addNewLine(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  target: ListTarget,
  text: string,
  required: boolean,
): RowResult {
  return nameRefusal(text) ?? addArgumentTo(pipelineState, rules, target, { id: newId(), required, hint: text });
}

// The list with a new line added, or undefined when the line is blank or its name or the parser refuses it.
function withNewLine(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  target: ListTarget,
  text: string,
  required: boolean,
): Pipeline | undefined {
  if (isEmptyText(text)) return undefined;
  const result = addNewLine(pipelineState, rules, target, text, required);
  return result.ok ? result.pipeline : undefined;
}

// Enter ends the edit of a one-line field, as losing focus does. Enter that ends an IME composition is not an edit end.
export function endOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
}

// The argument list (F-11 AC-024, AC-043; screens 01 and 07): a title with + in it, then one row per argument. A saved
// row is a field with its name (the hint), a "required" checkbox and a minus. The name is edited in place and is
// checked when it loses focus (or Enter). The checkbox saves the argument's required flag through the parser. A refused
// edit keeps the saved values and shows the reason beneath the row. The user never types an id (F-16 AC-027). + adds one
// line after the list, a text box, a "required" checkbox and a minus; the list is closed until + is pressed. The line's
// text is the argument's name: an accepted line is saved with a new GUID id, the typed name as its hint and the required
// flag the checkbox shows (a new one starts unrequired). A blank line is discarded on blur. A name with no letter or digit
// stays open with the reason beneath it, until a corrected name is accepted (F-16 AC-026).
// A line still open when the list unmounts (another block or flow is selected, or its holder is deleted) is saved as
// blur would save it, unless its holder is gone. A saved name typed and not yet left is saved the same way, and a refused
// one is discarded (F-16 AC-023).
export function ArgumentRows({ target, pipelineState, rules, onChange }: TargetListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [adding, setAdding] = useState<NewArgument | undefined>(undefined);
  const [refused, setRefused] = useState<ArgumentRefusal | undefined>(undefined);
  const rows = argumentsOf(pipelineState, target);
  const newRefusalId = `${idBase}-new-refusal`;

  const current = useContext(CurrentPipelineContext);

  // The saved name typed and not yet left. It is set on each change and cleared when the field loses focus.
  const edited = useRef<SavedEdit | undefined>(undefined);

  // The values of the last commit, read when the list unmounts.
  const latest = useRef({ pipelineState, rules, target, onChange, adding, current });
  useEffect(() => {
    latest.current = { pipelineState, rules, target, onChange, adding, current };
  });

  // A line is held in state until focus leaves it, and so is a saved name. When another block or flow is selected the list
  // unmounts first, so an accepted line or name is saved then, as losing focus would have saved it (F-16 AC-023). The
  // pipeline is the step's current one: when the holder was deleted, the line or name goes with it and nothing is written.
  useEffect(
    () => () => {
      const { pipelineState: rendered, rules: ruleList, target: holder, onChange: change, adding: line, current: step } =
        latest.current;
      const state = step?.current ?? rendered;
      if (!holderExists(state, holder)) return;
      const savedName = edited.current === undefined ? undefined : withEditedName(state, ruleList, holder, edited.current);
      const base = savedName ?? state;
      const next = line === undefined ? savedName : (withNewLine(base, ruleList, holder, line.text, line.required) ?? savedName);
      if (next !== undefined) change(next);
    },
    [],
  );

  // A blank line is discarded on blur, with no message. A line with text is checked and sent to the parser with a new id. An
  // accepted line is saved and closes. A refused line stays open with the parser's reason beneath it, and nothing is saved
  // (F-16 AC-026).
  function commitNew(text: string, required: boolean) {
    if (isEmptyText(text)) {
      setAdding(undefined);
      return;
    }
    const result = addNewLine(pipelineState, rules, target, text, required);
    if (result.ok) {
      onChange(result.pipeline);
      setAdding(undefined);
      return;
    }
    setAdding((current) => (current === undefined ? current : { ...current, refusal: result.reason }));
  }

  // The key press check of a new line (device fix 2026-11-24): its error is the reason for an empty name while
  // the text is empty, and nothing once text is typed.
  function checkNew(text: string) {
    setAdding((current) =>
      current === undefined ? current : { ...current, refusal: emptyReasonOf(text, () => NAME_REASON) },
    );
  }

  // Sends a saved row with the values given. An accepted row is saved. A refused name with text reverts to the saved name, with
  // no error. An empty name keeps its text beneath the reason. A refused flag keeps the row and shows its reason.
  // Only the refused row is drawn again, so the field the user moved to keeps its focus.
  function saveRow(position: number, row: ArgumentRow, byText: boolean) {
    const result = (byText ? nameRefusal(row.hint) : undefined) ?? editArgumentAt(pipelineState, rules, target, position, row);
    if (result.ok) {
      onChange(result.pipeline);
      setRefused((current) => settledRefusal(current, position));
      return;
    }
    if (!byText) {
      setRefused((current) => ({ position, reason: result.reason, attempt: attemptOf(current, position) + 1 }));
      return;
    }
    if (isEmptyText(row.hint)) {
      setRefused((current) => ({ position, reason: result.reason, attempt: attemptOf(current, position) }));
      return;
    }
    setRefused((current) => ({ position, reason: undefined, attempt: attemptOf(current, position) + 1 }));
  }

  // The key press check of a saved name (device fix 2026-11-24). The row keeps its count, so its text is not drawn again.
  function checkRow(position: number, item: Argument, text: string) {
    setRefused((current) => ({
      position,
      reason: emptyReasonOf(text, () => NAME_REASON),
      attempt: attemptOf(current, position),
    }));
  }

  // An unchanged name is not sent. The id and the required flag are kept.
  function commitEdit(position: number, item: Argument, text: string) {
    if (text === item.hint) return;
    saveRow(position, { id: item.id, required: item.required, hint: text }, true);
  }

  // The checkbox saves the flag at once, with the saved id and name.
  function commitRequired(position: number, item: Argument, required: boolean) {
    saveRow(position, { id: item.id, required, hint: item.hint }, false);
  }

  function removeAt(position: number) {
    // A pending saved name is dropped: the rows after the removed one move up, so its position would name another row.
    edited.current = undefined;
    onChange(removeArgumentAt(pipelineState, target, position));
    setRefused((current) => removedRefusal(current, position));
  }

  return (
    <Box sx={styles.list}>
      <Box sx={styles.titleRow}>
        <Typography component="p" sx={styles.title}>
          Arguments
        </Typography>
        <Button
          variant="outlined"
          aria-label="Add argument"
          onClick={() => {
            setAdding((current) => current ?? { text: '', required: false, refusal: undefined });
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {rows.map((item, position) => {
        const refusalId = `${idBase}-refusal-${position}`;
        const isRefused = refused !== undefined && refused.position === position;
        const reason = isRefused ? refused.reason : undefined;
        return (
          <Box key={position} role="group" aria-label={`Argument ${position + 1}`} sx={styles.row}>
            <Box sx={styles.rowLine}>
              <TextField
                // Keyed by the saved name, so a row that moves up after a removal shows its own name; and by the refusal
                // count, so a refused text is drawn again from the saved name.
                key={`${item.hint}-${isRefused ? refused.attempt : 0}`}
                defaultValue={item.hint}
                error={reason !== undefined}
                onChange={(event) => {
                  edited.current = { position, text: event.target.value };
                }}
                onBlur={(event) => {
                  edited.current = undefined;
                  commitEdit(position, item, event.target.value);
                }}
                sx={styles.input}
                slotProps={{
                  htmlInput: {
                    'aria-label': `Argument ${position + 1} name`,
                    'aria-describedby': describedBy(reason !== undefined, refusalId),
                    onKeyDown: endOnEnter,
                    onKeyUp: keyUpText((text) => {
                      checkRow(position, item, text);
                    }),
                  },
                }}
              />
              <FormControlLabel
                sx={styles.requiredLabel}
                control={
                  <Checkbox
                    size="small"
                    checked={item.required}
                    onChange={(event) => {
                      commitRequired(position, item, event.target.checked);
                    }}
                    sx={styles.requiredCheckbox}
                  />
                }
                label={<Box component="span" sx={styles.requiredText}>required</Box>}
              />
              <Button
                variant="outlined"
                aria-label={`Remove argument ${position + 1}`}
                onClick={() => {
                  removeAt(position);
                }}
                sx={styles.minusButton}
              >
                −
              </Button>
            </Box>
            {reason === undefined ? null : <Refusal id={refusalId} reason={reason} />}
          </Box>
        );
      })}

      {adding === undefined ? null : (
        <Box
          role="group"
          aria-label="New argument"
          sx={styles.row}
          // The line is saved when focus leaves it, not when Tab moves it to the line's own required box or minus.
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            commitNew(adding.text, adding.required);
          }}
        >
          <Box sx={styles.rowLine}>
            <TextField
              value={adding.text}
              error={adding.refusal !== undefined}
              onChange={(event) => {
                const text = event.target.value;
                setAdding((current) => (current === undefined ? current : { ...current, text }));
              }}
              sx={styles.input}
              slotProps={{
                htmlInput: {
                  'aria-label': 'New argument name',
                  'aria-describedby': describedBy(adding.refusal !== undefined, newRefusalId),
                  onKeyDown: endOnEnter,
                  onKeyUp: keyUpText((text) => {
                    checkNew(text);
                  }),
                },
              }}
            />
            <FormControlLabel
              sx={styles.requiredLabel}
              // The press keeps the focus in the line, so the line is not saved on blur before the box is ticked.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              control={
                <Checkbox
                  size="small"
                  checked={adding.required}
                  onChange={(event) => {
                    const required = event.target.checked;
                    setAdding((current) => (current === undefined ? current : { ...current, required }));
                  }}
                  sx={styles.requiredCheckbox}
                />
              }
              label={<Box component="span" sx={styles.requiredText}>required</Box>}
            />
            <Button
              variant="outlined"
              aria-label="Cancel new argument"
              // The press keeps the focus in the line, so the line is discarded and not saved on blur.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setAdding(undefined);
              }}
              sx={styles.minusButton}
            >
              −
            </Button>
          </Box>
          {adding.refusal === undefined ? null : <Refusal id={newRefusalId} reason={adding.refusal} />}
        </Box>
      )}
    </Box>
  );
}

// The rule tag list (F-11 AC-026): a title with + in it, then one row per tag, each a dropdown of the rules of
// the Technical details step, with a minus. The + opens a row with an empty dropdown; choosing a rule adds it.
// Choosing another rule in a saved row adds the new tag first and then removes the old one, so a refused tag
// keeps the saved row. The parser refuses a tag that names no rule, or one the list already has.
export function RuleTagRows({ target, pipelineState, rules, onChange }: TargetListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [pending, setPending] = useState(false);
  const [refusal, setRefusal] = useState<RowRefusal | undefined>(undefined);
  const tags = tagsOf(pipelineState, target);
  const ruleIds = rules.map((rule) => rule.id);

  // The dropdown's options: the rules, and a saved tag that is no longer one of them, so it still shows.
  function optionsFor(current: string | undefined): readonly string[] {
    return current === undefined || ruleIds.includes(current) ? ruleIds : [...ruleIds, current];
  }

  function accept(result: RowResult, row: RowKey): boolean {
    if (result.ok) {
      onChange(result.pipeline);
      setRefusal(undefined);
      return true;
    }
    setRefusal({ row, reason: result.reason });
    return false;
  }

  function choose(row: RowKey, ruleId: string) {
    if (ruleId === '') return;
    if (row === 'new') {
      if (accept(addRuleTagTo(pipelineState, rules, target, ruleId), 'new')) setPending(false);
      return;
    }
    const added = addRuleTagTo(pipelineState, rules, target, ruleId);
    if (!added.ok) {
      setRefusal({ row, reason: added.reason });
      return;
    }
    // The new tag is appended, so the saved tag keeps its position until it is removed.
    onChange(removeRuleTagAt(added.pipeline, target, row));
    setRefusal(undefined);
  }

  return (
    <Box sx={styles.list}>
      <Box sx={styles.titleRow}>
        <Typography component="p" sx={styles.title}>
          Rule tags
        </Typography>
        <Button
          variant="outlined"
          aria-label="Add rule tag"
          onClick={() => {
            setRefusal(undefined);
            setPending(true);
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {tags.map((tag, position) => {
        const shownRefusal = refusal !== undefined && refusal.row === position;
        return (
          <Box key={position} role="group" aria-label={`Rule tag ${position + 1}`} sx={styles.row}>
            <Box sx={styles.rowLine}>
              <TextField
                select
                value={tag.ruleId}
                onChange={(event) => {
                  choose(position, event.target.value);
                }}
                sx={styles.select}
                slotProps={{
                  select: { native: true },
                  htmlInput: {
                    'aria-label': `Rule tag ${position + 1} rule`,
                    'aria-describedby': describedBy(shownRefusal, `${idBase}-rule-tag-${position + 1}-refusal`),
                  },
                }}
              >
                {optionsFor(tag.ruleId).map((ruleId) => (
                  <option key={ruleId} value={ruleId}>
                    {ruleId}
                  </option>
                ))}
              </TextField>
              <Button
                variant="outlined"
                aria-label={`Remove rule tag ${position + 1}`}
                onClick={() => {
                  onChange(removeRuleTagAt(pipelineState, target, position));
                  setRefusal(undefined);
                }}
                sx={styles.minusButton}
              >
                −
              </Button>
            </Box>
            {shownRefusal ? <Refusal id={`${idBase}-rule-tag-${position + 1}-refusal`} reason={refusal.reason} /> : null}
          </Box>
        );
      })}

      {pending ? (
        <Box role="group" aria-label="New rule tag" sx={styles.row}>
          <Box sx={styles.rowLine}>
            <TextField
              select
              value=""
              onChange={(event) => {
                choose('new', event.target.value);
              }}
              sx={styles.select}
              slotProps={{ select: { native: true }, htmlInput: { 'aria-label': 'New rule tag rule' } }}
            >
              <option value="" />
              {ruleIds.map((ruleId) => (
                <option key={ruleId} value={ruleId}>
                  {ruleId}
                </option>
              ))}
            </TextField>
            <Button
              variant="outlined"
              aria-label="Cancel new rule tag"
              onClick={() => {
                setPending(false);
                setRefusal(undefined);
              }}
              sx={styles.minusButton}
            >
              −
            </Button>
          </Box>
          {refusal !== undefined && refusal.row === 'new' ? <Refusal id={`${idBase}-rule-tag-new-refusal`} reason={refusal.reason} /> : null}
        </Box>
      ) : null}
    </Box>
  );
}

// One artifact group as screen 03 draws it: a Label field with its minus and the refusal beneath it, then the
// Template box with its refusal and its help text beneath. The saved rows and the new group share this shape.
interface ArtifactGroupProps {
  readonly label: string;
  readonly labelId: string;
  readonly templateId: string;
  readonly labelField: ReactNode;
  readonly minus: ReactNode;
  readonly labelReason: ReactNode;
  readonly templateField: ReactNode;
  readonly templateReason: ReactNode;
  readonly onBlur?: FocusEventHandler<HTMLDivElement>;
}

function ArtifactGroup({
  label,
  labelId,
  templateId,
  labelField,
  minus,
  labelReason,
  templateField,
  templateReason,
  onBlur,
}: ArtifactGroupProps) {
  const styles = getRowEditorStyles(useTheme());
  return (
    <Box role="group" aria-label={label} sx={styles.artifact} onBlur={onBlur}>
      <Box sx={styles.artifactPart}>
        <Typography component="label" htmlFor={labelId} sx={styles.fieldLabel}>
          Label
        </Typography>
        <Box sx={styles.row}>
          <Box sx={styles.rowLine}>
            {labelField}
            {minus}
          </Box>
          {labelReason}
        </Box>
      </Box>
      <Box sx={styles.artifactPart}>
        <Typography component="label" htmlFor={templateId} sx={styles.fieldLabel}>
          Template
        </Typography>
        <Box sx={styles.control}>
          {templateField}
          {templateReason}
        </Box>
        <Typography component="p" sx={styles.helpText}>
          {TEMPLATE_HELP_TEXT}
        </Typography>
      </Box>
    </Box>
  );
}

// The outcome artifact list of a flow (F-11 AC-025; screens 03 and 10). A title with + in it, then one group per
// artifact as the screens draw it: a Label field with its minus on the right, then the Template box and its help
// text beneath. Editing is in place: a field is checked by the parser when it loses focus (or Enter in the label).
// A refused value shows its reason beneath its field and the field returns to the saved value; a required label shows
// the reason only while it is empty (device fix 2026-11-24). The section has no border. + adds one inline group after
// the list, with a Label field, a Template box and the help text, and no Cancel or Save. The new group is saved through
// the parser when focus leaves it (or Enter in its label); a blank label is discarded on blur, a refused label with text
// discards the group too (device fix 2026-11-24), and a refused template keeps the group with its reason. The group is
// closed until + is pressed.
export function ArtifactRows({ flowId, pipelineState, rules, onChange }: ArtifactListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [adding, setAdding] = useState<ArtifactAdd | undefined>(undefined);
  const [refused, setRefused] = useState<ArtifactRefusal | undefined>(undefined);
  const artifacts = flowOf(pipelineState, flowId).artifacts;
  const newLabelId = `${idBase}-new-label`;
  const newTemplateId = `${idBase}-new-template`;

  // Each refusal draws the refused field again from the saved value. Only that field is redrawn, so the other rows
  // and the field the user moved to keep their focus.
  function refuse(position: number, target: ArtifactField | 'removal', reason: string) {
    setRefused((current) => ({ position, target, reason, attempt: (current?.attempt ?? 0) + 1 }));
  }

  // The last refusal of a field or of a removal at this position, when it is the one the list last refused.
  // A refusal with no reason shows nothing: it only redraws the field (device fix 2026-11-24).
  function refusalAt(position: number, target: ArtifactRefusal['target']): ShownRefusal | undefined {
    if (refused === undefined || refused.position !== position || refused.target !== target) return undefined;
    return refused.reason === undefined ? undefined : { ...refused, reason: refused.reason };
  }

  // The key press check of a saved label (device fix 2026-11-24): its error is the parser's reason for an empty label
  // while the text is empty, and nothing once text is typed. The row keeps its count, so its text is not drawn again.
  function checkLabel(position: number, text: string) {
    setRefused((current) => ({
      position,
      target: 'label',
      reason: emptyReasonOf(text, () =>
        refusalOf(editFlowArtifact(pipelineState, rules, flowId, position, { field: 'label', value: '' })),
      ),
      attempt: attemptOf(current, position),
    }));
  }

  // Sends one field to the parser. An unchanged value is not sent. A refused empty label keeps its text under the
  // parser's reason; a refused label with text reverts to the saved label with no error (device fix 2026-11-24).
  function commitField(position: number, field: ArtifactField, value: string) {
    if (value === artifactAt(pipelineState, flowId, position)[field]) return;
    const result = editFlowArtifact(pipelineState, rules, flowId, position, { field, value });
    if (result.ok) {
      onChange(result.pipeline);
      setRefused((current) => settledRefusal(current, position));
      return;
    }
    if (field === 'label') {
      setRefused((current) => ({
        position,
        target: 'label',
        reason: isEmptyText(value) ? result.reason : undefined,
        attempt: isEmptyText(value) ? attemptOf(current, position) : attemptOf(current, position) + 1,
      }));
      return;
    }
    refuse(position, field, result.reason);
  }

  // Sends the new group to the parser. A blank label discards the group, and so does a refused label with text, which
  // reverts to nothing saved (device fix 2026-11-24). A refused template keeps the group with its reason.
  function commitNew(draft: ArtifactRow) {
    if (draft.label.trim() === '') {
      setAdding(undefined);
      return;
    }
    const result = addFlowArtifact(pipelineState, rules, flowId, draft);
    if (result.ok) {
      onChange(result.pipeline);
      setAdding(undefined);
      return;
    }
    if (result.field === 'label') {
      setAdding(undefined);
      return;
    }
    setAdding({ draft, refusals: refusalFor(result.field, result.reason) });
  }

  // The key press check of the new group's label (device fix 2026-11-24): its error is the parser's reason for an empty
  // label while the text is empty, and nothing once text is typed.
  function checkNewLabel(label: string) {
    setAdding((current) =>
      current === undefined
        ? current
        : {
            ...current,
            refusals: {
              ...current.refusals,
              label: emptyReasonOf(label, () =>
                refusalOf(addFlowArtifact(pipelineState, rules, flowId, { label: '', template: '' })),
              ),
            },
          },
    );
  }

  function removeArtifact(position: number) {
    const result = removeFlowArtifact(pipelineState, rules, flowId, position);
    if (result.ok) {
      onChange(result.pipeline);
      setRefused((current) => removedRefusal(current, position));
      return;
    }
    refuse(position, 'removal', result.reason);
  }

  return (
    <Box sx={styles.list}>
      <Box sx={styles.titleRow}>
        <Typography component="p" sx={styles.title}>
          Outcome artifacts
        </Typography>
        <Button
          variant="outlined"
          aria-label="Add artifact"
          onClick={() => {
            setAdding((current) => current ?? { draft: EMPTY_ARTIFACT, refusals: {} });
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {artifacts.map((artifact, position) => {
        const labelId = `${idBase}-label-${position}`;
        const templateId = `${idBase}-template-${position}`;
        const labelRefusal = refusalAt(position, 'label');
        const labelAttempt = refused?.target === 'label' ? attemptOf(refused, position) : 0;
        const templateRefusal = refusalAt(position, 'template');
        const removalRefusal = refusalAt(position, 'removal');
        // A removal refusal is drawn beneath the row it belongs to, where a label refusal is drawn too.
        const rowReason = labelRefusal ?? removalRefusal;
        const rowReasonId = labelRefusal === undefined ? `${idBase}-removal-${position}` : `${labelId}-refusal`;
        return (
          <ArtifactGroup
            key={position}
            label={`Artifact ${position + 1}`}
            labelId={labelId}
            templateId={templateId}
            labelField={
              <TextField
                id={labelId}
                // Keyed by the saved label, so a row that moves up after a removal shows its own label; and by the
                // refusal count, so a refused label is drawn again from the saved one.
                key={`${artifact.label}-${labelAttempt}`}
                defaultValue={artifact.label}
                error={labelRefusal !== undefined}
                onBlur={(event) => {
                  commitField(position, 'label', event.target.value);
                }}
                sx={styles.input}
                slotProps={{
                  htmlInput: {
                    'aria-describedby': describedBy(labelRefusal !== undefined, `${labelId}-refusal`),
                    onKeyDown: endOnEnter,
                    onKeyUp: keyUpText((text) => {
                      checkLabel(position, text);
                    }),
                  },
                }}
              />
            }
            minus={
              <Button
                variant="outlined"
                aria-label={`Remove artifact ${position + 1}`}
                onClick={() => {
                  removeArtifact(position);
                }}
                sx={styles.minusButton}
              >
                −
              </Button>
            }
            labelReason={rowReason === undefined ? null : <Refusal id={rowReasonId} reason={rowReason.reason} />}
            templateField={
              <TextField
                id={templateId}
                key={`${artifact.template}-${templateRefusal?.attempt ?? 0}`}
                multiline
                minRows={3}
                defaultValue={artifact.template}
                error={templateRefusal !== undefined}
                onBlur={(event) => {
                  commitField(position, 'template', event.target.value);
                }}
                sx={styles.multilineInput}
                slotProps={{
                  htmlInput: { 'aria-describedby': describedBy(templateRefusal !== undefined, `${templateId}-refusal`) },
                }}
              />
            }
            templateReason={
              templateRefusal === undefined ? null : <Refusal id={`${templateId}-refusal`} reason={templateRefusal.reason} />
            }
          />
        );
      })}

      {adding === undefined ? null : (
        <ArtifactGroup
          label="New artifact"
          labelId={newLabelId}
          templateId={newTemplateId}
          // The group is saved when focus leaves it, not when Tab moves it into its own Template box or minus.
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            commitNew(adding.draft);
          }}
          labelField={
            <TextField
              id={newLabelId}
              value={adding.draft.label}
              error={adding.refusals.label !== undefined}
              onChange={(event) => {
                const label = event.target.value;
                setAdding((current) => (current === undefined ? current : { ...current, draft: { ...current.draft, label } }));
              }}
              sx={styles.input}
              slotProps={{
                htmlInput: {
                  'aria-describedby': describedBy(adding.refusals.label !== undefined, `${newLabelId}-refusal`),
                  onKeyDown: endOnEnter,
                  onKeyUp: keyUpText((text) => {
                    checkNewLabel(text);
                  }),
                },
              }}
            />
          }
          minus={
            <Button
              variant="outlined"
              aria-label="Discard new artifact"
              // The press keeps the focus in the group, so the group is discarded and not saved on blur.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setAdding(undefined);
              }}
              sx={styles.minusButton}
            >
              −
            </Button>
          }
          labelReason={
            adding.refusals.label === undefined ? null : <Refusal id={`${newLabelId}-refusal`} reason={adding.refusals.label} />
          }
          templateField={
            <TextField
              id={newTemplateId}
              multiline
              minRows={3}
              value={adding.draft.template}
              error={adding.refusals.template !== undefined}
              onChange={(event) => {
                const template = event.target.value;
                setAdding((current) => (current === undefined ? current : { ...current, draft: { ...current.draft, template } }));
              }}
              sx={styles.multilineInput}
              slotProps={{
                htmlInput: {
                  'aria-describedby': describedBy(adding.refusals.template !== undefined, `${newTemplateId}-refusal`),
                },
              }}
            />
          }
          templateReason={
            adding.refusals.template === undefined ? null : (
              <Refusal id={`${newTemplateId}-refusal`} reason={adding.refusals.template} />
            )
          }
        />
      )}
    </Box>
  );
}
