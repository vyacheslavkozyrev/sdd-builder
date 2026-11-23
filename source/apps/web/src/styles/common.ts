import type { SxProps, Theme } from '@mui/material/styles';
import { cardShadow } from '../theme.js';

// A single style object (not an array, not a function), so a shared shape can be spread
// into another style object.
export type StyleObject = Exclude<SxProps<Theme>, ReadonlyArray<unknown> | ((theme: Theme) => unknown)>;

// Style objects shared by more than one component (.claude/rules/web-styling.md). Each is
// built from the theme, so a colour is always a palette value. Components take them through
// getCommonStyles and never write a style object of their own for these shapes.

export interface CommonStyles {
  // A white surface with a 1 px divider border, a 12 px radius and the approved soft shadow.
  readonly card: StyleObject;
  // The outlined secondary button (New project, Prev, form Cancel): white fill, 8 px radius, 40 px high.
  // The caption does not wrap; the width comes from the caption.
  readonly outlineButton: StyleObject;
  // Small secondary text, such as the footer note.
  readonly secondaryText: StyleObject;
  // The label above a text field: 12 px, medium weight, primary text, 8 px above the field.
  readonly fieldLabel: StyleObject;
  // The outline and fill of a text field: white, 8 px radius, the grey border of the approved screens.
  readonly formField: StyleObject;
  // The red mark that follows a required field's label.
  readonly requiredMark: StyleObject;
  // The text inside a field, set on the input element: 13 px, 20 px line, primary text, 16 px side padding.
  // A field sets its own height and vertical padding.
  readonly fieldText: StyleObject;
  // The amber note box under a field (F-09 screen 03, F-10 screens 03 and 06): a 1 px amber outline,
  // an amber fill, a 6 px radius and the text centred. A component sets its own size and margin.
  readonly warningBox: StyleObject;
  // The text of an amber note: 12 px, medium weight, the dark amber text colour.
  readonly warningText: StyleObject;
  // The title of a section of a step (Stack, Rule blocks): 14 px, semibold, primary text.
  readonly sectionTitle: StyleObject;
  // The 28 px plus and minus buttons: a primary outline and a primary glyph on white (F-10 and F-11).
  // The caption does not wrap; the width is at least 28 px.
  readonly plusMinusButton: StyleObject;
  // The confirmation dialog (F-11 screen 04, F-10 remove): a white 400 px card with 24 px padding.
  readonly dialogPaper: StyleObject;
  // The dialog's title and text, centred.
  readonly dialogTitle: StyleObject;
  readonly dialogText: StyleObject;
  // The row of the dialog's two buttons, centred.
  readonly dialogActions: StyleObject;
  // The Cancel button of a dialog: the outlined secondary button, 40 high, at least 120 wide.
  readonly dialogCancel: StyleObject;
  // The confirming button of a dialog that removes something: the danger button, 40 high, at least 120 wide.
  readonly dialogConfirm: StyleObject;
  // The danger button (F-11 screens 03 and 04): a red fill with white text, 8 px radius, no size.
  // The caption does not wrap; the width comes from the caption.
  readonly dangerButton: StyleObject;
  // The footer of a properties panel: fixed under the scrolling fields, with a space above.
  readonly panelFooter: StyleObject;
  // The root column of a properties panel: fills its place and may shrink inside its parent.
  readonly panelRoot: StyleObject;
  // The Delete button of a properties panel's footer: the danger button, 40 high, at least 130 wide.
  // The caption does not wrap; the width comes from the caption.
  readonly panelDeleteButton: StyleObject;
}

// The height of a single-line field: screens 01, 03 and 05 draw each field 40 px high, with its text centred.
export const FIELD_HEIGHT = 40;

const DIALOG_WIDTH = 400;
const DIALOG_BUTTON_MIN_WIDTH = 120;
const DIALOG_BUTTON_HEIGHT = 40;
const PANEL_DELETE_BUTTON_MIN_WIDTH = 130;
const PLUS_MINUS_SIZE = 28;

export function getCommonStyles(theme: Theme): CommonStyles {
  // Every button caption is one line: a caption never wraps, and the width follows the caption.
  const captionNoWrap: StyleObject = { whiteSpace: 'nowrap' };
  const outlineButton: StyleObject = {
    ...captionNoWrap,
    height: 40,
    borderRadius: '8px',
    borderColor: theme.palette.grey[300],
    color: theme.palette.text.primary,
    bgcolor: theme.palette.background.paper,
    textTransform: 'none',
  };
  const dangerButton: StyleObject = {
    ...captionNoWrap,
    borderRadius: '8px',
    textTransform: 'none',
    bgcolor: theme.palette.error.main,
    color: theme.palette.background.paper,
    '&:hover': { bgcolor: theme.palette.error.dark },
  };
  return {
    card: {
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '12px',
      boxShadow: cardShadow,
      boxSizing: 'border-box',
    },
    outlineButton,
    secondaryText: {
      m: 0,
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.secondary,
    },
    fieldLabel: {
      display: 'block',
      m: 0,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '16px',
      color: theme.palette.text.primary,
      mb: '8px',
    },
    formField: {
      '& .MuiOutlinedInput-root': {
        bgcolor: theme.palette.background.paper,
        borderRadius: '8px',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[300],
      },
      '& .MuiInputBase-input::placeholder': {
        color: theme.palette.text.secondary,
        opacity: 1,
      },
    },
    requiredMark: {
      color: theme.palette.error.dark,
    },
    fieldText: {
      boxSizing: 'border-box',
      px: 2,
      fontSize: 13,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
    warningBox: {
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      px: 2,
      borderRadius: '6px',
      border: `1px solid ${theme.palette.warning.main}`,
      bgcolor: theme.palette.warning.light,
    },
    warningText: {
      m: 0,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '20px',
      color: theme.palette.warning.dark,
    },
    sectionTitle: {
      m: 0,
      fontSize: 14,
      fontWeight: 600,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
    plusMinusButton: {
      ...captionNoWrap,
      height: PLUS_MINUS_SIZE,
      minWidth: PLUS_MINUS_SIZE,
      p: 0,
      fontSize: 16,
      lineHeight: 1,
      borderRadius: '8px',
      borderColor: theme.palette.primary.main,
      color: theme.palette.primary.main,
      bgcolor: theme.palette.background.paper,
      textTransform: 'none',
    },
    dialogPaper: {
      boxSizing: 'border-box',
      width: DIALOG_WIDTH,
      maxWidth: '100%',
      p: '24px',
      borderRadius: '12px',
      bgcolor: theme.palette.background.paper,
    },
    dialogTitle: {
      m: 0,
      fontSize: 16,
      fontWeight: 600,
      lineHeight: '24px',
      color: theme.palette.text.primary,
      textAlign: 'center',
    },
    dialogText: {
      m: 0,
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.secondary,
      mt: '8px',
      textAlign: 'center',
    },
    dialogActions: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      mt: '24px',
    },
    dialogCancel: {
      ...outlineButton,
      minWidth: DIALOG_BUTTON_MIN_WIDTH,
      height: DIALOG_BUTTON_HEIGHT,
    },
    dialogConfirm: {
      ...dangerButton,
      minWidth: DIALOG_BUTTON_MIN_WIDTH,
      height: DIALOG_BUTTON_HEIGHT,
    },
    dangerButton,
    panelFooter: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      px: '16px',
      pt: '16px',
      pb: '16px',
    },
    panelRoot: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
    panelDeleteButton: {
      ...dangerButton,
      minWidth: PANEL_DELETE_BUTTON_MIN_WIDTH,
      height: DIALOG_BUTTON_HEIGHT,
    },
  };
}
