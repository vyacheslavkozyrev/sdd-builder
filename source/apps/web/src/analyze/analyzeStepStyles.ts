import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';

// Style getter for the analyze and generate step (.claude/rules/web-styling.md). It takes the theme and
// returns the style objects the step's components pass to `sx`. Colours come from the theme's palette only.
// Positions follow the approved F-13 screen 01 (1280 x 800): the Analyze column is x 308 to 848, 540 px wide.
// The shared secondary text shape is in common.ts.

export interface AnalyzeStepStyles {
  // The two columns of the step, 24 px apart: the Analyze column (540 px) and the project preview (360 px).
  readonly columns: SxProps<Theme>;
  readonly analyzeColumn: SxProps<Theme>;
  readonly previewColumn: SxProps<Theme>;
  readonly heading: SxProps<Theme>;
  readonly subheading: SxProps<Theme>;
  // The progress mark inside Analyze while the request is pending.
  readonly spinner: SxProps<Theme>;
  readonly notice: SxProps<Theme>;
  readonly noticeTitle: SxProps<Theme>;
  readonly noticeText: SxProps<Theme>;
  readonly checkboxRow: SxProps<Theme>;
  readonly checkbox: SxProps<Theme>;
  readonly checkboxLabel: SxProps<Theme>;
  readonly analyzeRow: SxProps<Theme>;
  readonly analyzeButton: SxProps<Theme>;
  readonly reason: SxProps<Theme>;
}

export function getAnalyzeStepStyles(theme: Theme): AnalyzeStepStyles {
  const common = getCommonStyles(theme);
  return {
    // The card's 24 px padding; the preview is pinned to the right edge of the content (1232 px on the approved screens).
    columns: {
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '24px',
      minWidth: 0,
      p: '24px',
    },
    analyzeColumn: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: 540, flexShrink: 0 },
    previewColumn: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: 360, flexShrink: 0 },
    // The heading's line is 24 px: its baseline sits at y 66 and the subheading's at y 86 (F-13 screens 01 to 11).
    heading: { ...common.columnHeading, lineHeight: '24px' },
    subheading: { ...common.secondaryText, mb: '8px' },
    spinner: { color: 'inherit' },
    // The grey box of the privacy notice, 92 px high, with its two lines of text (screen 01, y 100 to 192): the text
    // starts 8 px below the top edge, not centred.
    notice: {
      boxSizing: 'border-box',
      width: '100%',
      height: 92,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      px: '16px',
      pt: '8px',
      borderRadius: '8px',
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.default,
    },
    noticeTitle: {
      m: 0,
      mb: '4px',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '16px',
      color: theme.palette.text.primary,
    },
    noticeText: {
      m: 0,
      fontSize: 13,
      lineHeight: '18px',
      color: theme.palette.text.primary,
    },
    // The checkbox row sits 16 px under the notice; the label is set beside the 16 px box.
    checkboxRow: {
      ml: 0,
      mr: 0,
      mt: '16px',
      alignItems: 'center',
    },
    // The 16 px box: unticked it is the grey outline of the screen, ticked it is filled with the primary colour.
    checkbox: {
      p: 0,
      mr: '12px',
      color: theme.palette.grey[300],
      '&.Mui-checked': { color: theme.palette.primary.main },
      '& .MuiSvgIcon-root': { fontSize: 16 },
    },
    checkboxLabel: {
      fontSize: 11,
      lineHeight: '16px',
      color: theme.palette.text.primary,
    },
    // The Analyze button and the reason beside it, 16 px under the checkbox row.
    analyzeRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      mt: '16px',
    },
    // The 120 x 40 primary button (the shape is shared in common.ts).
    analyzeButton: { ...common.primaryButton, flexShrink: 0, width: 120 },
    reason: { ...common.secondaryText },
  };
}
