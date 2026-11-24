import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getters for the Workflow step (F-11 screen 01, F-12 screen 01): the tab row above, the canvas card on
// the left and the properties card on the right (272 px). The cards are white with the shared card shape, and the
// colours come from the theme's palette only (.claude/rules/web-styling.md).

export interface PipelineStepStyles {
  // The step's column in the centre area: the tab row, then the body of the two cards. The frame draws
  // no card behind it (AppFrame fill), so the tab row sits on the grey page above the cards.
  readonly root: StyleObject;
  // The row of the two cards, 20 px apart.
  readonly body: StyleObject;
  // The canvas card (F-11 screen 01): the white card that holds the header, the canvas and the warning
  // notes. The header sits inside it, at 16 px from its top edge.
  readonly canvasColumn: StyleObject;
  // The header row: the title and hint on the left, the error panel's counter on the right.
  readonly canvasHeader: StyleObject;
  readonly canvasTitles: StyleObject;
  readonly canvasTitle: StyleObject;
  readonly hint: StyleObject;
  // The box that holds the canvas and the warning notes laid over it.
  readonly canvasArea: StyleObject;
  // The warning notes under one flow box: placed at the box's left edge and the given top, 100 px wide.
  readonly noteColumn: (left: number, top: number) => StyleObject;
  // The properties card: 272 px wide, with a fixed header and a body that fills the rest. The card has no
  // padding of its own: the header and the panel's scrolling region each carry the 16 px inset, so the
  // scrollbar sits on the card's right edge with a gap before the content (F-11 AC-006 layout point 2).
  readonly propertiesCard: StyleObject;
  readonly propertiesHeader: StyleObject;
  readonly propertiesTitle: StyleObject;
  readonly propertiesSubtitle: StyleObject;
  readonly propertiesBody: StyleObject;
  // The flow tab (F-12 screen 01): the column on the left holds the block canvas card, which fills it. The error
  // panel sits inside that card, so the column has no row of its own.
  readonly flowColumn: StyleObject;
  readonly flowCanvas: StyleObject;
}

const PROPERTIES_WIDTH = 272;
const COLUMN_GAP = '20px';
const NOTE_WIDTH = 100;

export function getPipelineStepStyles(theme: Theme): PipelineStepStyles {
  const common = getCommonStyles(theme);
  return {
    root: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    body: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'row',
      gap: COLUMN_GAP,
    },
    canvasColumn: {
      ...common.card,
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      p: '16px',
      gap: '12px',
    },
    canvasHeader: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px',
    },
    canvasTitles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
    },
    canvasTitle: common.sectionTitle,
    hint: common.secondaryText,
    canvasArea: {
      position: 'relative',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    noteColumn: (left, top) => ({
      position: 'absolute',
      left,
      top,
      width: NOTE_WIDTH,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      // The notes sit over the canvas; they take no pointer, so a drag on the canvas still reaches it.
      pointerEvents: 'none',
    }),
    propertiesCard: {
      ...common.card,
      width: PROPERTIES_WIDTH,
      flexShrink: 0,
      minHeight: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    propertiesHeader: {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      px: '16px',
      pt: '16px',
      pb: '12px',
    },
    propertiesTitle: common.sectionTitle,
    propertiesSubtitle: common.secondaryText,
    // The slot between the header and the card's edge. The panel inside it holds the one scrolling region
    // (its fields) and the fixed footer, so this slot itself does not scroll.
    propertiesBody: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    flowColumn: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    flowCanvas: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    },
  };
}
