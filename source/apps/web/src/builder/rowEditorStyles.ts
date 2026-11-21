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
  // A text field and a dropdown in a row or a form; the multi-line template field is taller.
  readonly input: StyleObject;
  readonly multilineInput: StyleObject;
  readonly select: StyleObject;
  readonly checkbox: StyleObject;
  readonly checkboxLabel: StyleObject;
  // The name line of an artifact row: the bold label at the left, the Edit and Remove links at the right.
  readonly nameLine: StyleObject;
  // The bold label of an artifact row and the first line of its template in grey.
  readonly artifactLabel: StyleObject;
  readonly artifactTemplate: StyleObject;
  // The Edit and Remove links of an artifact row.
  readonly linkButton: StyleObject;
  readonly linkRow: StyleObject;
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
    input,
    multilineInput: {
      width: '100%',
      ...common.formField,
      '& .MuiOutlinedInput-input': {
        ...common.fieldText,
        boxSizing: 'border-box',
        py: '8px',
      },
    },
    select: {
      ...input,
      '& .MuiNativeSelect-select': {
        ...common.fieldText,
        boxSizing: 'border-box',
        py: 0,
      },
    },
    checkbox: {
      m: 0,
      flex: 'none',
      gap: '4px',
    },
    checkboxLabel: {
      m: 0,
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
    nameLine: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      minWidth: 0,
    },
    artifactLabel: {
      m: 0,
      minWidth: 0,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
    artifactTemplate: common.secondaryText,
    linkButton: {
      minWidth: 0,
      p: 0,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '20px',
      color: theme.palette.primary.main,
      textTransform: 'none',
    },
    linkRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
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
