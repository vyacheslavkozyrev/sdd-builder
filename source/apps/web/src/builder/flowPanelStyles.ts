import type { Theme } from '@mui/material/styles';
import { FIELD_HEIGHT, getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the flow panel (.claude/rules/web-styling.md). It takes the theme and returns the
// style objects FlowPanel passes to `sx`. Colours come from the theme's palette; the label, the field
// surface are the shared shapes of common.ts. The pipeline panel uses the same field shapes, so it
// takes this getter too. The list sections have their own getter (rowEditorStyles.ts).

export interface FlowPanelStyles {
  // The panel: a column that fills its place, with the fields above and the footer fixed below.
  readonly root: StyleObject;
  // The fields, in the order of AC-019: a column that scrolls inside the panel, the footer stays in view.
  // It carries the 16 px side inset of the properties card, so its scrollbar sits on the card's edge. A field
  // group (below) ends 24 px above the next label, so the next label's baseline is 36 px below the field (screen 01):
  // the label box is 16 px high with its baseline about 4 px above its bottom.
  readonly scroll: StyleObject;
  // One field group: its label and its field, a column with 8 px between them, so the label's baseline sits
  // 12 px above the field (screen 01). It is a child of `scroll`, so the 24 px gap applies between groups only.
  readonly group: StyleObject;
  // The footer under the fields: the Delete flow control (AC-019, AC-029).
  readonly footer: StyleObject;
  readonly deleteButton: StyleObject;
  // The line of the footer that says what the footer cannot do (the pipeline cannot be removed).
  readonly footerNote: StyleObject;
  // One field: its label above it, its input, and the lines under it.
  readonly fieldLabel: StyleObject;
  // One field is FIELD_HEIGHT (40 px) high, with its text centred (screen 01).
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
      gap: '24px',
      px: '16px',
      minWidth: 0,
    },
    group: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 0,
    },
    footer: common.panelFooter,
    deleteButton: common.panelDeleteButton,
    footerNote: common.secondaryText,
    // The group's gap is the 8 px between the label and its field, so the label has no margin of its own.
    fieldLabel: { ...common.fieldLabel, mb: 0 },
    field: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        height: FIELD_HEIGHT,
      },
      '& .MuiOutlinedInput-input': {
        boxSizing: 'border-box',
        height: '100%',
        px: 2,
        py: 0,
        fontSize: 13,
        lineHeight: `${FIELD_HEIGHT}px`,
        color: theme.palette.text.primary,
      },
    },
    multilineField: {
      width: '100%',
      ...common.formField,
      // The outlined root pads a multi-line field by 16.5 px and 14 px; the body box has no root padding.
      '& .MuiInputBase-root': {
        p: 0,
      },
      '& .MuiOutlinedInput-input': {
        boxSizing: 'border-box',
        // The body box is 80 px: three 20 px lines (the field's minRows) and 20 px of padding. The first line's
        // baseline sits 20 px below the top of the box, and its text is 12 px in from the left edge, as screen 01 draws it
        // (fields keep their 16 px).
        padding: '5px 12px 15px',
        fontSize: 13,
        lineHeight: '20px',
        color: theme.palette.text.primary,
      },
    },
    select: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        height: FIELD_HEIGHT,
      },
      '& .MuiNativeSelect-select': {
        boxSizing: 'border-box',
        py: 0,
        px: 2,
        fontSize: 13,
        lineHeight: `${FIELD_HEIGHT}px`,
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
