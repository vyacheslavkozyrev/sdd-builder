import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';
import type { BlockKind } from './blocks.js';

// Style getters for the flow tab's toolbox (.claude/rules/web-styling.md). Each takes the theme and
// returns the style objects the toolbox passes to `sx`. Colours come from the theme's palette only.

export interface ToolboxStyles {
  // The floating area at the top right of the canvas: the disabled reason and the card, side by side.
  readonly root: StyleObject;
  // The card of the icon buttons (F-12 screen 01): white, soft shadow, 10 px radius, 6 px inset top and
  // bottom and 8 px at the sides, as the screen draws it.
  readonly card: StyleObject;
  // The reason beside the card when Start is disabled: secondary text, right-aligned.
  readonly reason: StyleObject;
  // One icon button by the block it adds. Its colour is the icon colour of the approved screen; the
  // icon draws in the current colour. A disabled button takes the disabled text colour.
  readonly buttons: Readonly<Record<BlockKind, StyleObject>>;
}

// The toolbox of the flow tab (F-12 AC-001, AC-003, screen 01): 32 px icon buttons with an 8 px
// radius, placed 16 px below and 24 px in from the top right of the canvas card.
export function getToolboxStyles(theme: Theme): ToolboxStyles {
  const common = getCommonStyles(theme);
  const button: StyleObject = {
    width: 32,
    height: 32,
    minWidth: 0,
    p: 0,
    borderRadius: '8px',
    '&.Mui-disabled': {
      color: theme.palette.text.disabled,
    },
  };
  return {
    root: {
      position: 'absolute',
      top: '16px',
      right: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 1,
    },
    card: {
      ...common.card,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      p: '6px 8px',
      borderRadius: '10px',
      width: 'fit-content',
    },
    reason: {
      ...common.secondaryText,
      maxWidth: 240,
      textAlign: 'right',
    },
    buttons: {
      agent: { ...button, color: theme.palette.primary.main },
      condition: { ...button, color: theme.palette.text.secondary },
      start: { ...button, color: theme.palette.primary.main },
      end: { ...button, color: theme.palette.text.primary },
    },
  };
}
