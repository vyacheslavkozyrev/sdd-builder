// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MessageBand } from '../src/builder/MessageBand.js';
import { theme } from '../src/theme.js';

// The band is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

// The band reads its colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// jsdom reports a computed colour as rgb(...), so a theme hex value is converted the same way.
function rgbOf(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

describe('F-11 AC-014 refusal reason in the band', () => {
  it('F-11 AC-014 shows a refused drag with its reason at the top centre of the builder', () => {
    renderWithTheme(<MessageBand refusal={'flow "specify" already has an outgoing arrow to "plan"'} />);
    const band = screen.getByRole('status');
    expect(band.textContent).toBe('Refused · flow "specify" already has an outgoing arrow to "plan"');
    const style = getComputedStyle(band);
    expect(style.position).toBe('absolute');
    expect(style.left).toBe('50%');
  });

  it('F-11 AC-014 shows the refusal as one line only, in the error colours from the theme', () => {
    renderWithTheme(<MessageBand refusal={'the target "plan" is not a flow of this pipeline'} />);
    const band = screen.getByRole('status');
    expect(band.children).toHaveLength(1);
    const style = getComputedStyle(band.firstElementChild as HTMLElement);
    expect(style.color).toBe(rgbOf(theme.palette.error.main));
    expect(style.backgroundColor).toBe(rgbOf(theme.palette.error.light));
  });

  it('F-11 AC-014 negative case: a band with no refusal draws nothing', () => {
    const { container } = renderWithTheme(<MessageBand refusal={null} />);
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
