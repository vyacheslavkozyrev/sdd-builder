import { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { pipeline } from '@sddbuilder/core';
import { codePointCount } from '../wizard/project.js';
import {
  applyFlowField,
  applyPipelineField,
  type FieldResult,
  type FlowEdit,
  type PipelineEdit,
} from './fields.js';
import { panelFor, type FieldKey, type FieldValue, type PanelField, type Selection } from './panel.js';
import { ArgumentRows } from './ArgumentRows.js';

type Pipeline = pipeline.Pipeline;
type Gate = pipeline.Gate;
type Model = pipeline.Model;

// The properties panel on the right of the Pipeline tab (F-11 AC-023, AC-025, AC-026, AC-027, AC-028, AC-034).
// It renders `panelFor` for the selection. An edit goes to `applyPipelineField` or `applyFlowField`: an accepted
// edit is passed to `onChange`; a refused one keeps the saved value in the field and shows the reason beneath it
// (owner decision, 2026-11-17). Text is committed on blur or Enter, so a refusal does not undo typing. The panel
// has no switch-off (decision 34) and only Delete on a flow. Its layout follows the approved screens in
// spec/design/features/F-11-pipeline-builder/ (01, 04 and 09).

const PANEL_LABEL = 'Properties';
const PIPELINE_HEADING = 'Pipeline properties';
const PIPELINE_FOOTER_NOTE = 'The pipeline cannot be removed.';
const DELETE_FLOW_LABEL = 'Delete flow';
const NOT_SET_LABEL = 'not set';
const REFUSED_PREFIX = 'Refused: ';
const REQUIRED_SUFFIX = ' · required';

// The body limit in code points (ui.md §3, decision 26). The parser enforces it; the counter shows it.
export const BODY_LIMIT = 1000;

const PANEL_SX = { display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', minWidth: 0 } as const;
const HEADING_SX = { fontSize: 13, fontWeight: 700, color: '#0f172a' } as const;
const FILE_SX = { fontSize: 11, color: '#64748b' } as const;
const LABEL_SX = { fontSize: 12, fontWeight: 600, color: '#334155' } as const;
const VALUE_SX = { fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;
const COUNTER_SX = { fontSize: 11, color: '#64748b', textAlign: 'right' } as const;
const NOTE_SX = { fontSize: 11, color: '#64748b' } as const;

export interface PropertiesPanelProps {
  readonly pipeline: Pipeline;
  readonly selection: Selection | undefined;
  readonly onChange: (next: Pipeline) => void;
  // Called with the flow's id. The confirmation is added later (F-11 AC-031); this panel deletes at once.
  readonly onDelete: (flowId: string) => void;
}

export function PropertiesPanel({ pipeline: config, selection, onChange, onDelete }: PropertiesPanelProps) {
  const content = panelFor(selection, config);
  const selectionKey = keyOf(selection);

  const apply = (key: FieldKey, raw: string): string | undefined => {
    const result = resultFor(config, selection, key, raw);
    if (!result.ok) {
      return result.reason;
    }
    onChange(result.pipeline);
    return undefined;
  };

  return (
    <Box component="section" aria-label={PANEL_LABEL} sx={PANEL_SX}>
      <Typography sx={HEADING_SX}>{headingFor(selection, content.heading)}</Typography>
      {content.file === undefined ? null : <Typography sx={FILE_SX}>{`Generates ${content.file}`}</Typography>}
      {content.fields.map((field) => (
        <Box key={`${selectionKey}:${field.key}`}>{renderField(field, selection, apply, config, onChange)}</Box>
      ))}
      {footerFor(selection, onDelete)}
    </Box>
  );
}

function keyOf(selection: Selection | undefined): string {
  if (selection === undefined || selection.kind === 'pipeline') {
    return 'pipeline';
  }
  return selection.kind === 'flow' ? `flow:${selection.id}` : `arrow:${selection.source}`;
}

function headingFor(selection: Selection | undefined, heading: string): string {
  if (selection === undefined || selection.kind === 'pipeline') {
    return PIPELINE_HEADING;
  }
  return selection.kind === 'flow' ? `Flow: ${heading}` : heading;
}

function footerFor(selection: Selection | undefined, onDelete: (flowId: string) => void) {
  if (selection === undefined || selection.kind === 'pipeline') {
    return <Typography sx={NOTE_SX}>{PIPELINE_FOOTER_NOTE}</Typography>;
  }
  if (selection.kind === 'flow') {
    return (
      <Button color="error" variant="outlined" onClick={() => onDelete(selection.id)} sx={{ alignSelf: 'flex-start' }}>
        {DELETE_FLOW_LABEL}
      </Button>
    );
  }
  return null;
}

type Apply = (key: FieldKey, raw: string) => string | undefined;

function renderField(
  field: PanelField,
  selection: Selection | undefined,
  apply: Apply,
  config: Pipeline,
  onChange: (next: Pipeline) => void,
) {
  const label = selection?.kind === 'flow' && field.key === 'name' ? `${field.label}${REQUIRED_SUFFIX}` : field.label;
  switch (field.key) {
    case 'label':
    case 'source':
    case 'target':
      return <ReadOnly label={label}>{textOf(field.value)}</ReadOnly>;
    case 'gate':
      return isGate(field.value) ? <GateText label={label} gate={field.value} /> : null;
    case 'model':
      return <ModelSelect id={`field-${field.key}`} label={label} value={textOf(field.value)} onCommit={(raw) => apply('model', raw)} />;
    case 'arguments':
      if (typeof field.value !== 'string') {
        return <ArgumentRows label={label} pipeline={config} onChange={onChange} />;
      }
      return <EditText id={`field-${field.key}`} label={label} value={field.value} multiline={false} counted={false} onCommit={(raw) => apply('arguments', raw)} />;
    case 'body':
      return <EditText id={`field-${field.key}`} label={label} value={textOf(field.value)} multiline counted onCommit={(raw) => apply('body', raw)} />;
    default:
      return <EditText id={`field-${field.key}`} label={label} value={textOf(field.value)} multiline={false} counted={false} onCommit={(raw) => apply(field.key, raw)} />;
  }
}

function resultFor(config: Pipeline, selection: Selection | undefined, key: FieldKey, raw: string): FieldResult {
  if (selection === undefined || selection.kind === 'pipeline') {
    return applyPipelineField(config, pipelineEdit(key, raw));
  }
  if (selection.kind === 'flow') {
    return applyFlowField(config, selection.id, flowEdit(key, raw));
  }
  throw new Error('F-11: the fields of an arrow are shown, not edited, in this panel.');
}

// The typed edit for a pipeline field from the text the user committed. An empty body or list means no value.
function pipelineEdit(key: FieldKey, raw: string): PipelineEdit {
  switch (key) {
    case 'name':
      return { field: 'name', value: raw };
    case 'description':
      return { field: 'description', value: raw };
    case 'body':
      return { field: 'body', value: bodyOf(raw) };
    case 'model':
      return { field: 'model', value: modelOf(raw) };
    case 'tools':
      return { field: 'tools', value: listOf(raw) };
    case 'ruleTags':
      return { field: 'ruleTags', value: listOf(raw) };
    default:
      throw new Error(`F-11: the pipeline field ${key} is not edited in this panel.`);
  }
}

function flowEdit(key: FieldKey, raw: string): FlowEdit {
  switch (key) {
    case 'name':
      return { field: 'name', value: raw };
    case 'description':
      return { field: 'description', value: raw };
    case 'arguments':
      return { field: 'arguments', value: raw };
    case 'model':
      return { field: 'model', value: modelOf(raw) };
    case 'body':
      return { field: 'body', value: bodyOf(raw) };
    default:
      throw new Error(`F-11: the flow field ${key} is not edited in this panel.`);
  }
}

function bodyOf(raw: string): string | undefined {
  return raw === '' ? undefined : raw;
}

// The model from the select's value. The empty option is "not set", which removes the field.
function modelOf(raw: string): Model | undefined {
  return pipeline.MODELS.find((model) => model === raw);
}

// The comma-separated tools or rule tags as a list; nothing left means no list.
function listOf(raw: string): string[] | undefined {
  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
  return items.length === 0 ? undefined : items;
}

// The text a field shows: the value itself, or a list joined with commas. Nothing set shows an empty text.
function textOf(value: FieldValue): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join(', ');
  }
  return '';
}

function isGate(value: FieldValue): value is Gate {
  return typeof value === 'object' && value !== undefined && 'kind' in value;
}

interface EditTextProps {
  readonly id: string;
  readonly label: string;
  // The saved value. A refused edit returns the field to it.
  readonly value: string;
  readonly multiline: boolean;
  // Shows the code-point counter against BODY_LIMIT.
  readonly counted: boolean;
  readonly onCommit: (raw: string) => string | undefined;
}

// A text field that commits on blur, or on Enter for a single line. It keeps a draft while the user types. A
// refused commit puts the saved value back in the field and shows the reason beneath it (AC-027, AC-028).
function EditText({ id, label, value, multiline, counted, onCommit }: EditTextProps) {
  const [draft, setDraft] = useState(value);
  const [reason, setReason] = useState<string | undefined>(undefined);

  // A saved value that changes (an accepted edit, or a change from elsewhere) replaces the draft and clears the reason.
  useEffect(() => {
    setDraft(value);
    setReason(undefined);
  }, [value]);

  const commit = (): void => {
    if (draft === value) {
      return;
    }
    const refusal = onCommit(draft);
    if (refusal !== undefined) {
      setDraft(value);
      setReason(refusal);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <TextField
        id={id}
        label={label}
        size="small"
        fullWidth
        multiline={multiline}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (!multiline && event.key === 'Enter') {
            commit();
          }
        }}
        error={reason !== undefined}
        helperText={reason === undefined ? undefined : `${REFUSED_PREFIX}${reason}`}
      />
      {counted ? (
        <Typography sx={COUNTER_SX}>{`${codePointCount(draft)} / ${BODY_LIMIT} characters`}</Typography>
      ) : null}
    </Box>
  );
}

interface ModelSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onCommit: (raw: string) => string | undefined;
}

// The model select. The saved value stays selected when an edit is refused; the reason shows beneath.
function ModelSelect({ id, label, value, onCommit }: ModelSelectProps) {
  const [reason, setReason] = useState<string | undefined>(undefined);
  return (
    <TextField
      id={id}
      select
      label={label}
      size="small"
      fullWidth
      value={value}
      onChange={(event) => setReason(onCommit(event.target.value))}
      error={reason !== undefined}
      helperText={reason === undefined ? undefined : `${REFUSED_PREFIX}${reason}`}
    >
      <MenuItem value="">{NOT_SET_LABEL}</MenuItem>
      {pipeline.MODELS.map((model) => (
        <MenuItem key={model} value={model}>
          {model}
        </MenuItem>
      ))}
    </TextField>
  );
}

function ReadOnly({ label, children }: { readonly label: string; readonly children: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={LABEL_SX}>{label}</Typography>
      <Typography sx={VALUE_SX}>{children}</Typography>
    </Box>
  );
}

// The gate on an arrow: its kind and decider, its description and, for a check, its type and threshold.
function GateText({ label, gate }: { readonly label: string; readonly gate: Gate }) {
  const lines: string[] = [gate.kind === 'approval' ? 'approval · human' : 'checks · agent'];
  if (gate.description !== '') {
    lines.push(gate.description);
  }
  if (gate.kind === 'check') {
    lines.push(gate.threshold === undefined ? `type ${gate.type}` : `type ${gate.type}, threshold ${gate.threshold}`);
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={LABEL_SX}>{label}</Typography>
      {lines.map((line, index) => (
        <Typography key={index} sx={VALUE_SX}>
          {line}
        </Typography>
      ))}
    </Box>
  );
}
