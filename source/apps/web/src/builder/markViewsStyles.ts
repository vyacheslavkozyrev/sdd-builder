import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getters for the structure marks (.claude/rules/web-styling.md). Each takes the theme and returns
// the style objects its component passes to `sx`. Colours come from the theme's palette only; the amber
// note shapes come from getCommonStyles. The list of findings is styled by the error panel's getter.

export interface MarkViewsStyles {
  // A warning beside its flow box or arrow: the amber note box (F-11 legend, "Warning").
  readonly note: StyleObject;
  // The text of a warning note.
  readonly noteText: StyleObject;
}

export function getMarkViewsStyles(theme: Theme): MarkViewsStyles {
  const common = getCommonStyles(theme);
  return {
    note: {
      ...common.warningBox,
      px: '8px',
      py: '4px',
      maxWidth: 240,
    },
    noteText: {
      ...common.warningText,
      lineHeight: '16px',
    },
  };
}
