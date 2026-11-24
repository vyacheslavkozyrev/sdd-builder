import { useId, useState } from 'react';
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
import {
  addPipelineArgument,
  addPipelineRuleTag,
  editPipelineArgument,
  removePipelineArgument,
  removePipelineRuleTag,
} from './pipelineFields.js';
import { getRowEditorStyles } from './rowEditorStyles.js';

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
type Refusals = Partial<Record<ArtifactField, string>>;

// The open new group of the artifact list: its draft and the reasons the parser gave for it.
interface ArtifactAdd {
  readonly draft: ArtifactRow;
  readonly refusals: Refusals;
}

// The last refusal of the artifact list: the row, the field (or the removal of the row), the parser's reason and a
// count that changes on each refusal.
interface ArtifactRefusal {
  readonly position: number;
  readonly target: ArtifactField | 'removal';
  readonly reason: string;
  readonly attempt: number;
}

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
// for it, when the parser refused the id.
interface NewArgument {
  readonly text: string;
  readonly required: boolean;
  readonly refusal: string | undefined;
}

// The last refusal of a saved row: its position, the parser's reason, and a count that changes on each refusal.
interface ArgumentRefusal {
  readonly position: number;
  readonly reason: string;
  readonly attempt: number;
}

// Enter ends the edit of a one-line field, as losing focus does. Enter that ends an IME composition is not an edit end.
export function endOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
}

// The argument list (F-11 AC-024, AC-043; screens 01 and 07): a title with + in it, then one row per argument. A saved
// row is a field with its id, a "required" checkbox and a minus. The field is edited in place: its id is checked by
// the parser when it loses focus (or Enter). The checkbox saves the argument's required flag through the parser. A
// refused edit keeps the saved values and shows the reason beneath the row. + adds one line after the list, a text box,
// a "required" checkbox and a minus; the list is closed until + is pressed. The line's text is the argument's id: an
// accepted line is saved with the id as its hint and the required flag the checkbox shows (a new one starts unrequired).
// A blank line is discarded on blur; a refused id keeps the line with the reason beneath it.
export function ArgumentRows({ target, pipelineState, rules, onChange }: TargetListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [adding, setAdding] = useState<NewArgument | undefined>(undefined);
  const [refused, setRefused] = useState<ArgumentRefusal | undefined>(undefined);
  const rows = argumentsOf(pipelineState, target);
  const newRefusalId = `${idBase}-new-refusal`;

  function commitNew(text: string, required: boolean) {
    if (text.trim() === '') {
      setAdding(undefined);
      return;
    }
    const result = addArgumentTo(pipelineState, rules, target, { id: text, required, hint: text });
    if (result.ok) {
      onChange(result.pipeline);
      setAdding(undefined);
      return;
    }
    setAdding({ text, required, refusal: result.reason });
  }

  // Sends a saved row with the values given. A refused row keeps the saved row and shows the reason beneath it.
  function saveRow(position: number, row: ArgumentRow) {
    const result = editArgumentAt(pipelineState, rules, target, position, row);
    if (result.ok) {
      onChange(result.pipeline);
      setRefused(undefined);
      return;
    }
    // Each refusal draws the refused row again from the saved values. Only that row is redrawn, so the field the
    // user moved to keeps its focus.
    setRefused((current) => ({ position, reason: result.reason, attempt: (current?.attempt ?? 0) + 1 }));
  }

  // An unchanged id is not sent. The required flag and the hint are kept.
  function commitEdit(position: number, item: Argument, text: string) {
    if (text === item.id) return;
    saveRow(position, { id: text, required: item.required, hint: item.hint });
  }

  // The checkbox saves the flag at once, with the saved id and hint.
  function commitRequired(position: number, item: Argument, required: boolean) {
    saveRow(position, { id: item.id, required, hint: item.hint });
  }

  function removeAt(position: number) {
    onChange(removeArgumentAt(pipelineState, target, position));
    setRefused(undefined);
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
                // Keyed by the saved id, so a row that moves up after a removal shows its own id; and by the refusal
                // count, so a refused text is drawn again from the saved id.
                key={`${item.id}-${isRefused ? refused.attempt : 0}`}
                defaultValue={item.id}
                error={reason !== undefined}
                onBlur={(event) => {
                  commitEdit(position, item, event.target.value);
                }}
                sx={styles.input}
                slotProps={{
                  htmlInput: {
                    'aria-label': `Argument ${position + 1} id`,
                    'aria-describedby': describedBy(reason !== undefined, refusalId),
                    onKeyDown: endOnEnter,
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
                  'aria-label': 'New argument id',
                  'aria-describedby': describedBy(adding.refusal !== undefined, newRefusalId),
                  onKeyDown: endOnEnter,
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
        {templateField}
        {templateReason}
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
// A refused value shows its reason beneath its field and the field returns to the saved value. The section has no
// border. + adds one inline group after the list, with a Label field, a Template box and the help text, and no Cancel
// or Save. The new group is saved through the parser when focus leaves it (or Enter in its label); a blank label is
// discarded on blur, and a refused value keeps the group with its reason. The group is closed until + is pressed.
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
  function refusalAt(position: number, target: ArtifactRefusal['target']): ArtifactRefusal | undefined {
    return refused !== undefined && refused.position === position && refused.target === target ? refused : undefined;
  }

  // Sends one field to the parser. An unchanged value is not sent.
  function commitField(position: number, field: ArtifactField, value: string) {
    if (value === artifactAt(pipelineState, flowId, position)[field]) return;
    const result = editFlowArtifact(pipelineState, rules, flowId, position, { field, value });
    if (result.ok) {
      onChange(result.pipeline);
      setRefused(undefined);
      return;
    }
    refuse(position, field, result.reason);
  }

  // Sends the new group to the parser. A blank label discards the group; a refused value keeps it with the reason.
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
    setAdding({ draft, refusals: refusalFor(result.field, result.reason) });
  }

  function removeArtifact(position: number) {
    const result = removeFlowArtifact(pipelineState, rules, flowId, position);
    if (result.ok) {
      onChange(result.pipeline);
      setRefused(undefined);
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
            setRefused(undefined);
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
                key={`${artifact.label}-${labelRefusal?.attempt ?? 0}`}
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
