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
  // The outlined secondary button (New project): white fill, 8 px radius, 40 px high.
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
}

export function getCommonStyles(theme: Theme): CommonStyles {
  return {
    card: {
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '12px',
      boxShadow: cardShadow,
      boxSizing: 'border-box',
    },
    outlineButton: {
      height: 40,
      borderRadius: '8px',
      borderColor: theme.palette.grey[300],
      color: theme.palette.text.primary,
      bgcolor: theme.palette.background.paper,
      textTransform: 'none',
    },
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
  };
}
