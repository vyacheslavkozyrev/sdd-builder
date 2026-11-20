import type { SxProps, Theme } from '@mui/material/styles';
import { cardShadow } from '../theme.js';

// A single style object (not an array, not a function), so a shared shape can be spread
// into another style object.
export type StyleObject = Exclude<SxProps<Theme>, ReadonlyArray<unknown> | ((theme: Theme) => unknown)>;

// Style objects shared by more than one component (.claude/rules/web-styling.md). Each is
// built from the theme, so a colour is always a palette value. Components take them through
// getCommonStyles and never write a style object of their own for these shapes.

export interface CommonStyles {
  // A white surface with a 1 px divider border, a 12 px radius and the approved soft shadow.
  readonly card: StyleObject;
  // The outlined secondary button (New project): white fill, 8 px radius, 40 px high.
  readonly outlineButton: StyleObject;
  // Small secondary text, such as the footer note.
  readonly secondaryText: StyleObject;
}

export function getCommonStyles(theme: Theme): CommonStyles {
  return {
    card: {
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '12px',
      boxShadow: cardShadow,
      boxSizing: 'border-box',
    },
    outlineButton: {
      height: 40,
      borderRadius: '8px',
      borderColor: theme.palette.grey[300],
      color: theme.palette.text.primary,
      bgcolor: theme.palette.background.paper,
      textTransform: 'none',
    },
    secondaryText: {
      m: 0,
      fontSize: 12,
      lineHeight: '20px',
      color: theme.palette.text.secondary,
    },
  };
}
