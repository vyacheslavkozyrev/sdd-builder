import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getters for the Pipeline canvas (.claude/rules/web-styling.md). Each takes the theme and
// returns the style objects the canvas passes to `sx`. Colours come from the theme's palette only.
// React Flow reads its own colours from CSS variables, so the root sets them from the palette and
// the library's default colours never show.

export interface CanvasStyles {
  // The canvas area, inside the step's canvas card (no card of its own), with the React Flow colours set from the palette.
  readonly root: StyleObject;
  // The message shown when the pipeline has no flows (AC-009): centred, secondary text.
  readonly empty: StyleObject;
  // A flow box by its state: `flowBox.normal`, or `flowBox.blocked` with a red border and light red fill (AC-035).
  readonly flowBox: { readonly normal: StyleObject; readonly blocked: StyleObject };
  // The flow's name in its box: bold, one line, cut with an ellipsis.
  readonly flowName: StyleObject;
  // The block count under the name: small, secondary text.
  readonly flowCount: StyleObject;
}

// The canvas and its boxes (F-11 screen 01): an 80 by 76 box with an 8 px radius, 1.5 px outline.
export function getCanvasStyles(theme: Theme): CanvasStyles {
  const common = getCommonStyles(theme);
  const box: StyleObject = {
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    px: '10px',
    py: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  };
  return {
    root: {
      position: 'relative',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
      '--xy-background-color': theme.palette.background.paper,
      '--xy-edge-stroke': theme.palette.text.secondary,
      '--xy-handle-background-color': theme.palette.primary.main,
      '--xy-handle-border-color': theme.palette.background.paper,
    },
    empty: {
      ...common.secondaryText,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    flowBox: {
      normal: {
        ...box,
        border: `1.5px solid ${theme.palette.primary.main}`,
        bgcolor: theme.palette.background.paper,
      },
      blocked: {
        ...box,
        border: `1.5px solid ${theme.palette.error.main}`,
        bgcolor: theme.palette.error.light,
      },
    },
    flowName: {
      display: 'block',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '20px',
      color: theme.palette.text.primary,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    flowCount: {
      display: 'block',
      fontSize: 11,
      lineHeight: '16px',
      color: theme.palette.text.secondary,
      whiteSpace: 'nowrap',
    },
  };
}
