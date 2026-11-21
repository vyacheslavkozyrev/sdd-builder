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

export interface MessageBandStyles {
  // The column at the top centre of the builder: it floats over the canvas and takes no pointer input,
  // so it never blocks a drag.
  readonly root: StyleObject;
  // One message: the blocker colours from the palette, a light red fill with red text (F-11 screens 05 and 08).
  readonly message: StyleObject;
}

export function getMessageBandStyles(theme: Theme): MessageBandStyles {
  return {
    root: {
      position: 'absolute',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: 'calc(100% - 24px)',
      zIndex: 1,
      pointerEvents: 'none',
    },
    message: {
      boxSizing: 'border-box',
      px: '16px',
      py: '8px',
      borderRadius: '8px',
      border: `1px solid ${theme.palette.error.main}`,
      bgcolor: theme.palette.error.light,
      color: theme.palette.error.main,
      fontSize: 12,
      lineHeight: '20px',
      textAlign: 'center',
    },
  };
}

export interface ErrorPanelStyles {
  // The panel's box at the right of the canvas card's header: it holds the counter and, when open, the list.
  readonly root: StyleObject;
  // The counter button: one line, the blocker colours from the palette (a light red fill with red text).
  readonly toggle: StyleObject;
  // The list that opens under the counter: a white card over the canvas, scrolling when it is long.
  readonly list: StyleObject;
  // The title of the "Not on a drawn item" section inside the list.
  readonly sectionTitle: StyleObject;
  readonly items: StyleObject;
  // One finding: its kind, its path and its message on one line.
  readonly item: StyleObject;
  // The kind of a finding: a blocker in the blocker colour, a warning in the warning colour.
  readonly kind: { readonly blocker: StyleObject; readonly warning: StyleObject };
  // The path of a finding, in secondary text so the message reads first.
  readonly path: StyleObject;
  readonly message: StyleObject;
}

// The error panel (F-11 AC-035 notification part, AC-036): one counter for every blocker and warning, and
// the full list on a click. It sits in the canvas card's header, so it covers no canvas box while closed.
export function getErrorPanelStyles(theme: Theme): ErrorPanelStyles {
  const common = getCommonStyles(theme);
  return {
    root: {
      position: 'relative',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    toggle: {
      height: 28,
      minWidth: 0,
      px: '12px',
      borderRadius: '8px',
      border: `1px solid ${theme.palette.error.main}`,
      bgcolor: theme.palette.error.light,
      color: theme.palette.error.main,
      fontSize: 12,
      lineHeight: '20px',
      textTransform: 'none',
      whiteSpace: 'nowrap',
      '&:hover': { bgcolor: theme.palette.error.light },
    },
    list: {
      ...common.card,
      boxSizing: 'border-box',
      position: 'absolute',
      top: '100%',
      right: 0,
      mt: '8px',
      zIndex: 2,
      width: 420,
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: 280,
      overflowY: 'auto',
      p: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    sectionTitle: common.sectionTitle,
    items: {
      m: 0,
      p: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    item: {
      m: 0,
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.primary,
      overflowWrap: 'anywhere',
    },
    kind: {
      blocker: {
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '20px',
        color: theme.palette.error.main,
        mr: '8px',
      },
      warning: {
        ...common.warningText,
        display: 'inline',
        mr: '8px',
      },
    },
    path: {
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.secondary,
      mr: '8px',
    },
    message: {
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
  };
}
