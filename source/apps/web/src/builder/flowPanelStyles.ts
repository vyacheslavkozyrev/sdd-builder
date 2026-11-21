import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the flow panel (.claude/rules/web-styling.md). It takes the theme and returns the
// style objects FlowPanel passes to `sx`. Colours come from the theme's palette; the label, the field
// surface are the shared shapes of common.ts. The pipeline panel uses the same field shapes, so it
// takes this getter too. The list sections have their own getter (rowEditorStyles.ts).

export interface FlowPanelStyles {
  // The panel: a column that fills its place, with the fields above and the footer fixed below.
  readonly root: StyleObject;
  // The fields, in the order of AC-019: a column that scrolls inside the panel, the footer stays in view.
  readonly scroll: StyleObject;
  // The footer under the fields: the Delete flow control (AC-019, AC-029).
  readonly footer: StyleObject;
  readonly deleteButton: StyleObject;
  // The line of the footer that says what the footer cannot do (the pipeline cannot be removed).
  readonly footerNote: StyleObject;
  // One field: its label above it, its input, and the lines under it.
  readonly fieldLabel: StyleObject;
  readonly field: StyleObject;
  readonly multilineField: StyleObject;
  readonly select: StyleObject;
  // The counter row under the body field: the count at the right.
  readonly counter: StyleObject;
  // The reason a field's value was refused, in red beneath the field (F-11 screen 07).
  readonly refusal: StyleObject;
  // The Human approval checkbox row and its label.
  readonly approval: StyleObject;
  readonly approvalLabel: StyleObject;
}

export function getFlowPanelStyles(theme: Theme): FlowPanelStyles {
  const common = getCommonStyles(theme);
  return {
    root: common.panelRoot,
    scroll: {
      boxSizing: 'border-box',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
    },
    footer: common.panelFooter,
    deleteButton: common.panelDeleteButton,
    footerNote: common.secondaryText,
    fieldLabel: common.fieldLabel,
    field: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        height: 34,
      },
      '& .MuiOutlinedInput-input': {
        boxSizing: 'border-box',
        height: '100%',
        px: 2,
        py: 0,
        fontSize: 13,
        lineHeight: '20px',
        color: theme.palette.text.primary,
      },
    },
    multilineField: {
      width: '100%',
      ...common.formField,
      '& .MuiOutlinedInput-input': {
        boxSizing: 'border-box',
        px: 2,
        py: '8px',
        fontSize: 13,
        lineHeight: '20px',
        color: theme.palette.text.primary,
      },
    },
    select: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        height: 34,
      },
      '& .MuiNativeSelect-select': {
        boxSizing: 'border-box',
        py: 0,
        px: 2,
        fontSize: 13,
        lineHeight: '20px',
        color: theme.palette.text.primary,
      },
    },
    counter: {
      ...common.secondaryText,
      mt: '4px',
      textAlign: 'right',
    },
    refusal: {
      ...common.secondaryText,
      mt: '4px',
      color: theme.palette.error.main,
    },
    approval: {
      m: 0,
      alignItems: 'center',
      gap: '4px',
    },
    approvalLabel: {
      fontSize: 13,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
  };
}
