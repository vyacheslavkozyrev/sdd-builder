import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getters for the flow tab's block canvas (.claude/rules/web-styling.md). Each takes the theme and
// returns the style objects the canvas passes to `sx`, and the ink the drawing passes to its SVG attributes.
// Colours come from the theme's palette only; the selected tint is the primary colour at low opacity.

// The colours of the drawing, read from the palette (screen 01): the lines, the labels, the outlines.
export interface BlockInk {
  readonly paper: string;
  readonly text: string;
  readonly muted: string;
  readonly line: string;
  readonly accent: string;
  readonly endOutline: string;
  readonly tint: string;
  readonly trueLabel: string;
  readonly falseLabel: string;
}

export interface BlockCanvasStyles {
  // The canvas card (F-12 screen 01): white, shadowed, 12 px radius. It is the frame of the toolbox,
  // which is absolutely positioned inside it, so the card is positioned too.
  readonly card: StyleObject;
  // The area that scrolls the drawing: it fills the card and sits under the heading and the toolbox.
  readonly scroll: StyleObject;
  // The heading of the flow: its name, and the count line under it (AC-010).
  readonly heading: StyleObject;
  readonly title: StyleObject;
  readonly count: StyleObject;
  // The footer hint under the drawing.
  readonly hint: StyleObject;
  // The text of an empty flow (AC-006): centred in the card.
  readonly empty: StyleObject;
  readonly ink: BlockInk;
}

const tintAlpha = 0.12;

// The flow tab's canvas card and its drawing (F-12 screen 01, AC-006 to AC-010).
export function getBlockCanvasStyles(theme: Theme): BlockCanvasStyles {
  const common = getCommonStyles(theme);
  return {
    card: {
      ...common.card,
      position: 'relative',
      boxSizing: 'border-box',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
    },
    scroll: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      overflow: 'auto',
    },
    heading: {
      position: 'absolute',
      top: '24px',
      left: '24px',
      zIndex: 1,
    },
    title: {
      m: 0,
      fontSize: 14,
      fontWeight: 500,
      lineHeight: '20px',
      color: theme.palette.text.primary,
    },
    count: {
      ...common.secondaryText,
      fontSize: 11,
      lineHeight: '16px',
    },
    hint: {
      ...common.secondaryText,
      position: 'absolute',
      right: '24px',
      bottom: '20px',
      left: '24px',
    },
    empty: {
      ...common.secondaryText,
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ink: {
      paper: theme.palette.background.paper,
      text: theme.palette.text.primary,
      muted: theme.palette.text.secondary,
      line: theme.palette.text.secondary,
      accent: theme.palette.primary.main,
      endOutline: theme.palette.text.primary,
      tint: alpha(theme.palette.primary.main, tintAlpha),
      trueLabel: theme.palette.success.dark,
      falseLabel: theme.palette.warning.dark,
    },
  };
}
