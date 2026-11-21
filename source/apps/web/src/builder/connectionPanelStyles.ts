import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the connection panel (.claude/rules/web-styling.md). It takes the theme and returns the
// style objects ConnectionPanel passes to `sx`. The read-only boxes are grey, as screen 02 draws them;
// the label, the note and the footer are the shared shapes of common.ts.

export interface ConnectionPanelStyles {
  readonly root: StyleObject;
  readonly fields: StyleObject;
  readonly label: StyleObject;
  // The read-only box that shows a flow's name: grey, with the same outline as a field.
  readonly readOnly: StyleObject;
  readonly note: StyleObject;
  readonly footer: StyleObject;
  readonly deleteButton: StyleObject;
}

export function getConnectionPanelStyles(theme: Theme): ConnectionPanelStyles {
  const common = getCommonStyles(theme);
  return {
    root: common.panelRoot,
    // The fields are the panel's one scrolling region, as in the flow panel; the footer stays fixed below.
    // The 16 px side inset is inside the region, so the scrollbar sits on the card's edge.
    fields: {
      boxSizing: 'border-box',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      px: '16px',
      minWidth: 0,
    },
    label: common.fieldLabel,
    readOnly: {
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      height: 34,
      px: 2,
      borderRadius: '8px',
      border: `1px solid ${theme.palette.grey[300]}`,
      bgcolor: theme.palette.grey[100],
      ...common.fieldText,
    },
    note: common.secondaryText,
    footer: common.panelFooter,
    deleteButton: common.panelDeleteButton,
  };
}
