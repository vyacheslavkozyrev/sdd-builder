import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getters for the pipeline builder's parts (.claude/rules/web-styling.md). Each takes the
// theme and returns the style objects its component passes to `sx`. Colours come from the
// theme's palette; the plus button's shape comes from getCommonStyles.

export interface PipelineTabsStyles {
  // The row that holds the tab list and the + control.
  readonly row: StyleObject;
  // The tab list itself: only the tabs sit in it, so the list owns only tab elements.
  readonly tabList: StyleObject;
  // A tab's style by its state: `tab.open` or `tab.closed`.
  readonly tab: { readonly open: StyleObject; readonly closed: StyleObject };
  readonly addButton: StyleObject;
}

// The tab row (F-11 screen 01): 32 px tabs with an 8 px radius, the open tab in the primary
// colour, and the 28 px plus button after the last tab.
export function getPipelineTabsStyles(theme: Theme): PipelineTabsStyles {
  const common = getCommonStyles(theme);
  const closed: StyleObject = {
    height: 32,
    minWidth: 0,
    px: '13px',
    borderRadius: '8px',
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    fontSize: 12,
    lineHeight: '20px',
    textTransform: 'none',
    whiteSpace: 'nowrap',
  };
  return {
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: 0,
    },
    tabList: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: 0,
    },
    tab: {
      closed,
      open: {
        ...closed,
        border: `1px solid ${theme.palette.primary.main}`,
        bgcolor: theme.palette.primary.main,
        color: theme.palette.background.paper,
      },
    },
    addButton: common.plusMinusButton,
  };
}
