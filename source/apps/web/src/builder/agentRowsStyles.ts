import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';
import { getRowEditorStyles } from './rowEditorStyles.js';
import type { RowEditorStyles } from './rowEditorStyles.js';

// Style getter for the tool and artifact label lists of an Agent block (.claude/rules/web-styling.md). The rows,
// titles, plus and minus buttons and refusals are the row editors' shapes; the chips of reads and writes are added
// here. Colours come from the theme's palette.

export interface AgentRowsStyles extends RowEditorStyles {
  // The chips of a list: a wrapping row with 8 px between the chips.
  readonly chips: StyleObject;
  // One chip: a label with its minus at the right, on the shared field surface of common.ts.
  readonly chip: StyleObject;
  // The text of a chip.
  readonly chipText: StyleObject;
}

export function getAgentRowsStyles(theme: Theme): AgentRowsStyles {
  const common = getCommonStyles(theme);
  return {
    ...getRowEditorStyles(theme),
    chips: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      minWidth: 0,
    },
    chip: {
      ...common.chipSurface,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      maxWidth: '100%',
      minWidth: 0,
      height: 36,
      pl: '12px',
      pr: '4px',
    },
    chipText: {
      ...common.fieldText,
      px: 0,
      py: 0,
      minWidth: 0,
      overflowWrap: 'anywhere',
      color: theme.palette.text.primary,
    },
  };
}
