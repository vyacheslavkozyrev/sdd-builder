import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
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
