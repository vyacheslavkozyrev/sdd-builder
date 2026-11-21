import { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography, useTheme } from '@mui/material';
import { codePointCount } from '../wizard/project.js';
import { deleteFlow } from './delete.js';
import { editFlowField, setFlowApproval } from './fields.js';
import type { Model, Pipeline, RowResult, Rule } from './fields.js';
import type { Flow } from './model.js';
import { ArgumentRows, ArtifactRows, RuleTagRows } from './RowEditors.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { getFlowPanelStyles } from './flowPanelStyles.js';

// The flow panel of the Pipeline tab (F-11 AC-019, AC-020 to AC-023, AC-027, AC-028). It shows the
// fields of the selected flow in this order: name, description, arguments, model, body, outcome
// artifacts, rule tags, Human approval. The argument, artifact and rule tag lists are the row editors of
// RowEditors.tsx, the same ones the pipeline panel uses. There is no checks field and no next-flow field.
//
// Each edit goes through the parser's field rules (fields.ts). An accepted edit is reported to the
// caller as the new pipeline. A refused edit keeps the saved value in the field and shows the parser's
// reason beneath it. A text field keeps what was typed while the edit is accepted, because a name is
// trimmed when it is saved; the text is cleared back to the saved value when the edit is refused.
//
// The footer holds Delete flow (AC-019, AC-029). It asks first; only Confirm removes the flow, through
// deleteFlow, and reports the new pipeline to `onDelete`. Cancel changes nothing.

// The body limit of the flow body (F-11 AC-022), counted in code points. The parser enforces it.
const BODY_LIMIT = 1000;

// The models offered by the model field (AC-023). The blank option unsets the model.
const MODELS: readonly Model[] = ['haiku', 'sonnet', 'opus', 'inherit'];

type TextFieldName = 'name' | 'description' | 'body';
type FieldName = TextFieldName | 'model' | 'approval';

// What the panel holds beyond the saved pipeline: the text as typed for the text fields, and the reason
// of each refused value. The state belongs to one flow; a different flow starts with none.
interface EditState {
  readonly flowId: string;
  readonly drafts: Partial<Record<TextFieldName, string | undefined>>;
  readonly refusals: Partial<Record<FieldName, string | undefined>>;
}

export interface FlowPanelProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly flow: Flow;
  readonly onChange: (pipelineState: Pipeline) => void;
  readonly onDelete: (pipelineState: Pipeline) => void;
}

function emptyState(flowId: string): EditState {
  return { flowId, drafts: {}, refusals: {} };
}

function isTextField(field: FieldName): field is TextFieldName {
  return field === 'name' || field === 'description' || field === 'body';
}

// The counter under the body: the count of the text shown, with the limit, as "n / 1000 characters".
export function bodyCounterText(body: string): string {
  return `${codePointCount(body)} / ${BODY_LIMIT} characters`;
}

export function FlowPanel({ pipelineState, rules, flow, onChange, onDelete }: FlowPanelProps) {
  const styles = getFlowPanelStyles(useTheme());
  const [edits, setEdits] = useState<EditState>(() => emptyState(flow.id));
  const [confirming, setConfirming] = useState(false);
  const state = edits.flowId === flow.id ? edits : emptyState(flow.id);

  const shownText = (field: TextFieldName): string => state.drafts[field] ?? flow[field] ?? '';

  // Settles one edit of `field`. An accepted edit reports the new pipeline and clears the field's refusal;
  // a refused one records its reason and drops the text draft, so the saved value shows again.
  function settle(field: FieldName, result: RowResult, typed?: string) {
    const drafts = { ...state.drafts };
    if (isTextField(field)) {
      drafts[field] = result.ok ? typed : undefined;
    }
    const refusals = { ...state.refusals };
    refusals[field] = result.ok ? undefined : result.reason;
    if (result.ok) {
      onChange(result.pipeline);
    }
    setEdits({ flowId: flow.id, drafts, refusals });
  }

  function editText(field: TextFieldName, value: string) {
    settle(field, editFlowField(pipelineState, rules, flow.id, { field, value }), value);
  }

  function editModel(value: string) {
    settle('model', editFlowField(pipelineState, rules, flow.id, { field: 'model', value: value === '' ? undefined : value }));
  }

  function setApproval(approval: boolean) {
    settle('approval', setFlowApproval(pipelineState, rules, flow.id, approval));
  }

  // The ids a field's input is described by: its refusal's id while a refusal shows, plus any extra ids.
  // Left unset when neither applies, so no attribute names an element that is not drawn.
  const describedBy = (field: FieldName, ...extra: string[]): string | undefined => {
    const ids = state.refusals[field] === undefined ? extra : [...extra, `flow-${field}-refusal`];
    return ids.length === 0 ? undefined : ids.join(' ');
  };

  const refusal = (field: FieldName) => {
    const reason = state.refusals[field];
    return reason === undefined ? null : (
      <Typography id={`flow-${field}-refusal`} component="p" sx={styles.refusal}>
        {reason}
      </Typography>
    );
  };

  const body = shownText('body');

  return (
    <Box sx={styles.root}>
      <Box sx={styles.scroll}>
        <Typography component="label" htmlFor="flow-name" sx={styles.fieldLabel}>
          Name
        </Typography>
        <TextField
          id="flow-name"
          value={shownText('name')}
          onChange={(event) => {
            editText('name', event.target.value);
          }}
          sx={styles.field}
          slotProps={{ htmlInput: { 'aria-describedby': describedBy('name') } }}
        />
        {refusal('name')}

        <Typography component="label" htmlFor="flow-description" sx={styles.fieldLabel}>
          Description
        </Typography>
        <TextField
          id="flow-description"
          value={shownText('description')}
          onChange={(event) => {
            editText('description', event.target.value);
          }}
          sx={styles.field}
          slotProps={{ htmlInput: { 'aria-describedby': describedBy('description') } }}
        />
        {refusal('description')}

        <ArgumentRows
          key={`${flow.id}-arguments`}
          target={{ kind: 'flow', flowId: flow.id }}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <Typography component="label" htmlFor="flow-model" sx={styles.fieldLabel}>
          Model
        </Typography>
        <TextField
          id="flow-model"
          select
          value={flow.model ?? ''}
          onChange={(event) => {
            editModel(event.target.value);
          }}
          sx={styles.select}
          slotProps={{ select: { native: true }, htmlInput: { 'aria-describedby': describedBy('model') } }}
        >
          <option value="" />
          {MODELS.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </TextField>
        {refusal('model')}

        <Typography component="label" htmlFor="flow-body" sx={styles.fieldLabel}>
          Body · required
        </Typography>
        <TextField
          id="flow-body"
          multiline
          minRows={3}
          value={body}
          onChange={(event) => {
            editText('body', event.target.value);
          }}
          sx={styles.multilineField}
          slotProps={{ htmlInput: { 'aria-describedby': describedBy('body', 'flow-body-counter') } }}
        />
        <Typography id="flow-body-counter" component="p" sx={styles.counter}>
          {bodyCounterText(body)}
        </Typography>
        {refusal('body')}

        <ArtifactRows
          key={`${flow.id}-artifacts`}
          flowId={flow.id}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <RuleTagRows
          key={`${flow.id}-rule-tags`}
          target={{ kind: 'flow', flowId: flow.id }}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <FormControlLabel
          sx={styles.approval}
          control={
            <Checkbox
              checked={flow.approval}
              onChange={(event) => {
                setApproval(event.target.checked);
              }}
            />
          }
          label={<Box component="span" sx={styles.approvalLabel}>Human approval</Box>}
        />
        {refusal('approval')}
      </Box>

      <Box sx={styles.footer}>
        <Button
          variant="contained"
          onClick={() => {
            setConfirming(true);
          }}
          sx={styles.deleteButton}
        >
          Delete flow
        </Button>
      </Box>

      <ConfirmDialog
        open={confirming}
        title={`Delete flow ${flow.name}?`}
        text="Are you sure you want to delete this flow?"
        confirmLabel="Delete flow"
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          onDelete(deleteFlow(pipelineState, flow.id));
        }}
      />
    </Box>
  );
}
