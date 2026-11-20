import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StepState } from './steps.js';

// Style getters for the wizard (.claude/rules/web-styling.md). Each takes the theme and returns
// the style objects its component passes to `sx`. Colours come from the theme's palette only.

export interface WizardStepperStyles {
  readonly root: SxProps<Theme>;
  readonly connector: SxProps<Theme>;
  readonly label: Readonly<Record<StepState, SxProps<Theme>>>;
  readonly node: Readonly<Record<StepState, SxProps<Theme>>>;
}

// A node is a 24 px circle (radius 12). The current node has a 4 px soft ring centred on radius 18
// (screen 01): a white gap from radius 12 to 16, then the ring from 16 to 20.
const NODE_SIZE = 24;
const RING_GAP = '4px';
const RING_OUTER = '8px';
const RING_ALPHA = 0.2;

export interface WizardNavStyles {
  readonly row: SxProps<Theme>;
  readonly prev: SxProps<Theme>;
  readonly next: SxProps<Theme>;
}

// Prev and Next are 100 x 40 px with an 8 px radius; they sit 12 px apart (screen 01: x 24 and
// x 136). Prev takes the outlined shape from common.ts. A disabled button keeps its place and
// takes the screen's grey (screen 01 for Prev, screen 04 for Next): grey fill, grey outline and
// grey text, all from the palette.
const NAV_BUTTON_WIDTH = 100;
const NAV_GAP = '12px';

export function getWizardNavStyles(theme: Theme): WizardNavStyles {
  const { palette } = theme;
  const common = getCommonStyles(theme);
  const button: SxProps<Theme> = {
    width: NAV_BUTTON_WIDTH,
    height: 40,
    borderRadius: '8px',
    boxShadow: 'none',
    textTransform: 'none',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1,
  };
  const disabled: SxProps<Theme> = {
    bgcolor: palette.background.default,
    borderColor: palette.divider,
    color: palette.text.disabled,
    boxShadow: 'none',
  };
  return {
    row: {
      display: 'flex',
      gap: NAV_GAP,
    },
    prev: {
      ...button,
      ...common.outlineButton,
      '&.Mui-disabled': disabled,
    },
    next: {
      ...button,
      '&.Mui-disabled': { ...disabled, border: '1px solid' },
    },
  };
}

export function getWizardStepperStyles(theme: Theme): WizardStepperStyles {
  const { palette } = theme;
  const nodeBase: SxProps<Theme> = {
    width: NODE_SIZE,
    height: NODE_SIZE,
    boxSizing: 'border-box',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1,
  };
  return {
    root: {
      m: 0,
      p: 0,
      pl: '4px',
      listStyle: 'none',
    },
    connector: {
      flex: '0 0 auto',
      ml: '11px',
      my: '8px',
      // The line above a step is green once the step before it is done (screen 02 to 04): that is
      // when this step is current or done. Otherwise it is the to-do line (screen 01).
      '& .MuiStepConnector-line': {
        minHeight: 24,
        borderLeftWidth: '2px',
        borderColor: palette.grey[300],
      },
      '&.Mui-active .MuiStepConnector-line, &.Mui-completed .MuiStepConnector-line': {
        borderColor: palette.success.main,
      },
    },
    label: {
      done: {
        ml: '12px',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '20px',
        color: palette.success.dark,
      },
      current: {
        ml: '12px',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: '20px',
        color: palette.primary.main,
      },
      'to-do': {
        ml: '12px',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: '20px',
        color: palette.text.secondary,
      },
    },
    node: {
      done: {
        ...nodeBase,
        bgcolor: palette.success.main,
        color: palette.common.white,
      },
      current: {
        ...nodeBase,
        bgcolor: palette.primary.main,
        color: palette.common.white,
        boxShadow: `0 0 0 ${RING_GAP} ${palette.background.paper}, 0 0 0 ${RING_OUTER} ${alpha(palette.primary.main, RING_ALPHA)}`,
      },
      'to-do': {
        ...nodeBase,
        bgcolor: palette.background.paper,
        border: `1.5px solid ${palette.grey[300]}`,
        color: palette.text.secondary,
      },
    },
  };
}

export interface StepBodyStyles {
  readonly root: SxProps<Theme>;
  readonly circle: SxProps<Theme>;
  readonly sparkle: SxProps<Theme>;
  readonly line: SxProps<Theme>;
}

// The placeholder body fills the height of the white card and centres its content both ways.
// Screen 01: an 88 px light circle with the sparkle mark; the line (14 px, weight 500, 20 px line
// height) has its baseline at y 410, about 11 px below the circle's bottom edge at y 384.
const BODY_CIRCLE_SIZE = 88;
const BODY_SPARKLE_SIZE = 52;
const BODY_LINE_GAP = '11px';

export function getStepBodyStyles(theme: Theme): StepBodyStyles {
  const { palette } = theme;
  return {
    root: {
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      boxSizing: 'border-box',
      width: BODY_CIRCLE_SIZE,
      height: BODY_CIRCLE_SIZE,
      borderRadius: '50%',
      bgcolor: palette.background.default,
      border: `1px solid ${palette.divider}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    // The sparkle takes the primary colour through currentColor; the SVG path has no colour of its own.
    sparkle: {
      width: BODY_SPARKLE_SIZE,
      height: BODY_SPARKLE_SIZE,
      color: palette.primary.main,
      display: 'block',
    },
    line: {
      m: 0,
      mt: BODY_LINE_GAP,
      fontSize: 14,
      fontWeight: 500,
      lineHeight: '20px',
      color: palette.text.primary,
      textAlign: 'center',
    },
  };
}
