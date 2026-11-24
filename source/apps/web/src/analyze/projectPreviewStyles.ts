import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the project preview and its dialog (.claude/rules/web-styling.md). Colours come from the theme's
// palette only. Positions follow the approved F-13 screens 01, 06 and 08 (1280 x 800); shared shapes are in common.ts.

export interface ProjectPreviewStyles {
  readonly root: StyleObject;
  readonly heading: StyleObject;
  readonly count: StyleObject;
  readonly panel: StyleObject;
  readonly list: StyleObject;
  // A row of the tree, indented 16 px per level; a folder is in secondary text.
  readonly row: (depth: number, folder: boolean) => StyleObject;
  // The "rule" tag of a rule file: a 16 px pill in the pale violet fill.
  readonly tag: StyleObject;
  readonly fullTree: StyleObject;
  readonly generate: StyleObject;
  readonly reason: StyleObject;
  readonly note: StyleObject;
  readonly dialogPaper: StyleObject;
  readonly dialogTitle: StyleObject;
  readonly dialogCount: StyleObject;
  readonly dialogPanel: StyleObject;
  readonly dialogActions: StyleObject;
  readonly close: StyleObject;
}

export function getProjectPreviewStyles(theme: Theme): ProjectPreviewStyles {
  const common = getCommonStyles(theme);
  const panel: StyleObject = {
    boxSizing: 'border-box',
    height: 424,
    overflowY: 'auto',
    px: '16px',
    py: '8px',
    borderRadius: '8px',
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper,
  };
  return {
    root: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minWidth: 0 },
    heading: { m: 0, fontSize: 14, fontWeight: 500, lineHeight: '20px', color: theme.palette.text.primary },
    count: { ...common.secondaryText, mt: '4px' },
    panel,
    list: { m: 0, p: 0, listStyle: 'none' },
    row: (depth, folder) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      height: 20,
      pl: `${depth * 16}px`,
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: 12,
      lineHeight: '20px',
      whiteSpace: 'nowrap',
      color: folder ? theme.palette.text.secondary : theme.palette.text.primary,
    }),
    tag: {
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ml: 'auto',
      mr: '4px',
      height: 16,
      minWidth: 44,
      px: '6px',
      borderRadius: '8px',
      fontSize: 10,
      fontWeight: 500,
      lineHeight: '16px',
      color: theme.palette.primary.main,
      bgcolor: theme.palette.primary.light,
    },
    fullTree: { ...common.outlineButton, width: '100%', height: 36, mt: '16px' },
    generate: { ...common.primaryButton, width: '100%', mt: '24px' },
    reason: { ...common.secondaryText, mt: '8px' },
    note: { ...common.secondaryText, mt: '8px' },
    dialogPaper: {
      boxSizing: 'border-box',
      width: 600,
      maxWidth: '100%',
      p: '24px',
      borderRadius: '12px',
      bgcolor: theme.palette.background.paper,
    },
    dialogTitle: { m: 0, fontSize: 24, fontWeight: 500, lineHeight: '32px', color: theme.palette.text.primary },
    dialogCount: { ...common.secondaryText, fontSize: 13, mt: '4px' },
    dialogPanel: { ...panel, height: 440, mt: '12px' },
    dialogActions: { display: 'flex', justifyContent: 'flex-end', mt: '16px' },
    close: { ...common.outlineButton, minWidth: 92 },
  };
}
