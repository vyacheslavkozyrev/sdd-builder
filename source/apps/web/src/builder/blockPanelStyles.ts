import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';
import { getFlowPanelStyles } from './flowPanelStyles.js';
import type { FlowPanelStyles } from './flowPanelStyles.js';

// Style getter for the block panels of the flow tab (.claude/rules/web-styling.md). The fields take the
// field shapes of the flow panel: a block panel edits the same kinds of field, so it takes the same getter.
// The header (the title and the subtitle of screen 02) is added here. Colours come from the theme's palette.

export interface BlockPanelStyles extends FlowPanelStyles {
  // The title and subtitle above the fields: a column with 4 px between the two lines, 16 px in from the sides.
  readonly header: StyleObject;
  // The title, "Agent: <name>": the shared sectionTitle shape of common.ts.
  readonly title: StyleObject;
  // The subtitle, "Agent block in the <flow> flow": the shared secondaryText shape of common.ts.
  readonly subtitle: StyleObject;
}

export function getBlockPanelStyles(theme: Theme): BlockPanelStyles {
  const common = getCommonStyles(theme);
  return {
    ...getFlowPanelStyles(theme),
    header: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      px: '16px',
      pt: '16px',
    },
    title: common.sectionTitle,
    subtitle: common.secondaryText,
  };
}
