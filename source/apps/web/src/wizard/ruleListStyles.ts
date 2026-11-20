import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';

// Style getter for the rule list of the technical details step (.claude/rules/web-styling.md). It takes
// the theme and returns the style objects RuleList and its confirmation dialog pass to `sx`. Colours come
// from the theme's palette only. Positions follow the approved F-10 screens 01, 02, 04 and 05: the right
// column is 444 px wide, the list is its own scroll region, and the confirmation is 400 px wide.
// The shared section title, plus button, note and text shapes are in common.ts.

export interface RuleListStyles {
  readonly root: SxProps<Theme>;
  readonly header: SxProps<Theme>;
  readonly title: SxProps<Theme>;
  readonly headerActions: SxProps<Theme>;
  readonly limitNote: SxProps<Theme>;
  readonly limitText: SxProps<Theme>;
  readonly addButton: SxProps<Theme>;
  readonly helpLine: SxProps<Theme>;
  readonly list: SxProps<Theme>;
  readonly emptyTitle: SxProps<Theme>;
  readonly emptyText: SxProps<Theme>;
  readonly dialogPaper: SxProps<Theme>;
  readonly dialogTitle: SxProps<Theme>;
  readonly dialogText: SxProps<Theme>;
  readonly dialogActions: SxProps<Theme>;
  readonly dialogCancel: SxProps<Theme>;
  readonly dialogRemove: SxProps<Theme>;
}

// The limit note sits left of the plus button: 300 px wide, 32 px high, two lines of 16 px.
const LIMIT_NOTE_WIDTH = 300;
const LIMIT_NOTE_HEIGHT = 32;
const DIALOG_WIDTH = 400;
const DIALOG_BUTTON_WIDTH = 120;
const DIALOG_BUTTON_HEIGHT = 40;

export function getRuleListStyles(theme: Theme): RuleListStyles {
  const { palette } = theme;
  const common = getCommonStyles(theme);
  return {
    root: {
      boxSizing: 'border-box',
      width: 444,
      flexShrink: 0,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 28,
    },
    title: common.sectionTitle,
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    limitNote: {
      ...common.warningBox,
      width: LIMIT_NOTE_WIDTH,
      height: LIMIT_NOTE_HEIGHT,
      py: 0,
    },
    limitText: { ...common.warningText, lineHeight: '16px' },
    // A disabled plus keeps its place: the grey fill and border of the disabled controls (screen 05).
    addButton: {
      ...common.plusMinusButton,
      '&.Mui-disabled': {
        bgcolor: palette.background.default,
        borderColor: palette.divider,
        color: palette.text.disabled,
      },
    },
    helpLine: { ...common.secondaryText, mt: '8px' },
    // The list fills the rest of the column and scrolls inside itself; the page does not scroll.
    list: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      mt: '12px',
    },
    emptyTitle: { ...common.fieldLabel, mb: 0 },
    emptyText: { ...common.secondaryText, mt: '4px' },
    dialogPaper: {
      boxSizing: 'border-box',
      width: DIALOG_WIDTH,
      maxWidth: '100%',
      p: '24px',
      borderRadius: '12px',
      bgcolor: palette.background.paper,
    },
    dialogTitle: {
      m: 0,
      fontSize: 16,
      fontWeight: 600,
      lineHeight: '24px',
      color: palette.text.primary,
      textAlign: 'center',
    },
    dialogText: { ...common.secondaryText, mt: '8px', textAlign: 'center' },
    dialogActions: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      mt: '24px',
    },
    dialogCancel: {
      ...common.outlineButton,
      width: DIALOG_BUTTON_WIDTH,
      height: DIALOG_BUTTON_HEIGHT,
    },
    dialogRemove: {
      width: DIALOG_BUTTON_WIDTH,
      height: DIALOG_BUTTON_HEIGHT,
      borderRadius: '8px',
      textTransform: 'none',
      bgcolor: palette.error.main,
      color: palette.background.paper,
      '&:hover': { bgcolor: palette.error.dark },
    },
  };
}
