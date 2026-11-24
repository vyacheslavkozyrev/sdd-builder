import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { FindingSeverity } from './analysisState.js';

// Style getter for the findings view (.claude/rules/web-styling.md). It takes the theme and returns the style objects
// Findings passes to `sx`. Colours come from the theme's palette only. Positions follow the approved F-13 screens 03,
// 04, 05, 07, 09 and 11 (1280 x 800): a finding row is 540 px wide and 56 px high, rows are 8 px apart.

export interface FindingsStyles {
  // The column that holds the note or error box, the label, the rows and the result line.
  readonly root: SxProps<Theme>;
  // The red box of a review note (screen 05) and of an error (screens 07 and 09). A line in it sits 16 px inside.
  readonly note: SxProps<Theme>;
  readonly noteText: SxProps<Theme>;
  // The problem lines of a 422 inside the error box (screen 09).
  readonly noteDetail: SxProps<Theme>;
  // The "Findings" label above the rows: 12 px, medium weight, primary text.
  readonly label: SxProps<Theme>;
  readonly list: SxProps<Theme>;
  readonly row: SxProps<Theme>;
  readonly rowHead: SxProps<Theme>;
  // The severity pill: a 20 px high text pill with its own fill, one per severity (the word carries the meaning).
  readonly pills: Record<FindingSeverity, SxProps<Theme>>;
  readonly subject: SxProps<Theme>;
  readonly message: SxProps<Theme>;
  // The result line under the rows: secondary text, or the success text on a green result.
  readonly result: (green: boolean) => SxProps<Theme>;
}

export function getFindingsStyles(theme: Theme): FindingsStyles {
  const common = getCommonStyles(theme);
  const pill: SxProps<Theme> = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    minWidth: 76,
    height: 20,
    px: '8px',
    borderRadius: '10px',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '20px',
  };
  return {
    root: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      mt: '20px',
    },
    note: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '4px',
      minHeight: 44,
      px: '16px',
      py: '12px',
      borderRadius: '8px',
      bgcolor: theme.palette.error.light,
      mb: '14px',
    },
    noteText: {
      m: 0,
      fontSize: 11,
      lineHeight: '16px',
      color: theme.palette.error.dark,
    },
    noteDetail: {
      m: 0,
      fontSize: 12,
      lineHeight: '18px',
      color: theme.palette.text.secondary,
    },
    label: {
      m: 0,
      mb: '8px',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '16px',
      color: theme.palette.text.primary,
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      m: 0,
      p: 0,
      listStyle: 'none',
    },
    row: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minHeight: 56,
      m: 0,
      px: '12px',
      py: '10px',
      borderRadius: '8px',
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper,
    },
    rowHead: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0,
    },
    pills: {
      blocker: { ...pill, color: theme.palette.error.dark, bgcolor: theme.palette.error.light },
      warning: { ...pill, color: theme.palette.warning.dark, bgcolor: theme.palette.warning.light },
      info: { ...pill, color: theme.palette.text.secondary, bgcolor: theme.palette.background.default },
    },
    subject: {
      m: 0,
      minWidth: 0,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '20px',
      color: theme.palette.text.primary,
      overflowWrap: 'anywhere',
    },
    message: {
      m: 0,
      fontSize: 13,
      lineHeight: '18px',
      color: theme.palette.text.primary,
      overflowWrap: 'anywhere',
    },
    result: (green) => ({
      ...common.secondaryText,
      mt: '16px',
      color: green ? theme.palette.success.dark : theme.palette.text.secondary,
    }),
  };
}
