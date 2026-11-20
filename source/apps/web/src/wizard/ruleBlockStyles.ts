import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';

// Style getter for one rule block of the technical details step (.claude/rules/web-styling.md). It takes
// the theme and returns the style objects RuleBlock passes to `sx`. Colours come from the theme's palette
// only. Positions follow the approved F-10 screen 01 and 03: a white card 444 px wide with 16 px padding.
// The shared label, field, card and plus or minus button shapes are in common.ts.

export interface RuleBlockStyles {
  readonly root: SxProps<Theme>;
  readonly header: SxProps<Theme>;
  readonly caption: SxProps<Theme>;
  readonly removeButton: SxProps<Theme>;
  readonly nameLabel: SxProps<Theme>;
  readonly nameField: SxProps<Theme>;
  readonly fileLine: SxProps<Theme>;
  readonly noteBox: SxProps<Theme>;
  readonly noteText: SxProps<Theme>;
  readonly descriptionLabel: SxProps<Theme>;
  readonly descriptionField: SxProps<Theme>;
}

// The name field is 40 px high, as on the stack fields. The remove button is 28 px square.
const NAME_FIELD_HEIGHT = 40;
const REMOVE_BUTTON_SIZE = 28;
const NOTE_HEIGHT = 34;
const DESCRIPTION_PADDING = '9px';

export function getRuleBlockStyles(theme: Theme): RuleBlockStyles {
  const common = getCommonStyles(theme);
  return {
    root: {
      ...common.card,
      boxSizing: 'border-box',
      width: 444,
      p: '16px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: REMOVE_BUTTON_SIZE,
    },
    caption: {
      ...common.fieldLabel,
      mb: 0,
    },
    removeButton: common.plusMinusButton,
    nameLabel: { ...common.fieldLabel, mt: '12px' },
    nameField: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        height: NAME_FIELD_HEIGHT,
      },
      '& .MuiInputBase-input': {
        ...common.fieldText,
        height: '100%',
        py: 0,
      },
    },
    fileLine: {
      ...common.secondaryText,
      mt: '8px',
      overflowWrap: 'anywhere',
    },
    // The note that replaces the file line or sits under it: the amber note box of F-09, shared in common.ts.
    noteBox: {
      ...common.warningBox,
      mt: '8px',
      minHeight: NOTE_HEIGHT,
      py: '6px',
    },
    noteText: common.warningText,
    descriptionLabel: { ...common.fieldLabel, mt: '16px' },
    descriptionField: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-input': {
        ...common.fieldText,
        py: DESCRIPTION_PADDING,
      },
    },
  };
}
