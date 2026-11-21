import { useId, useState } from 'react';
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

type ArtifactMode =
  | { readonly kind: 'closed' }
  | { readonly kind: 'add'; readonly draft: ArtifactRow; readonly refusals: Refusals }
  | { readonly kind: 'edit'; readonly position: number; readonly draft: ArtifactRow; readonly refusals: Refusals };

const EMPTY_ARGUMENT: ArgumentRow = { id: '', required: false, hint: '' };
const EMPTY_ARTIFACT: ArtifactRow = { label: '', template: '' };
const ARTIFACT_FIELDS: readonly ArtifactField[] = ['label', 'template'];

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

// The first line of a template, shown in grey under the label of an artifact row.
function firstLine(template: string): string {
  return template.split('\n')[0] ?? '';
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

// The argument list (F-11 AC-024, AC-043): a title with + in it, then one row per argument. Each row holds
// its id, a required flag, a hint and a minus. A saved row is edited in place, and each change is checked
// by the parser at once. The + opens a new row with Save and Cancel, which the parser checks on Save.
export function ArgumentRows({ target, pipelineState, rules, onChange }: TargetListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [draft, setDraft] = useState<ArgumentRow | undefined>(undefined);
  const [refusal, setRefusal] = useState<RowRefusal | undefined>(undefined);
  const rows = argumentsOf(pipelineState, target);

  // An accepted edit is reported; a refused one keeps the saved pipeline and shows its reason at `row`.
  function accept(result: RowResult, row: RowKey): boolean {
    if (result.ok) {
      onChange(result.pipeline);
      setRefusal(undefined);
      return true;
    }
    setRefusal({ row, reason: result.reason });
    return false;
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
            setRefusal(undefined);
            setDraft(draft ?? EMPTY_ARGUMENT);
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {rows.map((item, position) => {
        const shownRefusal = refusal !== undefined && refusal.row === position;
        const refusalId = `${idBase}-argument-${position + 1}-refusal`;
        return (
          <Box key={position} role="group" aria-label={`Argument ${position + 1}`} sx={styles.row}>
            <Box sx={styles.rowLine}>
              <TextField
                value={item.id}
                onChange={(event) => {
                  accept(
                    editArgumentAt(pipelineState, rules, target, position, { ...rowOf(item), id: event.target.value }),
                    position,
                  );
                }}
                sx={styles.input}
                slotProps={{
                  htmlInput: {
                    'aria-label': `Argument ${position + 1} id`,
                    'aria-describedby': describedBy(shownRefusal, refusalId),
                  },
                }}
              />
              <FormControlLabel
                sx={styles.checkbox}
                control={
                  <Checkbox
                    checked={item.required}
                    onChange={(event) => {
                      accept(
                        editArgumentAt(pipelineState, rules, target, position, {
                          ...rowOf(item),
                          required: event.target.checked,
                        }),
                        position,
                      );
                    }}
                  />
                }
                label={<Box component="span" sx={styles.checkboxLabel}>required</Box>}
              />
              <Button
                variant="outlined"
                aria-label={`Remove argument ${position + 1}`}
                onClick={() => {
                  onChange(removeArgumentAt(pipelineState, target, position));
                  setRefusal(undefined);
                }}
                sx={styles.minusButton}
              >
                −
              </Button>
            </Box>
            <TextField
              placeholder="Hint"
              value={item.hint}
              onChange={(event) => {
                accept(
                  editArgumentAt(pipelineState, rules, target, position, { ...rowOf(item), hint: event.target.value }),
                  position,
                );
              }}
              sx={styles.input}
              slotProps={{
                htmlInput: {
                  'aria-label': `Argument ${position + 1} hint`,
                  'aria-describedby': describedBy(shownRefusal, refusalId),
                },
              }}
            />
            {shownRefusal ? <Refusal id={refusalId} reason={refusal.reason} /> : null}
          </Box>
        );
      })}

      {draft === undefined ? null : (
        <Box role="group" aria-label="New argument" sx={styles.form}>
          <TextField
            placeholder="Id"
            value={draft.id}
            onChange={(event) => {
              setDraft({ ...draft, id: event.target.value });
            }}
            sx={styles.input}
            slotProps={{ htmlInput: { 'aria-label': 'New argument id' } }}
          />
          <FormControlLabel
            sx={styles.checkbox}
            control={
              <Checkbox
                checked={draft.required}
                onChange={(event) => {
                  setDraft({ ...draft, required: event.target.checked });
                }}
              />
            }
            label={<Box component="span" sx={styles.checkboxLabel}>required</Box>}
          />
          <TextField
            placeholder="Hint"
            value={draft.hint}
            onChange={(event) => {
              setDraft({ ...draft, hint: event.target.value });
            }}
            sx={styles.input}
            slotProps={{ htmlInput: { 'aria-label': 'New argument hint' } }}
          />
          {refusal !== undefined && refusal.row === 'new' ? <Refusal id={`${idBase}-argument-new-refusal`} reason={refusal.reason} /> : null}
          <Box sx={styles.formActions}>
            <Button
              variant="outlined"
              onClick={() => {
                setDraft(undefined);
                setRefusal(undefined);
              }}
              sx={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (accept(addArgumentTo(pipelineState, rules, target, draft), 'new')) setDraft(undefined);
              }}
              sx={styles.saveButton}
            >
              Save
            </Button>
          </Box>
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

interface ArtifactFormProps {
  readonly label: string;
  readonly draft: ArtifactRow;
  readonly refusals: Refusals;
  readonly onDraftChange: (draft: ArtifactRow) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

// The form of an artifact, for Add and for Edit: a Label field, a Template field, Save and Cancel. A refused
// value shows its reason beneath its field; the form keeps what was typed for an add.
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

// The outcome artifact list of a flow (F-11 AC-025): a title with + in it, then one row per artifact with its
// bold label, the first line of its template in grey, and Edit and Remove. Edit opens the form in place of the
// row; Add opens an empty form after the list. Save applies the changed fields through the parser; a refused
// field shows the reason and returns to the saved value, and the other fields that the parser accepts are saved.
export function ArtifactRows({ flowId, pipelineState, rules, onChange }: ArtifactListProps) {
  const styles = getRowEditorStyles(useTheme());
  const idBase = useId();
  const [mode, setMode] = useState<ArtifactMode>({ kind: 'closed' });
  const [rowRefusal, setRowRefusal] = useState<{ readonly position: number; readonly reason: string } | undefined>(
    undefined,
  );
  const artifacts = flowOf(pipelineState, flowId).artifacts;

  function saveAdd(draft: ArtifactRow) {
    const result = addFlowArtifact(pipelineState, rules, flowId, draft);
    if (result.ok) {
      onChange(result.pipeline);
      setMode({ kind: 'closed' });
      return;
    }
    setMode({ kind: 'add', draft, refusals: refusalFor(result.field, result.reason) });
  }

  function saveEdit(position: number, draft: ArtifactRow) {
    const saved = artifactAt(pipelineState, flowId, position);
    let current = pipelineState;
    const refusals: Refusals = {};
    for (const field of ARTIFACT_FIELDS) {
      if (draft[field] === saved[field]) continue;
      const result = editFlowArtifact(current, rules, flowId, position, { field, value: draft[field] });
      if (result.ok) {
        current = result.pipeline;
      } else {
        refusals[field] = result.reason;
      }
    }
    if (current !== pipelineState) onChange(current);
    if (Object.keys(refusals).length === 0) {
      setMode({ kind: 'closed' });
      return;
    }
    setMode({ kind: 'edit', position, draft: artifactAt(current, flowId, position), refusals });
  }

  function removeArtifact(position: number) {
    const result = removeFlowArtifact(pipelineState, rules, flowId, position);
    if (result.ok) {
      onChange(result.pipeline);
      setRowRefusal(undefined);
      setMode({ kind: 'closed' });
      return;
    }
    setRowRefusal({ position, reason: result.reason });
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
            setRowRefusal(undefined);
            setMode({ kind: 'add', draft: EMPTY_ARTIFACT, refusals: {} });
          }}
          sx={styles.addButton}
        >
          +
        </Button>
      </Box>

      {artifacts.map((artifact, position) => {
        if (mode.kind === 'edit' && mode.position === position) {
          return (
            <ArtifactForm
              key={position}
              label={`Artifact ${position + 1}`}
              draft={mode.draft}
              refusals={mode.refusals}
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
        const shownRefusal = rowRefusal !== undefined && rowRefusal.position === position;
        return (
          <Box key={position} role="group" aria-label={`Artifact ${position + 1}`} sx={styles.row}>
            <Box sx={styles.nameLine}>
              <Typography component="p" sx={styles.artifactLabel}>
                {artifact.label}
              </Typography>
              <Box sx={styles.linkRow}>
                <Button
                  variant="text"
                  onClick={() => {
                    setRowRefusal(undefined);
                    setMode({ kind: 'edit', position, draft: artifactAt(pipelineState, flowId, position), refusals: {} });
                  }}
                  sx={styles.linkButton}
                >
                  Edit
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    removeArtifact(position);
                  }}
                  sx={styles.linkButton}
                >
                  Remove
                </Button>
              </Box>
            </Box>
            <Typography component="p" sx={styles.artifactTemplate}>
              {firstLine(artifact.template)}
            </Typography>
            {shownRefusal ? <Refusal id={`${idBase}-artifact-${position + 1}-refusal`} reason={rowRefusal.reason} /> : null}
          </Box>
        );
      })}

      {mode.kind === 'add' ? (
        <ArtifactForm
          label="New artifact"
          draft={mode.draft}
          refusals={mode.refusals}
          onDraftChange={(draft) => {
            setMode({ kind: 'add', draft, refusals: mode.refusals });
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
