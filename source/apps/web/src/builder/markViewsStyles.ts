import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getters for the structure marks (.claude/rules/web-styling.md). Each takes the theme and returns
// the style objects its component passes to `sx`. Colours come from the theme's palette only; the amber
// note shapes come from getCommonStyles.

export interface MarkViewsStyles {
  // A warning beside its flow box or arrow: the amber note box (F-11 legend, "Warning").
  readonly note: StyleObject;
  // The text of a warning note.
  readonly noteText: StyleObject;
  // The section under the canvas that lists the findings with no drawn item (AC-036).
  readonly unplaced: StyleObject;
  // The title of that section.
  readonly unplacedTitle: StyleObject;
  // The list of findings in the section, one item per finding.
  readonly unplacedList: StyleObject;
  readonly unplacedItem: StyleObject;
  // The kind of a finding in the list: a blocker in the blocker colour, a warning in the warning colour.
  readonly kind: { readonly blocker: StyleObject; readonly warning: StyleObject };
  // The path of a finding, set in secondary text so the message reads first.
  readonly path: StyleObject;
  readonly message: StyleObject;
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
    unplaced: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      mt: '16px',
      minWidth: 0,
    },
    unplacedTitle: common.sectionTitle,
    unplacedList: {
      m: 0,
      p: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    unplacedItem: {
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
