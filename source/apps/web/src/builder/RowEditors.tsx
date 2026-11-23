import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
  addPipelineArgument,
  addPipelineRuleTag,
  editPipelineArgument,
  removePipelineArgument,
  removePipelineRuleTag,
} from './pipelineFields.js';
import { getRowEditorStyles } from './rowEditorStyles.js';

// The row and list editors of the builder panels (F-11 AC-024 to AC-026, AC-043). The flow panel and the
// pipeline panel use the same editors: an argument list and a rule tag list take a `target` (the pipeline's
// own lists, or the lists of one flow); the outcome artifact list belongs to a flow.
//
// The editors hold no pipeline value. Each edit calls the parser's functions (fields.ts and pipelineFields.ts),
// which check a copy of the pipeline (`parseProjectConfig` in core). An accepted edit is reported through
// `onChange`. A refused edit keeps the saved row and shows the parser's reason beneath the row or the field
// it belongs to. The only state is the open draft (a new row or an artifact form) and the last refusal.

export type ListTarget = { readonly kind: 'pipeline' } | { readonly kind: 'flow'; readonly flowId: string };

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

// The reasons of an artifact form, one for each field the parser refused.
type Refusals = Partial<Record<ArtifactField, string>>;

// The open add form of the artifact list: its draft and the reasons the parser gave for it.
interface ArtifactAdd {
  readonly draft: ArtifactRow;
  readonly refusals: Refusals;
}

// The last refusal of the artifact list: the row, the field (or the removal of the row) and the parser's reason.
interface ArtifactRefusal {
  readonly position: number;
  readonly target: ArtifactField | 'removal';
  readonly reason: string;
}

const EMPTY_ARGUMENT: ArgumentRow = { id: '', required: false, hint: '' };
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
  return target.kind === 'pipeline' ? pipelineState.arguments : flowOf(pipelineState, target.flowId).arguments;
}

function tagsOf(pipelineState: Pipeline, target: ListTarget): readonly RuleTagValue[] {
  const tags = target.kind === 'pipeline' ? pipelineState.ruleTags : flowOf(pipelineState, target.flowId).ruleTags;
  return tags ?? [];
}

// The argument row as the user edits it: the saved row without its position.
function rowOf(item: Argument): ArgumentRow {
  return { id: item.id, required: item.required, hint: item.hint };
}

function addArgumentTo(pipelineState: Pipeline, rules: readonly Rule[], target: ListTarget, row: ArgumentRow): RowResult {
  return target.kind === 'pipeline'
    ? addPipelineArgument(pipelineState, rules, row)
    : addFlowArgument(pipelineState, rules, target.flowId, row);
}

function editArgumentAt(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  target: ListTarget,
  position: number,
  row: ArgumentRow,
): RowResult {
  return target.kind === 'pipeline'
    ? editPipelineArgument(pipelineState, rules, position, row)
    : editFlowArgument(pipelineState, rules, target.flowId, position, row);
}

function removeArgumentAt(pipelineState: Pipeline, target: ListTarget, position: number): Pipeline {
  return target.kind === 'pipeline'
    ? removePipelineArgument(pipelineState, position)
    : removeFlowArgument(pipelineState, target.flowId, position);
}

function addRuleTagTo(pipelineState: Pipeline, rules: readonly Rule[], target: ListTarget, ruleId: string): RowResult {
  return target.kind === 'pipeline'
    ? addPipelineRuleTag(pipelineState, rules, ruleId)
    : addFlowRuleTag(pipelineState, rules, target.flowId, ruleId);
}

function removeRuleTagAt(pipelineState: Pipeline, target: ListTarget, position: number): Pipeline {
  return target.kind === 'pipeline'
    ? removePipelineRuleTag(pipelineState, position)
    : removeFlowRuleTag(pipelineState, target.flowId, position);
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

// The text of a saved argument row as screens 01 and 07 draw it: its id, and "· required" after it when required.
function argumentText(item: Argument): string {
  return item.required ? `${item.id} · required` : item.id;
}

type ArgumentMode =
  | { readonly kind: 'closed' }
  | { readonly kind: 'add'; readonly draft: ArgumentRow; readonly refusal: string | undefined }
  | { readonly kind: 'edit'; readonly position: number; readonly draft: ArgumentRow; readonly refusal: string | undefined };

interface ArgumentFormProps {
  // The group name of the form, and the prefix of its field names: "New argument", or "Argument N" for an edit.
  readonly label: string;
  readonly draft: ArgumentRow;
  readonly refusal: string | undefined;
  readonly onDraftChange: (draft: ArgumentRow) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

// The form of an argument, for Add and for Edit: an Id field, a required checkbox, a Hint field, and Cancel and
// Save. The parser's reason shows beneath the form; the form keeps what was typed.
function ArgumentForm({ label, draft, refusal, onDraftChange, onSave, onCancel }: ArgumentFormProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const refusalId = `${idBase}-refusal`;
  const described = describedBy(refusal !== undefined, refusalId);
  return (
    <Box role="group" aria-label={label} sx={styles.form}>
      <TextField
        placeholder="Id"
        value={draft.id}
        onChange={(event) => {
          onDraftChange({ ...draft, id: event.target.value });
        }}
        sx={styles.input}
        slotProps={{ htmlInput: { 'aria-label': `${label} id`, 'aria-describedby': described } }}
      />
      <FormControlLabel
        sx={styles.checkbox}
        control={
          <Checkbox
            checked={draft.required}
            onChange={(event) => {
              onDraftChange({ ...draft, required: event.target.checked });
            }}
          />
        }
        label={<Box component="span" sx={styles.checkboxLabel}>required</Box>}
      />
      <TextField
        placeholder="Hint"
        value={draft.hint}
        onChange={(event) => {
          onDraftChange({ ...draft, hint: event.target.value });
        }}
        sx={styles.input}
        slotProps={{ htmlInput: { 'aria-label': `${label} hint`, 'aria-describedby': described } }}
      />
      {refusal === undefined ? null : <Refusal id={refusalId} reason={refusal} />}
      <Box sx={styles.formActions}>
        <Button variant="outlined" onClick={onCancel} sx={styles.cancelButton}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} sx={styles.saveButton}>
          Save
        </Button>
      </Box>
    </Box>
  );
}

// The argument list (F-11 AC-024, AC-043; screens 01 and 07): a title with + in it, then one row per argument. A
// saved row is a field with its id and "· required", and a minus; the field opens the argument's form in place,
// and Save checks the edit with the parser. + opens an empty form after the list, with Save and Cancel. Only one
// form is open at a time, and it is closed until + or the field is pressed.
export function ArgumentRows({ target, pipelineState, rules, onChange }: TargetListProps) {
  const styles = getRowEditorStyles(useTheme());
  const [mode, setMode] = useState<ArgumentMode>({ kind: 'closed' });
  const rows = argumentsOf(pipelineState, target);

  function saveAdd(draft: ArgumentRow) {
    const result = addArgumentTo(pipelineState, rules, target, draft);
    if (result.ok) {
      onChange(result.pipeline);
      setMode({ kind: 'closed' });
      return;
    }
    setMode({ kind: 'add', draft, refusal: result.reason });
  }

  function saveEdit(position: number, draft: ArgumentRow) {
    const result = editArgumentAt(pipelineState, rules, target, position, draft);
    if (result.ok) {
      onChange(result.pipeline);
      setMode({ kind: 'closed' });
      return;
    }
    setMode({ kind: 'edit', position, draft, refusal: result.reason });
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
            setMode({ kind: 'add', draft: EMPTY_ARGUMENT, refusal: undefined });
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {rows.map((item, position) => {
        if (mode.kind === 'edit' && mode.position === position) {
          return (
            <ArgumentForm
              key={position}
              label={`Argument ${position + 1}`}
              draft={mode.draft}
              refusal={mode.refusal}
              onDraftChange={(draft) => {
                setMode({ ...mode, draft });
              }}
              onSave={() => {
                saveEdit(position, mode.draft);
              }}
              onCancel={() => {
                setMode({ kind: 'closed' });
              }}
            />
          );
        }
        return (
          <Box key={position} role="group" aria-label={`Argument ${position + 1}`} sx={styles.row}>
            <Box sx={styles.rowLine}>
              <Button
                variant="outlined"
                onClick={() => {
                  setMode({ kind: 'edit', position, draft: rowOf(item), refusal: undefined });
                }}
                sx={styles.argumentField}
              >
                {argumentText(item)}
              </Button>
              <Button
                variant="outlined"
                aria-label={`Remove argument ${position + 1}`}
                onClick={() => {
                  onChange(removeArgumentAt(pipelineState, target, position));
                  setMode({ kind: 'closed' });
                }}
                sx={styles.minusButton}
              >
                −
              </Button>
            </Box>
          </Box>
        );
      })}

      {mode.kind === 'add' ? (
        <ArgumentForm
          label="New argument"
          draft={mode.draft}
          refusal={mode.refusal}
          onDraftChange={(draft) => {
            setMode({ kind: 'add', draft, refusal: mode.refusal });
          }}
          onSave={() => {
            saveAdd(mode.draft);
          }}
          onCancel={() => {
            setMode({ kind: 'closed' });
          }}
        />
      ) : null}
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

interface ArtifactFormProps {
  readonly label: string;
  readonly draft: ArtifactRow;
  readonly refusals: Refusals;
  readonly onDraftChange: (draft: ArtifactRow) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

// The add form of an artifact (AC-025): a Label field, a Template field with its help text, Save and Cancel. A
// refused value shows its reason beneath its field; the form keeps what was typed.
function ArtifactForm({ label, draft, refusals, onDraftChange, onSave, onCancel }: ArtifactFormProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const labelId = `${idBase}-label`;
  const templateId = `${idBase}-template`;
  return (
    <Box role="group" aria-label={label} sx={styles.form}>
      <Typography component="label" htmlFor={labelId} sx={styles.fieldLabel}>
        Label
      </Typography>
      <TextField
        id={labelId}
        value={draft.label}
        error={refusals.label !== undefined}
        onChange={(event) => {
          onDraftChange({ ...draft, label: event.target.value });
        }}
        sx={styles.input}
        slotProps={{
          htmlInput: { 'aria-describedby': describedBy(refusals.label !== undefined, `${labelId}-refusal`) },
        }}
      />
      {refusals.label === undefined ? null : <Refusal id={`${labelId}-refusal`} reason={refusals.label} />}

      <Typography component="label" htmlFor={templateId} sx={styles.fieldLabel}>
        Template
      </Typography>
      <TextField
        id={templateId}
        multiline
        minRows={4}
        value={draft.template}
        error={refusals.template !== undefined}
        onChange={(event) => {
          onDraftChange({ ...draft, template: event.target.value });
        }}
        sx={styles.multilineInput}
        slotProps={{
          htmlInput: { 'aria-describedby': describedBy(refusals.template !== undefined, `${templateId}-refusal`) },
        }}
      />
      {refusals.template === undefined ? null : <Refusal id={`${templateId}-refusal`} reason={refusals.template} />}
      <Typography component="p" sx={styles.helpText}>
        {TEMPLATE_HELP_TEXT}
      </Typography>

      <Box sx={styles.formActions}>
        <Button variant="outlined" onClick={onCancel} sx={styles.cancelButton}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} sx={styles.saveButton}>
          Save
        </Button>
      </Box>
    </Box>
  );
}

// The outcome artifact list of a flow (F-11 AC-025; screens 03 and 10). A title with + in it, then one group per
// artifact as the screens draw it: a Label field with its minus on the right, then the Template box with its help
// text beneath. Editing is in place: a field is checked by the parser when it loses focus (or Enter in the label).
// A refused value shows its reason beneath its field and the field returns to the saved value. + opens an add form
// (Label, Template, Save and Cancel) after the list; it is closed until + is pressed.
export function ArtifactRows({ flowId, pipelineState, rules, onChange }: ArtifactListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [adding, setAdding] = useState<ArtifactAdd | undefined>(undefined);
  const [refused, setRefused] = useState<ArtifactRefusal | undefined>(undefined);
  // Bumped on each refusal and each removal. A field is keyed by it, so it is drawn again from the saved values.
  const [version, setVersion] = useState(0);
  const artifacts = flowOf(pipelineState, flowId).artifacts;

  function refuse(next: ArtifactRefusal) {
    setRefused(next);
    setVersion((current) => current + 1);
  }

  // The reason of a refused field or of a removal, when it is the one the list last refused at this position.
  function reasonAt(position: number, target: ArtifactRefusal['target']): string | undefined {
    return refused !== undefined && refused.position === position && refused.target === target ? refused.reason : undefined;
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
    refuse({ position, target: field, reason: result.reason });
  }

  function saveAdd(draft: ArtifactRow) {
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
      setVersion((current) => current + 1);
      return;
    }
    refuse({ position, target: 'removal', reason: result.reason });
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
            setAdding({ draft: EMPTY_ARTIFACT, refusals: {} });
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {artifacts.map((artifact, position) => {
        const labelId = `${idBase}-label-${position}`;
        const templateId = `${idBase}-template-${position}`;
        const labelRefusal = reasonAt(position, 'label');
        const templateRefusal = reasonAt(position, 'template');
        const removalRefusal = reasonAt(position, 'removal');
        return (
          <Box key={position} role="group" aria-label={`Artifact ${position + 1}`} sx={styles.artifact}>
            <Typography component="label" htmlFor={labelId} sx={styles.fieldLabel}>
              Label
            </Typography>
            <Box sx={styles.rowLine}>
              <TextField
                id={labelId}
                key={`label-${version}`}
                defaultValue={artifact.label}
                error={labelRefusal !== undefined}
                onBlur={(event) => {
                  commitField(position, 'label', event.target.value);
                }}
                sx={styles.input}
                slotProps={{
                  htmlInput: {
                    'aria-describedby': describedBy(labelRefusal !== undefined, `${labelId}-refusal`),
                    // Enter ends the edit of the one-line label, as losing focus does. Enter that ends an IME
                    // composition is not an edit end.
                    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
                    },
                  },
                }}
              />
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
            </Box>
            {labelRefusal === undefined ? null : <Refusal id={`${labelId}-refusal`} reason={labelRefusal} />}

            <Typography component="label" htmlFor={templateId} sx={styles.fieldLabel}>
              Template
            </Typography>
            <TextField
              id={templateId}
              key={`template-${version}`}
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
            {templateRefusal === undefined ? null : <Refusal id={`${templateId}-refusal`} reason={templateRefusal} />}
            <Typography component="p" sx={styles.helpText}>
              {TEMPLATE_HELP_TEXT}
            </Typography>
            {removalRefusal === undefined ? null : <Refusal id={`${idBase}-removal-${position}`} reason={removalRefusal} />}
          </Box>
        );
      })}

      {adding === undefined ? null : (
        <ArtifactForm
          label="New artifact"
          draft={adding.draft}
          refusals={adding.refusals}
          onDraftChange={(draft) => {
            setAdding({ draft, refusals: adding.refusals });
          }}
          onSave={() => {
            saveAdd(adding.draft);
          }}
          onCancel={() => {
            setAdding(undefined);
          }}
        />
      )}
    </Box>
  );
}
