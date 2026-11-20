import { createTheme } from '@mui/material/styles';

// The colour palette of the application (approved F-07 and F-11 screens: Material Kit colours).
// This file is the only place a colour value is written. Components read colours through
// the theme (theme.palette.*) and never use a literal colour (.claude/rules/web-styling.md).

// The soft shadow of the white cards (F-07 screens, restyle of 2026-11-18). It is not a palette
// colour, so it is exported next to the theme and read by common.ts, which keeps the literal here.
export const cardShadow = '0 1px 4px rgba(50, 56, 62, 0.12)';

export const theme = createTheme({
  palette: {
    primary: { main: '#635BFF' },
    background: { default: '#F0F4F8', paper: '#FFFFFF' },
    text: { primary: '#32383E', secondary: '#636B74' },
    divider: '#DDE7EE',
    grey: { 300: '#CDD7E1' },
  },
});
