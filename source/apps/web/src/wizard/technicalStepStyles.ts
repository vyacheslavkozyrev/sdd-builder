import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';

// Style getter for the technical details step (.claude/rules/web-styling.md). It takes the theme and
// returns the style objects TechnicalStep passes to `sx`. Colours come from the theme's palette only.
// Positions follow the approved F-10 screen 01 (1280 x 800, the card's content box at x 308 to 1232):
// the left column is x 308 to 740, 432 px wide. The shared label, field and help shapes are in common.ts.

export interface TechnicalStepStyles {
  readonly column: SxProps<Theme>;
  readonly sectionTitle: SxProps<Theme>;
  readonly stackGrid: SxProps<Theme>;
  readonly stackCell: SxProps<Theme>;
  readonly fieldLabel: SxProps<Theme>;
  readonly required: SxProps<Theme>;
  readonly singleField: SxProps<Theme>;
  readonly help: SxProps<Theme>;
  readonly stackHelp: SxProps<Theme>;
  readonly architectureLabel: SxProps<Theme>;
  readonly architectureField: SxProps<Theme>;
  readonly architectureHelp: SxProps<Theme>;
}

// A single-line field is 40 px high; the architecture box is 120 px high (5 rows of 20 px and 10 px above and below).
const SINGLE_FIELD_HEIGHT = 40;
// The number of rows of the architecture field; TechnicalStep renders the field with this many rows.
export const ARCHITECTURE_ROWS = 5;
const ARCHITECTURE_PADDING = '10px';

export function getTechnicalStepStyles(theme: Theme): TechnicalStepStyles {
  const { palette } = theme;
  const common = getCommonStyles(theme);
  return {
    column: {
      boxSizing: 'border-box',
      width: 432,
      flexShrink: 0,
    },
    sectionTitle: {
      m: 0,
      fontSize: 14,
      fontWeight: 600,
      lineHeight: '20px',
      color: palette.text.primary,
      mb: '12px',
    },
    // Two 208 px columns with a 16 px gap; a row of fields is 64 px high (label, 8 px, field) and rows sit 8 px apart.
    stackGrid: {
      display: 'grid',
      gridTemplateColumns: '208px 208px',
      columnGap: '16px',
      rowGap: '8px',
    },
    stackCell: {
      minWidth: 0,
    },
    fieldLabel: common.fieldLabel,
    required: common.requiredMark,
    singleField: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-root': {
        height: SINGLE_FIELD_HEIGHT,
      },
      '& .MuiInputBase-input': {
        ...common.fieldText,
        height: '100%',
        py: 0,
      },
    },
    help: common.secondaryText,
    stackHelp: {
      ...common.secondaryText,
      mt: '8px',
    },
    architectureLabel: {
      ...common.fieldLabel,
      mt: '20px',
    },
    architectureField: {
      width: '100%',
      ...common.formField,
      '& .MuiInputBase-input': {
        ...common.fieldText,
        py: ARCHITECTURE_PADDING,
      },
    },
    architectureHelp: {
      ...common.secondaryText,
      mt: '6px',
    },
  };
}
