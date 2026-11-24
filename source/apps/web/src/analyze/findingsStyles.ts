import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles, type StyleObject } from '../styles/common.js';
import type { FindingSeverity } from './analysisState.js';

// Style getter for the findings view (.claude/rules/web-styling.md). It takes the theme and returns the style objects
// Findings passes to `sx`. Colours come from the theme's palette only. Positions follow the approved F-13 screens 03,
// 04, 05, 07, 09 and 11 (1280 x 800): a finding row is 540 px wide and 56 px high, rows are 8 px apart.

export interface FindingsStyles {
  // The column that holds the note or error box, the label, the rows and the result line.
  readonly root: SxProps<Theme>;
  // The red box of a review note (screen 05) and of an error (screens 07 and 09). A line in it sits 16 px inside.
  readonly note: SxProps<Theme>;
  // The line of the box: with problem lines under it (screen 09) it has 4 px below it, otherwise it stands alone.
  readonly noteText: (detailed: boolean) => SxProps<Theme>;
  // The problem lines of a 422 inside the error box (screen 09).
  readonly noteDetail: SxProps<Theme>;
  // The label above the rows: "Findings" (12 px, medium weight, primary text), or "Earlier result (not current)" in
  // secondary text when the analysis is out of date (screen 10). The rows' text is greyed the same way.
  readonly label: (stale: boolean) => SxProps<Theme>;
  readonly list: SxProps<Theme>;
  readonly row: SxProps<Theme>;
  readonly rowHead: SxProps<Theme>;
  // The severity pill: a 20 px high text pill with its own fill, one per severity (the word carries the meaning).
  readonly pills: Record<FindingSeverity, SxProps<Theme>>;
  readonly subject: (stale: boolean) => SxProps<Theme>;
  readonly message: (stale: boolean) => SxProps<Theme>;
  // The result line under the rows: secondary text, or the success text on a green result.
  readonly result: (green: boolean) => SxProps<Theme>;
  // The line that says no analysis has run yet (F-13 screens 01 and 02): secondary text under the Analyze button.
  readonly empty: SxProps<Theme>;
  // The amber note of an out-of-date analysis (F-13 screen 10), in the same amber as the warning boxes.
  readonly staleNote: SxProps<Theme>;
  readonly staleNoteText: SxProps<Theme>;
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
  const labelShape: StyleObject = {
    m: 0,
    mt: '6px',
    mb: '10px',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '16px',
    color: theme.palette.text.primary,
  };
  // The label sits 6 px under the note (or under the top of the column) and 10 px above the rows (F-13 screens 03 to 05
  // and 11). The stale label is in secondary text (20 px line) and 4 px above the rows (F-13 screen 10).
  const earlierLabel: StyleObject = { ...common.secondaryText, mt: '6px', mb: '4px' };
  const subjectShape: StyleObject = {
    m: 0,
    minWidth: 0,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '20px',
    color: theme.palette.text.primary,
    overflowWrap: 'anywhere',
  };
  const messageShape: StyleObject = {
    m: 0,
    fontSize: 13,
    lineHeight: '18px',
    color: theme.palette.text.primary,
    overflowWrap: 'anywhere',
  };
  const greyed: StyleObject = { color: theme.palette.text.secondary };
  return {
    root: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      mt: '20px',
    },
    // A note sits 2 px above the label, so the label is 8 px under it (screens 05 and 10).
    note: { ...common.errorNote, mb: '2px' },
    noteText: (detailed) => (detailed ? common.errorNoteHead : common.errorNoteText),
    noteDetail: common.errorNoteDetail,
    label: (stale) => (stale ? earlierLabel : labelShape),
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
      minHeight: 56,
      m: 0,
      px: '11px',
      pt: '9px',
      pb: 0,
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
    subject: (stale) => (stale ? { ...subjectShape, ...greyed } : subjectShape),
    message: (stale) => (stale ? { ...messageShape, ...greyed } : messageShape),
    result: (green) => ({
      ...common.secondaryText,
      mt: '14px',
      color: green ? theme.palette.success.dark : theme.palette.text.secondary,
    }),
    empty: { ...common.secondaryText, mt: '6px' },
    staleNote: {
      ...common.warningBox,
      minHeight: 44,
      px: '16px',
      py: '12px',
      mb: '2px',
      justifyContent: 'center',
    },
    staleNoteText: { ...common.warningText, m: 0, lineHeight: '16px', fontWeight: 400 },
  };
}
