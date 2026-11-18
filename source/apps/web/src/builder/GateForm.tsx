import { Box, MenuItem, TextField } from '@mui/material';
import type { GateFields, GateTool } from './drawing.js';

// The gate form of the arrow panel (ButtonPaths.tsx) and of the canvas drop dialog (Canvas.tsx). It is a module of its
// own so the panel does not load the canvas (F-11 AC-017 to AC-019, AC-022).

export const FORM_SX = { display: 'flex', flexDirection: 'column', gap: 2, pt: 1 } as const;
const CHECK_TYPES = ['checks', 'diff size'] as const;

export interface GateFormProps {
  readonly tool: GateTool;
  readonly fields: GateFields;
  readonly onChange: (fields: GateFields) => void;
  // Focus the description when the form opens in a dialog; a panel does not take focus on selection.
  readonly autoFocus?: boolean;
}

// The gate's fields as screen 03 words them: the approval's hint, the check's placeholder, and the type and threshold
// labels of the Connection panel.
export function GateForm({ tool, fields, onChange, autoFocus = false }: GateFormProps) {
  return (
    <Box sx={FORM_SX}>
      <TextField
        label="Description · required"
        helperText={tool === 'Approval' ? 'Approval: say what the person approves.' : ''}
        placeholder={tool === 'Check' ? 'what passing means' : ''}
        value={fields.description}
        onChange={(event) => onChange({ ...fields, description: event.target.value })}
        autoFocus={autoFocus}
      />
      {tool === 'Check' ? (
        <TextField
          select
          label="Type"
          value={fields.type}
          onChange={(event) => onChange({ ...fields, type: event.target.value })}
        >
          {CHECK_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {tool === 'Check' && fields.type === 'diff size' ? (
        <TextField
          label="Threshold (lines) · required"
          value={fields.threshold}
          onChange={(event) => onChange({ ...fields, threshold: event.target.value })}
        />
      ) : null}
    </Box>
  );
}
