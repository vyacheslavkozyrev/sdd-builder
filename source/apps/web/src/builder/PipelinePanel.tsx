import { useState } from 'react';
import { Box, TextField, Typography, useTheme } from '@mui/material';
import { bodyCounterText } from './FlowPanel.js';
import { getFlowPanelStyles } from './flowPanelStyles.js';
import type { Model, Pipeline, Rule } from './fields.js';
import { editPipelineField } from './pipelineFields.js';
import type { PipelineField, PipelineFieldResult } from './pipelineFields.js';
import { ArgumentRows, RuleTagRows } from './RowEditors.js';

// The pipeline panel of the Pipeline tab (F-11 AC-042, AC-043 to AC-045). It is shown when no flow and no
// arrow is selected, and holds the pipeline's own fields as screen 01 shows them: name, description,
// arguments, model, tools, rule tags and body. The body is optional (AC-044); its counter shows the count
// of the text shown, out of 1000.
//
// Each text, model and tools edit goes through the parser's field rules (pipelineFields.ts, which uses
// `parseProjectConfig` in core). An accepted edit is reported to the caller as the new pipeline. A refused
// edit keeps the saved value and shows the parser's reason beneath the field. The argument and rule tag
// lists are the row editors of RowEditors.tsx, the same ones the flow panel uses. The panel has no Delete
// control: the pipeline cannot be removed.

// The models offered by the model field (AC-045). The blank option unsets the model.
const MODELS: readonly Model[] = ['haiku', 'sonnet', 'opus', 'inherit'];

type TextFieldName = 'name' | 'description' | 'body' | 'tools';

// What the panel holds beyond the saved pipeline: the text as typed for the text fields, and the reason
// of each refused value.
interface EditState {
  readonly drafts: Partial<Record<TextFieldName, string | undefined>>;
  readonly refusals: Partial<Record<PipelineField, string | undefined>>;
}

export interface PipelinePanelProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly onChange: (pipelineState: Pipeline) => void;
}

const EMPTY_STATE: EditState = { drafts: {}, refusals: {} };

function isTextField(field: PipelineField): field is TextFieldName {
  return field === 'name' || field === 'description' || field === 'body' || field === 'tools';
}

// The tools as the field shows them: the saved list, comma-separated.
function toolsText(tools: readonly string[] | undefined): string {
  return (tools ?? []).join(', ');
}

export function PipelinePanel({ pipelineState, rules, onChange }: PipelinePanelProps) {
  const styles = getFlowPanelStyles(useTheme());
  const [state, setState] = useState<EditState>(EMPTY_STATE);

  const shownText = (field: TextFieldName): string => {
    const draft = state.drafts[field];
    if (draft !== undefined) return draft;
    switch (field) {
      case 'name':
        return pipelineState.name;
      case 'description':
        return pipelineState.description;
      case 'body':
        return pipelineState.body ?? '';
      case 'tools':
        return toolsText(pipelineState.tools);
    }
  };

  // Settles one edit of `field`. An accepted edit reports the new pipeline and clears the field's refusal;
  // a refused one records its reason and drops the text draft, so the saved value shows again.
  function settle(field: PipelineField, result: PipelineFieldResult, typed?: string) {
    const drafts = { ...state.drafts };
    if (isTextField(field)) {
      drafts[field] = result.ok ? typed : undefined;
    }
    const refusals = { ...state.refusals };
    refusals[field] = result.ok ? undefined : result.reason;
    if (result.ok) {
      onChange(result.pipeline);
    }
    setState({ drafts, refusals });
  }

  function editText(field: TextFieldName, value: string) {
    settle(field, editPipelineField(pipelineState, rules, { field, value }), value);
  }

  function editModel(value: string) {
    settle('model', editPipelineField(pipelineState, rules, { field: 'model', value: value === '' ? undefined : value }));
  }

  // The ids a field's input is described by: its refusal's id while a refusal shows, plus any extra ids.
  // Left unset when neither applies, so no attribute names an element that is not drawn.
  const describedBy = (field: PipelineField, ...extra: string[]): string | undefined => {
    const ids = state.refusals[field] === undefined ? extra : [...extra, `pipeline-${field}-refusal`];
    return ids.length === 0 ? undefined : ids.join(' ');
  };

  const refusal = (field: PipelineField) => {
    const reason = state.refusals[field];
    return reason === undefined ? null : (
      <Typography id={`pipeline-${field}-refusal`} component="p" sx={styles.refusal}>
        {reason}
      </Typography>
    );
  };

  const body = shownText('body');

  return (
    <Box sx={styles.root}>
      <Box sx={styles.scroll}>
        <Box sx={styles.group}>
          <Typography component="label" htmlFor="pipeline-name" sx={styles.fieldLabel}>
            Name
          </Typography>
          <TextField
            id="pipeline-name"
            value={shownText('name')}
            onChange={(event) => {
              editText('name', event.target.value);
            }}
            sx={styles.field}
            slotProps={{ htmlInput: { 'aria-describedby': describedBy('name') } }}
          />
        </Box>
        {refusal('name')}

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="pipeline-description" sx={styles.fieldLabel}>
            Description
          </Typography>
          <TextField
            id="pipeline-description"
            value={shownText('description')}
            onChange={(event) => {
              editText('description', event.target.value);
            }}
            sx={styles.field}
            slotProps={{ htmlInput: { 'aria-describedby': describedBy('description') } }}
          />
        </Box>
        {refusal('description')}

        <ArgumentRows target={{ kind: 'pipeline' }} pipelineState={pipelineState} rules={rules} onChange={onChange} />

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="pipeline-model" sx={styles.fieldLabel}>
            Model
          </Typography>
          <TextField
            id="pipeline-model"
            select
            value={pipelineState.model ?? ''}
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
        </Box>
        {refusal('model')}

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="pipeline-tools" sx={styles.fieldLabel}>
            Tools
          </Typography>
          <TextField
            id="pipeline-tools"
            value={shownText('tools')}
            onChange={(event) => {
              editText('tools', event.target.value);
            }}
            sx={styles.field}
            slotProps={{ htmlInput: { 'aria-describedby': describedBy('tools') } }}
          />
        </Box>
        {refusal('tools')}

        <RuleTagRows target={{ kind: 'pipeline' }} pipelineState={pipelineState} rules={rules} onChange={onChange} />

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="pipeline-body" sx={styles.fieldLabel}>
            Body
          </Typography>
          <TextField
            id="pipeline-body"
            multiline
            minRows={3}
            value={body}
            onChange={(event) => {
              editText('body', event.target.value);
            }}
            sx={styles.multilineField}
            slotProps={{ htmlInput: { 'aria-describedby': describedBy('body', 'pipeline-body-counter') } }}
          />
        </Box>
        <Typography id="pipeline-body-counter" component="p" sx={styles.counter}>
          {bodyCounterText(body)}
        </Typography>
        {refusal('body')}
      </Box>

      <Box sx={styles.footer}>
        <Typography component="p" sx={styles.footerNote}>
          The pipeline cannot be removed.
        </Typography>
      </Box>
    </Box>
  );
}
