import { Box, Typography } from '@mui/material';
import { TOOLBOX, type ToolboxTool } from './panel.js';
import { TOOL_MIME } from './drawing.js';

// The toolbox on the left of the Pipeline tab (F-11 AC-023). It lists the three tools of the Pipeline tab in
// order, with no Start, no End and no switch-off (ui.md §3.2, decision 34). The tool list is `TOOLBOX`; the
// hints follow the approved screens in spec/design/features/F-11-pipeline-builder/ (01). Each tool is dragged onto
// the canvas: the canvas reads the tool name from the drag (F-11 T014).

const TOOLBOX_LABEL = 'Toolbox';

export const TOOL_HINTS: Readonly<Record<ToolboxTool, string>> = {
  Connection: 'hands over an artifact',
  Approval: 'a person decides',
  Check: 'agent or line count',
};

const TOOLBOX_NOTES: readonly string[] = [
  'Drag an Approval or a Check onto an arrow between two flows, or select the arrow and add it from its panel.',
  '+ adds a flow after the last tab. Start and End are not on this tab.',
  'Connection: select a flow, then Connect to next flow in its panel.',
];

const TOOLBOX_SX = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
  width: '100%',
  minWidth: 0,
} as const;
const HEADING_SX = { fontSize: 13, fontWeight: 700, color: '#0f172a' } as const;
const LIST_SX = { listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 } as const;
const TOOL_SX = {
  border: '1px solid #cbd5e1',
  borderRadius: 1,
  px: 1.25,
  py: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  bgcolor: '#ffffff',
} as const;
const TOOL_NAME_SX = { fontSize: 13, fontWeight: 600, color: '#0f172a' } as const;
const TOOL_HINT_SX = { fontSize: 11, color: '#64748b' } as const;
const NOTE_SX = { fontSize: 11, color: '#64748b' } as const;

export function Toolbox() {
  return (
    <Box component="section" aria-label={TOOLBOX_LABEL} sx={TOOLBOX_SX}>
      <Typography sx={HEADING_SX}>{TOOLBOX_LABEL}</Typography>
      <Box component="ul" sx={LIST_SX}>
        {TOOLBOX.map((tool) => (
          <Box
            component="li"
            key={tool}
            sx={TOOL_SX}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(TOOL_MIME, tool);
              event.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <Typography sx={TOOL_NAME_SX}>{tool}</Typography>
            <Typography sx={TOOL_HINT_SX}>{TOOL_HINTS[tool]}</Typography>
          </Box>
        ))}
      </Box>
      {TOOLBOX_NOTES.map((note) => (
        <Typography key={note} sx={NOTE_SX}>
          {note}
        </Typography>
      ))}
    </Box>
  );
}
