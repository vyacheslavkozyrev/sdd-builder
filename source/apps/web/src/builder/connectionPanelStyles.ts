import type { Theme } from '@mui/material/styles';
import { FIELD_HEIGHT, getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the connection panel (.claude/rules/web-styling.md). It takes the theme and returns the
// style objects ConnectionPanel passes to `sx`. The fields, the label groups, the note and the footer are the
// shared shapes of common.ts, the same ones the flow and pipeline panels take, so the spacing matches them.
// Only the read-only box is set here: it is grey, as screen 02 draws it, and it has the outline and inset of a field.

export interface ConnectionPanelStyles {
  readonly root: StyleObject;
  // The fields: the shared scrolling column (24 px between groups).
  readonly fields: StyleObject;
  // One label and its read-only box: the shared group (8 px between them).
  readonly group: StyleObject;
  readonly label: StyleObject;
  // The read-only box that shows a flow's name: FIELD_HEIGHT high, grey, with the outline and text inset of a field.
  readonly readOnly: StyleObject;
  readonly note: StyleObject;
  readonly footer: StyleObject;
  readonly deleteButton: StyleObject;
}

export function getConnectionPanelStyles(theme: Theme): ConnectionPanelStyles {
  const common = getCommonStyles(theme);
  return {
    root: common.panelRoot,
    fields: common.panelFields,
    group: common.fieldGroup,
    label: common.groupLabel,
    readOnly: {
      display: 'flex',
      alignItems: 'center',
      height: FIELD_HEIGHT,
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
