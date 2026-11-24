import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';
import type { Finding } from './marks.js';

// Style getters for the structure marks (.claude/rules/web-styling.md). Each takes the theme and returns
// the style objects its component passes to `sx`, and the ink the canvas passes to its SVG attributes.
// Colours come from the theme's palette only; the amber note shapes come from getCommonStyles. The list of
// findings is styled by the error panel's getter (builderStyles.ts), and the block's list by this one.

// The ink of a structure mark on the canvas: the outline, the fill and the text of its badge.
export interface MarkInk {
  readonly line: string;
  readonly fill: string;
  readonly text: string;
}

// The ink of each severity: the amber of a warning (F-11 legend, "Warning"), the red of a blocker (the error
// colour of F-11's flow box).
export type MarkInks = Record<Finding['severity'], MarkInk>;

export interface MarkViewsStyles {
  // A warning beside its flow box or arrow: the amber note box (F-11 legend, "Warning").
  readonly note: StyleObject;
  // The text of a warning note.
  readonly noteText: StyleObject;
  // The colours of a mark drawn on a block or an arrow of the flow tab (F-12 AC-045).
  readonly ink: MarkInks;
  // The read-only list of a block's findings in its panel (F-12 AC-045, AC-048): a column under the fields.
  readonly findings: StyleObject;
  // The heading of the list, as a field label.
  readonly findingsTitle: StyleObject;
  readonly findingsList: StyleObject;
  readonly findingItem: StyleObject;
  // The kind of a finding ("Blocker" or "Warning"), in the colour of its severity.
  readonly findingKind: Record<Finding['severity'], StyleObject>;
  readonly findingMessage: StyleObject;
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
    ink: {
      warning: {
        line: theme.palette.warning.main,
        fill: theme.palette.warning.light,
        text: theme.palette.warning.dark,
      },
      blocker: {
        line: theme.palette.error.main,
        fill: theme.palette.error.light,
        text: theme.palette.error.dark,
      },
    },
    findings: {
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 0,
    },
    findingsTitle: common.groupLabel,
    findingsList: {
      m: 0,
      p: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    findingItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0,
    },
    findingKind: {
      blocker: {
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '16px',
        color: theme.palette.error.dark,
      },
      warning: {
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '16px',
        color: theme.palette.warning.dark,
      },
    },
    findingMessage: {
      ...common.secondaryText,
      overflowWrap: 'anywhere',
    },
  };
}
