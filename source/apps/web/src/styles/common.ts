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
  // The heading of a column of step 4 (F-13 screens 01 and 08): 14 px, medium weight, primary text.
  readonly columnHeading: StyleObject;
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
  // The red box of a review note and of an error (F-13 screens 05, 07 and 09): a pale red fill, 8 px radius, 44 px high
  // at least, its lines centred with 9 px above and below. A component sets its own margin.
  readonly errorNote: StyleObject;
  // The line of a red box: 11 px, the dark red text colour.
  readonly errorNoteText: StyleObject;
  // The line of a red box that has problem lines under it: 4 px above the first problem line (F-13 screen 09).
  readonly errorNoteHead: StyleObject;
  // A problem line under the error line of a red box: 12 px, secondary text.
  readonly errorNoteDetail: StyleObject;
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
  // The primary button (F-13 screens 01 to 08): a 40 px primary fill with white text and an 8 px radius. Disabled, it
  // takes the grey fill and grey text of the screens. The caption does not wrap; the width comes from the caller.
  readonly primaryButton: StyleObject;
  // The footer of a properties panel: fixed under the scrolling fields, with a space above.
  readonly panelFooter: StyleObject;
  // The root column of a properties panel: fills its place and may shrink inside its parent.
  readonly panelRoot: StyleObject;
  // The Delete button of a properties panel's footer: the danger button, 40 high, at least 130 wide.
  // The caption does not wrap; the width comes from the caption.
  readonly panelDeleteButton: StyleObject;
  // The fields of a properties panel: a column that scrolls inside the panel, the footer stays in view.
  // It carries the 16 px side inset of the properties card, so its scrollbar sits on the card's edge. A field
  // group ends 24 px above the next label, so the next label's baseline is 36 px below the field (screen 01):
  // the label box is 16 px high with its baseline about 4 px above its bottom.
  readonly panelFields: StyleObject;
  // One field group: its label and its field, a column with 8 px between them, so the label's baseline sits
  // 12 px above the field (screen 01). It is a child of panelFields, so the 24 px gap applies between groups only.
  readonly fieldGroup: StyleObject;
  // The label of a field inside a field group: the group's gap is the 8 px, so the label has no margin of its own.
  readonly groupLabel: StyleObject;
  // A field and the reason it was refused, one column with 4 px between them (device fix 2026-11-24), so the reason
  // sits directly under its field. It is a child of a field group, so the group's gap separates the label from it.
  readonly control: StyleObject;
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
  const primaryButton: StyleObject = {
    ...captionNoWrap,
    boxSizing: 'border-box',
    height: 40,
    borderRadius: '8px',
    border: `1px solid ${theme.palette.divider}`,
    fontSize: 14,
    fontWeight: 500,
    textTransform: 'none',
    boxShadow: 'none',
    bgcolor: theme.palette.primary.main,
    color: theme.palette.background.paper,
    '&:hover': { bgcolor: theme.palette.primary.dark, boxShadow: 'none' },
    '&.Mui-disabled': {
      bgcolor: theme.palette.background.default,
      color: theme.palette.text.disabled,
    },
  };
  const errorNoteText: StyleObject = {
    m: 0,
    fontSize: 11,
    lineHeight: '16px',
    color: theme.palette.error.dark,
  };
  const fieldLabel: StyleObject = {
    display: 'block',
    m: 0,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '16px',
    color: theme.palette.text.primary,
    mb: '8px',
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
    columnHeading: { m: 0, fontSize: 14, fontWeight: 500, lineHeight: '20px', color: theme.palette.text.primary },
    fieldLabel,
    groupLabel: { ...fieldLabel, mb: 0 },
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
    errorNote: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: 44,
      px: '16px',
      py: '9px',
      borderRadius: '8px',
      bgcolor: theme.palette.error.light,
    },
    errorNoteText,
    errorNoteHead: { ...errorNoteText, mb: '4px' },
    errorNoteDetail: {
      m: 0,
      fontSize: 12,
      lineHeight: '18px',
      color: theme.palette.text.secondary,
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
    primaryButton,
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
    panelFields: {
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
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 0,
    },
    control: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
    },
  };
}
