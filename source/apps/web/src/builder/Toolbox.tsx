import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { canAddStart } from './blocks.js';
import type { BlockKind } from './blocks.js';
import { getToolboxStyles } from './toolboxStyles.js';
import type { Flow } from './model.js';

// The toolbox of the flow tab (F-12 AC-001, AC-002, AC-003, screen 01). A floating card at the top right
// of the canvas with four icon buttons, Agent, Condition, Start and End, each named by a tooltip. There is
// no Link, Move, Connection or Delete-flow control. Start is disabled while the flow has one, and the
// reason is shown beside the card. A press reports the kind; the caller adds the block (`addBlock`, with the
// ids of every flow of the pipeline), stores the flow and selects the new block, so its panel opens (AC-002).

export interface ToolboxProps {
  readonly flow: Flow;
  readonly onAdd: (kind: BlockKind) => void;
}

// The buttons in the order the approved screen draws them, Link left out (AC-001).
const kinds: readonly BlockKind[] = ['agent', 'condition', 'start', 'end'];

const names: Readonly<Record<BlockKind, string>> = {
  agent: 'Agent',
  condition: 'Condition',
  start: 'Start',
  end: 'End',
};

const startReason = 'This flow already has a Start block.';

// The icons are drawn in the current colour, which the button sets from the theme (AC-001).
function ToolIcon({ kind }: { readonly kind: BlockKind }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };
  switch (kind) {
    case 'agent':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="4" y="6" width="16" height="12" rx="3" />
        </svg>
      );
    case 'condition':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <polygon points="12,4 20,12 12,20 4,12" />
        </svg>
      );
    case 'start':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="10,8 10,16 16,12" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'end':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function Toolbox({ flow, onAdd }: ToolboxProps) {
  const styles = getToolboxStyles(useTheme());
  const startAllowed = canAddStart(flow);
  return (
    <Box role="toolbar" aria-label="Add a block" sx={styles.root}>
      {!startAllowed && <Typography sx={styles.reason}>{startReason}</Typography>}
      <Box sx={styles.card}>
        {kinds.map((kind) => {
          const name = names[kind];
          const disabled = kind === 'start' && !startAllowed;
          return (
            <Tooltip key={kind} title={name}>
              {/* A span keeps the tooltip working while the button is disabled. */}
              <span>
                <IconButton
                  aria-label={name}
                  disabled={disabled}
                  onClick={() => onAdd(kind)}
                  sx={styles.buttons[kind]}
                >
                  <ToolIcon kind={kind} />
                </IconButton>
              </span>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
