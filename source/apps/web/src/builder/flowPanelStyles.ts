import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the flow panel (.claude/rules/web-styling.md). It takes the theme and returns the
// style objects FlowPanel passes to `sx`. Colours come from the theme's palette; the label, the field
// surface, the section title and the plus button are the shared shapes of common.ts.

export interface FlowPanelStyles {
  // The column of the fields, in the order of AC-019.
  readonly root: StyleObject;
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
  // The title of a list section (Arguments, Outcome artifacts, Rule tags).
  readonly sectionTitle: StyleObject;
  // The space a list section keeps for its rows (filled by the row editors).
  readonly slot: StyleObject;
}

export function getFlowPanelStyles(theme: Theme): FlowPanelStyles {
  const common = getCommonStyles(theme);
  return {
    root: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
    },
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
    sectionTitle: common.sectionTitle,
    slot: {
      minHeight: 28,
    },
  };
}
