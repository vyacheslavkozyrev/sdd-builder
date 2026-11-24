import { useState } from 'react';
import { Box, TextField, Typography, useTheme } from '@mui/material';
import { bodyCounterText } from './FlowPanel.js';
import { AgentLabelRows, AgentToolRows } from './AgentRows.js';
import { setAgentModel } from './blockAgentFields.js';
import { editAgentField, type AgentBlock, type AgentField } from './blockFields.js';
import { getBlockPanelStyles } from './blockPanelStyles.js';
import type { Model, Pipeline, Rule } from './fields.js';
import type { Flow } from './model.js';
import { ArgumentRows, RuleTagRows } from './RowEditors.js';

// The block panels of the flow tab (F-12 AC-022 to AC-028). This file holds the Agent panel, as screen 02
// draws it: a title "Agent: <name>", the subtitle "Agent block in the <flow> flow", then Name, Description,
// Arguments, Model, Tools, Reads, Writes, Rule tags and Body with its counter, in the order of AC-022. The
// Delete control comes in T021.
//
// Each edit goes through the parser (blockFields.ts and blockAgentFields.ts). An accepted edit is reported to
// the caller as the new pipeline. A refused edit keeps the saved value in the field and shows its reason
// beneath the field. A text field keeps what was typed while the edit is accepted; a refused text is shown
// as the saved value again. The drafts belong to the flow and block they were typed for (`target`); another
// block starts with none.
// Only the edited Agent changes (AC-029).

// The models offered by the model field (AC-025). The blank option unsets the model.
const MODELS: readonly Model[] = ['haiku', 'sonnet', 'opus', 'inherit'];

type TextFieldName = AgentField;
type FieldName = TextFieldName | 'model';

// The result of one edit as the panel settles it: the new pipeline, or the reason for the field refused.
type PanelResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// What the panel holds beyond the saved pipeline: the text as typed for the text fields, and the reason of
// each refused value. The state belongs to one block; another block starts with none.
interface EditState {
  readonly target: string;
  readonly drafts: Partial<Record<TextFieldName, string | undefined>>;
  readonly refusals: Partial<Record<FieldName, string | undefined>>;
}

export interface AgentPanelProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly flow: Flow;
  readonly block: AgentBlock;
  readonly onChange: (pipelineState: Pipeline) => void;
}

function emptyState(target: string): EditState {
  return { target, drafts: {}, refusals: {} };
}

function isTextField(field: FieldName): field is TextFieldName {
  return field === 'name' || field === 'description' || field === 'body';
}

export function AgentPanel({ pipelineState, rules, flow, block, onChange }: AgentPanelProps) {
  const styles = getBlockPanelStyles(useTheme());
  const target = `${flow.id}/${block.id}`;
  const [edits, setEdits] = useState<EditState>(() => emptyState(target));
  const state = edits.target === target ? edits : emptyState(target);

  const shownText = (field: TextFieldName): string => state.drafts[field] ?? block[field] ?? '';

  // Settles one edit of `field`. An accepted edit reports the new pipeline and clears the field's refusal;
  // a refused one records its reason and drops the text draft, so the saved value shows again.
  function settle(field: FieldName, result: PanelResult, typed?: string) {
    const drafts = { ...state.drafts };
    if (isTextField(field)) {
      drafts[field] = result.ok ? typed : undefined;
    }
    const refusals = { ...state.refusals };
    refusals[field] = result.ok ? undefined : result.reason;
    if (result.ok) {
      onChange(result.pipeline);
    }
    setEdits({ target, drafts, refusals });
  }

  function editText(field: TextFieldName, value: string) {
    settle(field, editAgentField(pipelineState, rules, flow.id, block.id, { field, value }), value);
  }

  function editModel(value: string) {
    settle('model', setAgentModel(pipelineState, rules, flow.id, block.id, value === '' ? undefined : value));
  }

  // The ids a field's input is described by: its refusal's id while a refusal shows, plus any extra ids.
  // Left unset when neither applies, so no attribute names an element that is not drawn.
  const describedBy = (field: FieldName, ...extra: string[]): string | undefined => {
    const ids = state.refusals[field] === undefined ? extra : [...extra, `block-agent-${field}-refusal`];
    return ids.length === 0 ? undefined : ids.join(' ');
  };

  const refusal = (field: FieldName) => {
    const reason = state.refusals[field];
    return reason === undefined ? null : (
      <Typography id={`block-agent-${field}-refusal`} component="p" sx={styles.refusal}>
        {reason}
      </Typography>
    );
  };

  const body = shownText('body');

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="h2" sx={styles.title}>
          {`Agent: ${block.name}`}
        </Typography>
        <Typography component="p" sx={styles.subtitle}>
          {`Agent block in the ${flow.name} flow`}
        </Typography>
      </Box>

      <Box sx={styles.scroll}>
        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-agent-name" sx={styles.fieldLabel}>
            Name
          </Typography>
          <TextField
            id="block-agent-name"
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
          <Typography component="label" htmlFor="block-agent-description" sx={styles.fieldLabel}>
            Description
          </Typography>
          <TextField
            id="block-agent-description"
            value={shownText('description')}
            onChange={(event) => {
              editText('description', event.target.value);
            }}
            sx={styles.field}
            slotProps={{ htmlInput: { 'aria-describedby': describedBy('description') } }}
          />
        </Box>
        {refusal('description')}

        <ArgumentRows
          key={`${target}-arguments`}
          target={{ kind: 'agent', flowId: flow.id, blockId: block.id }}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-agent-model" sx={styles.fieldLabel}>
            Model
          </Typography>
          <TextField
            id="block-agent-model"
            select
            value={block.model ?? ''}
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

        <AgentToolRows
          key={`${target}-tools`}
          flowId={flow.id}
          blockId={block.id}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <AgentLabelRows
          key={`${target}-reads`}
          list="reads"
          flowId={flow.id}
          blockId={block.id}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <AgentLabelRows
          key={`${target}-writes`}
          list="writes"
          flowId={flow.id}
          blockId={block.id}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <RuleTagRows
          key={`${target}-rule-tags`}
          target={{ kind: 'agent', flowId: flow.id, blockId: block.id }}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-agent-body" sx={styles.fieldLabel}>
            Body · required
          </Typography>
          <TextField
            id="block-agent-body"
            multiline
            minRows={3}
            value={body}
            onChange={(event) => {
              editText('body', event.target.value);
            }}
            sx={styles.multilineField}
            slotProps={{ htmlInput: { 'aria-describedby': describedBy('body', 'block-agent-body-counter') } }}
          />
          <Typography id="block-agent-body-counter" component="p" sx={styles.counter}>
            {bodyCounterText(body)}
          </Typography>
        </Box>
        {refusal('body')}
      </Box>
    </Box>
  );
}
