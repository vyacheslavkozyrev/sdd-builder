import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the row and list editors of the builder panels (.claude/rules/web-styling.md). It takes
// the theme and returns the style objects RowEditors passes to `sx`. Colours come from the theme's palette;
// the title, the plus and minus buttons and the field surfaces are the shared shapes of common.ts.

export interface RowEditorStyles {
  // One list: its title row, then its rows, then its add form.
  readonly list: StyleObject;
  // The title row: the list's title at the left, the + button at the right.
  readonly titleRow: StyleObject;
  readonly title: StyleObject;
  readonly addButton: StyleObject;
  readonly minusButton: StyleObject;
  // One row: a line of controls, with the reason of a refused edit beneath it.
  readonly row: StyleObject;
  readonly rowLine: StyleObject;
  // The "required" checkbox beside an argument's minus: its label, its text and the small box.
  readonly requiredLabel: StyleObject;
  readonly requiredText: StyleObject;
  readonly requiredCheckbox: StyleObject;
  // A text field and a dropdown in a row or a form; the multi-line template field is taller. A field with a
  // refused value (MUI error state) takes the light red fill of screen 10 from the palette.
  readonly input: StyleObject;
  readonly multilineInput: StyleObject;
  readonly select: StyleObject;
  // One artifact as screen 03 draws it: a Label field with its minus, then the Template box and its help text.
  readonly artifact: StyleObject;
  // The form that holds an artifact's Label and Template, and its Save and Cancel buttons.
  readonly form: StyleObject;
  readonly formActions: StyleObject;
  readonly saveButton: StyleObject;
  readonly cancelButton: StyleObject;
  // The help text beneath a template field, in grey.
  readonly helpText: StyleObject;
  // The reason of a refused value, in red beneath the field or row it belongs to.
  readonly refusal: StyleObject;
  // The label above a field inside a form.
  readonly fieldLabel: StyleObject;
}

const FIELD_HEIGHT = 34;

export function getRowEditorStyles(theme: Theme): RowEditorStyles {
  const common = getCommonStyles(theme);
  // A field with a refused value (MUI error state) takes the light red fill of screen 10 from the palette.
  const refusedField: StyleObject = {
    '& .MuiOutlinedInput-root.Mui-error': {
      bgcolor: theme.palette.error.light,
    },
  };
  const input: StyleObject = {
    flex: 1,
    minWidth: 0,
    width: '100%',
    ...common.formField,
    '& .MuiInputBase-root': {
      height: FIELD_HEIGHT,
    },
    '& .MuiOutlinedInput-input': {
      ...common.fieldText,
      boxSizing: 'border-box',
      height: '100%',
      py: 0,
    },
    ...refusedField,
  };
  return {
    list: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 0,
    },
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 28,
    },
    title: common.sectionTitle,
    addButton: common.plusMinusButton,
    minusButton: common.plusMinusButton,
    row: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
    },
    rowLine: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: 0,
    },
    requiredLabel: {
      m: 0,
      gap: '4px',
      flexShrink: 0,
    },
    requiredText: {
      ...common.secondaryText,
      whiteSpace: 'nowrap',
    },
    requiredCheckbox: {
      p: '4px',
    },
    input,
    multilineInput: {
      width: '100%',
      ...common.formField,
      '& .MuiOutlinedInput-input': {
        ...common.fieldText,
        boxSizing: 'border-box',
        py: '8px',
      },
      ...refusedField,
    },
    select: {
      ...input,
      '& .MuiNativeSelect-select': {
        ...common.fieldText,
        boxSizing: 'border-box',
        py: 0,
      },
    },
    artifact: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
    },
    form: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      p: '12px',
      borderRadius: '8px',
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper,
    },
    formActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
    },
    saveButton: {
      whiteSpace: 'nowrap',
      minWidth: 64,
      height: 32,
      borderRadius: '8px',
      textTransform: 'none',
      boxShadow: 'none',
    },
    cancelButton: {
      ...common.outlineButton,
      height: 32,
    },
    helpText: common.secondaryText,
    refusal: {
      ...common.secondaryText,
      color: theme.palette.error.main,
    },
    fieldLabel: {
      ...common.fieldLabel,
      mb: 0,
    },
  };
}
