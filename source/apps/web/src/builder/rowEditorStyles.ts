import type { Theme } from '@mui/material/styles';
import { FIELD_HEIGHT, getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the row and list editors of the builder panels (.claude/rules/web-styling.md). It takes
// the theme and returns the style objects RowEditors passes to `sx`. Colours come from the theme's palette;
// the title, the plus and minus buttons and the field surfaces are the shared shapes of common.ts.

export interface RowEditorStyles {
  // One list: its title row, then its rows, then its new row or group.
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
  // One artifact as screen 03 draws it: a Label part, then a Template part, 16 px apart (no border).
  readonly artifact: StyleObject;
  // One part of an artifact: its label and its field (8 px apart, so the label's baseline is 12 px above the field).
  readonly artifactPart: StyleObject;
  // The help text beneath a template box, in grey, on the 16 px lines of screen 03.
  readonly helpText: StyleObject;
  // The reason of a refused value, in red beneath the field or row it belongs to.
  readonly refusal: StyleObject;
  // A template field and its reason in one control box: the reason sits 4 px under the box (device fix 2026-11-24).
  readonly control: StyleObject;
  // The label above a field inside a form.
  readonly fieldLabel: StyleObject;
}

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
      lineHeight: `${FIELD_HEIGHT}px`,
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
    // The Template box is 80 px as screen 03 draws it: three 20 px lines and 20 px of padding (5 px above the first
    // line, 12 px in from the left), with the outlined root's own padding removed, as the body box has it.
    multilineInput: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        p: 0,
      },
      '& .MuiOutlinedInput-input': {
        ...common.fieldText,
        boxSizing: 'border-box',
        padding: '5px 12px 15px',
      },
      ...refusedField,
    },
    select: {
      ...input,
      '& .MuiNativeSelect-select': {
        ...common.fieldText,
        boxSizing: 'border-box',
        py: 0,
        lineHeight: `${FIELD_HEIGHT}px`,
      },
    },
    artifact: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
    },
    artifactPart: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 0,
    },
    helpText: {
      ...common.secondaryText,
      lineHeight: '16px',
    },
    refusal: {
      ...common.secondaryText,
      color: theme.palette.error.main,
    },
    control: common.control,
    fieldLabel: {
      ...common.fieldLabel,
      mb: 0,
    },
  };
}
