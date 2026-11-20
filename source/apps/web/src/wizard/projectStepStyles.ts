import type { SxProps, Theme } from '@mui/material/styles';

// Style getter for the project step (.claude/rules/web-styling.md). It takes the theme and returns
// the style objects ProjectStep passes to `sx`. Colours come from the theme's palette only.
// Positions follow the approved F-09 screen 01 (1280 x 800, the card's content box at x 308 to 1232).

export interface ProjectStepStyles {
  readonly root: SxProps<Theme>;
  readonly nameLabel: SxProps<Theme>;
  readonly ideaLabel: SxProps<Theme>;
  readonly required: SxProps<Theme>;
  readonly nameField: SxProps<Theme>;
  readonly ideaField: SxProps<Theme>;
  readonly help: SxProps<Theme>;
  readonly nameHelp: SxProps<Theme>;
  readonly nameNote: SxProps<Theme>;
  readonly counterRow: SxProps<Theme>;
  readonly counterHelp: SxProps<Theme>;
  readonly counter: SxProps<Theme>;
  readonly limitCounter: SxProps<Theme>;
  readonly noteBox: SxProps<Theme>;
  readonly noteText: SxProps<Theme>;
  readonly helpAfterNote: SxProps<Theme>;
}

// The name field is 40 px high; the idea box is 200 px high (9 rows of 20 px plus 9 px padding above and below).
const NAME_FIELD_HEIGHT = 40;
// The number of rows of the idea field; ProjectStep renders the field with this many rows.
export const IDEA_ROWS = 9;
const IDEA_LINE_HEIGHT = 20;
const IDEA_PADDING = '9px';
const FIELD_RADIUS = '8px';
const NOTE_HEIGHT = 34;

export function getProjectStepStyles(theme: Theme): ProjectStepStyles {
  const { palette } = theme;
  // The outline and fill of a field: white, 8 px radius, the grey border of the approved screens.
  const fieldSurface = {
    '& .MuiOutlinedInput-root': {
      bgcolor: palette.background.paper,
      borderRadius: FIELD_RADIUS,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: palette.grey[300],
    },
    '& .MuiInputBase-input::placeholder': {
      color: palette.text.secondary,
      opacity: 1,
    },
  };
  const label: SxProps<Theme> = {
    display: 'block',
    m: 0,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '16px',
    color: palette.text.primary,
    mb: '8px',
  };
  const help: SxProps<Theme> = {
    m: 0,
    mt: '4px',
    fontSize: 12,
    lineHeight: '20px',
    color: palette.text.secondary,
  };
  const limitText: SxProps<Theme> = {
    m: 0,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '20px',
    color: palette.warning.dark,
  };
  return {
    root: {
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
    },
    nameLabel: { ...label, mt: '4px' },
    ideaLabel: { ...label, mt: '8px' },
    required: { color: palette.error.dark },
    nameField: {
      width: '100%',
      ...fieldSurface,
      '& .MuiOutlinedInput-root': {
        ...fieldSurface['& .MuiOutlinedInput-root'],
        height: NAME_FIELD_HEIGHT,
      },
      '& .MuiOutlinedInput-input': {
        boxSizing: 'border-box',
        height: '100%',
        px: 2,
        py: 0,
        fontSize: 13,
        lineHeight: '20px',
        color: palette.text.primary,
      },
    },
    ideaField: {
      width: '100%',
      ...fieldSurface,
      '& .MuiOutlinedInput-input': {
        boxSizing: 'border-box',
        px: 2,
        py: IDEA_PADDING,
        fontSize: 13,
        lineHeight: `${IDEA_LINE_HEIGHT}px`,
        color: palette.text.primary,
      },
    },
    help,
    nameHelp: { ...help, mt: '20px' },
    nameNote: { ...limitText, mt: '20px' },
    counterRow: {
      mt: '20px',
      height: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    counterHelp: { ...help, mt: 0, flex: 1, minWidth: 0 },
    counter: {
      m: 0,
      ml: 'auto',
      flexShrink: 0,
      fontSize: 12,
      lineHeight: '20px',
      color: palette.text.secondary,
    },
    limitCounter: { ...limitText, ml: 'auto', flexShrink: 0 },
    // The idea note box (screen 03): 34 px high, 6 px radius, a 1 px amber outline and an amber fill.
    noteBox: {
      boxSizing: 'border-box',
      mt: '4px',
      height: NOTE_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      px: 2,
      borderRadius: '6px',
      border: `1px solid ${palette.warning.main}`,
      bgcolor: palette.warning.light,
    },
    noteText: { ...limitText, mt: 0 },
    helpAfterNote: { ...help, mt: '20px' },
  };
}
