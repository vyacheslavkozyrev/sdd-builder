import type { SxProps, Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import { frameStyle } from './frameStyle.js';

// Style getters for the shared frame and its parts (.claude/rules/web-styling.md). Each takes
// the theme and returns the style objects its component passes to `sx`. Colours come from the
// theme's palette; shared shapes come from getCommonStyles.

export interface AppFrameStyles {
  readonly root: SxProps<Theme>;
  readonly content: SxProps<Theme>;
  readonly main: SxProps<Theme>;
}

export function getAppFrameStyles(theme: Theme): AppFrameStyles {
  const common = getCommonStyles(theme);
  return {
    root: { ...frameStyle(), display: 'flex', bgcolor: theme.palette.background.default },
    content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
    main: { ...common.card, flex: 1, m: 3, mb: 0 },
  };
}

export interface LeftPanelStyles {
  readonly root: SxProps<Theme>;
  readonly wordmark: SxProps<Theme>;
  readonly newProjectButton: SxProps<Theme>;
}

export function getLeftPanelStyles(theme: Theme): LeftPanelStyles {
  const common = getCommonStyles(theme);
  return {
    root: {
      width: 260,
      minHeight: '100%',
      boxSizing: 'border-box',
      p: 3,
      borderRight: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper,
    },
    wordmark: {
      fontSize: 18,
      fontWeight: 600,
      lineHeight: '24px',
      color: theme.palette.text.primary,
      mb: 3,
    },
    newProjectButton: common.outlineButton,
  };
}

export interface FooterStyles {
  readonly root: SxProps<Theme>;
  readonly note: SxProps<Theme>;
}

export function getFooterStyles(theme: Theme): FooterStyles {
  const common = getCommonStyles(theme);
  return {
    root: { px: 3, pt: 1.5, pb: 1.5, boxSizing: 'border-box' },
    note: common.secondaryText,
  };
}
