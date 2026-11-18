import { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import type { pipeline } from '@sddbuilder/core';
import { applyPipelineField } from './fields.js';

type Pipeline = pipeline.Pipeline;
type Argument = pipeline.Argument;

// The pipeline's arguments as rows on the Pipeline panel (F-11 AC-025, AC-027; screen 09). A row shows its id, then
// "required" when it is, then its hint. Add, Edit and Remove each build the new list and send it to
// `applyPipelineField` 'arguments', so the parser's refusals apply. An accepted list is passed to `onChange`. A refused
// edit of a saved row keeps the saved row and shows the reason beneath it; a refused new row stays open, not saved.
// A repeated id names the row that already uses it (screen 09).

// The parser's message for a repeated id, as the end of the refusal. A refusal that ends so is named by row.
const DUPLICATE_ID_END = 'duplicates the id of an earlier flow, block or argument.';
const REFUSED_PREFIX = 'Refused: ';
const REQUIRED_SUFFIX = ' · required';

const ROW_SX = { display: 'flex', flexDirection: 'column', gap: 0.5 } as const;
const LABEL_SX = { fontSize: 12, fontWeight: 600, color: '#334155' } as const;
const VALUE_SX = { fontSize: 13, color: '#0f172a', overflowWrap: 'anywhere' } as const;
const SMALL_SX = { fontSize: 11, color: '#64748b' } as const;
const REFUSED_SX = { fontSize: 11, color: '#b91c1c' } as const;
const ACTIONS_SX = { display: 'flex', gap: 1 } as const;

interface Draft {
  readonly id: string;
  readonly required: boolean;
  readonly hint: string;
}

// The row being edited. Its index is the list's length for a new row, which is not saved yet.
interface Editing {
  readonly index: number;
  readonly draft: Draft;
}

// The refusal beneath the row at `index`: a saved row, or the new row when `index` is the list's length.
interface Notice {
  readonly index: number;
  readonly text: string;
}

export interface ArgumentRowsProps {
  readonly label: string;
  readonly pipeline: Pipeline;
  readonly onChange: (next: Pipeline) => void;
}

export function ArgumentRows({ label, pipeline: config, onChange }: ArgumentRowsProps) {
  const rows = config.arguments;
  const [editing, setEditing] = useState<Editing | undefined>(undefined);
  const [notice, setNotice] = useState<Notice | undefined>(undefined);

  const startAdd = (): void => {
    setNotice(undefined);
    setEditing({ index: rows.length, draft: { id: '', required: false, hint: '' } });
  };

  const startEdit = (index: number): void => {
    const row = rows[index];
    if (row === undefined) {
      throw new Error(`The pipeline has no argument at row ${index + 1}.`);
    }
    setNotice(undefined);
    setEditing({ index, draft: { id: row.id, required: row.required, hint: row.hint } });
  };

  const save = (current: Editing): void => {
    const changed: Argument = { id: current.draft.id, required: current.draft.required, hint: current.draft.hint };
    const isNew = current.index === rows.length;
    const next = isNew ? [...rows, changed] : rows.map((row, at) => (at === current.index ? changed : row));
    const result = applyPipelineField(config, { field: 'arguments', value: next });
    if (result.ok) {
      setEditing(undefined);
      setNotice(undefined);
      onChange(result.pipeline);
      return;
    }
    setNotice({ index: current.index, text: refusalText(result.reason, rows, current.index, changed) });
    // A saved row goes back to its saved values; a new row stays open with its draft (screen 09).
    setEditing(isNew ? current : undefined);
  };

  const remove = (index: number): void => {
    setEditing(undefined);
    setNotice(undefined);
    const result = applyPipelineField(config, { field: 'arguments', value: rows.filter((_, at) => at !== index) });
    if (result.ok) {
      onChange(result.pipeline);
    } else {
      setNotice({ index, text: result.reason });
    }
  };

  const patch = (change: Partial<Draft>): void => {
    if (editing !== undefined) {
      setEditing({ ...editing, draft: { ...editing.draft, ...change } });
    }
  };

  return (
    <Box sx={ROW_SX}>
      <Typography sx={LABEL_SX}>{label}</Typography>
      {rows.map((row, index) => (
        <Box key={`${index}:${row.id}`} sx={ROW_SX}>
          {editing?.index === index ? (
            <DraftForm draft={editing.draft} onPatch={patch} onSave={() => save(editing)} onCancel={() => setEditing(undefined)} />
          ) : (
            <Box sx={ROW_SX}>
              <Typography sx={VALUE_SX}>{row.required ? `${row.id}${REQUIRED_SUFFIX}` : row.id}</Typography>
              {row.hint === '' ? null : <Typography sx={SMALL_SX}>{row.hint}</Typography>}
              <Box sx={ACTIONS_SX}>
                <Button size="small" aria-label={`Edit ${row.id}`} onClick={() => startEdit(index)}>
                  Edit
                </Button>
                <Button size="small" color="error" aria-label={`Remove ${row.id}`} onClick={() => remove(index)}>
                  Remove
                </Button>
              </Box>
            </Box>
          )}
          {notice?.index === index ? <Typography sx={REFUSED_SX}>{`${REFUSED_PREFIX}${notice.text}`}</Typography> : null}
        </Box>
      ))}
      {editing?.index === rows.length ? (
        <Box sx={ROW_SX}>
          <DraftForm draft={editing.draft} onPatch={patch} onSave={() => save(editing)} onCancel={() => setEditing(undefined)} />
          {notice?.index === rows.length ? <Typography sx={REFUSED_SX}>{`${REFUSED_PREFIX}${notice.text}`}</Typography> : null}
        </Box>
      ) : (
        <Box>
          <Button size="small" variant="outlined" onClick={startAdd} sx={{ alignSelf: 'flex-start' }}>
            Add argument
          </Button>
        </Box>
      )}
    </Box>
  );
}

// A repeated id is refused by the parser; the reason names the row that uses it. Any other refusal is the parser's own.
function refusalText(reason: string, rows: readonly Argument[], index: number, changed: Argument): string {
  if (!reason.endsWith(DUPLICATE_ID_END)) {
    return reason;
  }
  const clash = rows.findIndex((row, at) => at !== index && row.id === changed.id);
  return clash === -1 ? reason : `${changed.id} is already used by row ${clash + 1}. Rename this row.`;
}

interface DraftFormProps {
  readonly draft: Draft;
  readonly onPatch: (change: Partial<Draft>) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

// The id, required and hint of one row, with Save and Cancel. Nothing is saved until Save.
function DraftForm({ draft, onPatch, onSave, onCancel }: DraftFormProps) {
  return (
    <Box sx={ROW_SX}>
      <TextField
        id="field-argument-id"
        label="Argument id"
        size="small"
        fullWidth
        value={draft.id}
        onChange={(event) => onPatch({ id: event.target.value })}
      />
      <FormControlLabel
        control={
          <Checkbox size="small" checked={draft.required} onChange={(event) => onPatch({ required: event.target.checked })} />
        }
        label="Required"
      />
      <TextField
        id="field-argument-hint"
        label="Hint"
        size="small"
        fullWidth
        value={draft.hint}
        onChange={(event) => onPatch({ hint: event.target.value })}
      />
      <Box sx={ACTIONS_SX}>
        <Button size="small" variant="contained" onClick={onSave}>
          Save argument
        </Button>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
