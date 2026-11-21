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
    renderWithTheme(
      <MessageBand messages={[{ kind: 'refused', text: 'flow "specify" already has an outgoing arrow to "plan"' }]} />,
    );
    const band = screen.getByRole('status');
    expect(band.textContent).toBe('Refused · flow "specify" already has an outgoing arrow to "plan"');
    const style = getComputedStyle(band);
    expect(style.position).toBe('absolute');
    expect(style.left).toBe('50%');
  });
});

describe('F-11 AC-035 blocker message in the band', () => {
  it('F-11 AC-035 shows a blocker message as a notification in the blocker colour from the theme', () => {
    renderWithTheme(<MessageBand messages={[{ kind: 'blocker', text: 'flow-2 is not connected.' }]} />);
    const message = screen.getByText('Blocker · flow-2 is not connected.');
    const style = getComputedStyle(message);
    expect(style.color).toBe(rgbOf(theme.palette.error.main));
    expect(style.backgroundColor).toBe(rgbOf(theme.palette.error.light));
  });

  it('F-11 AC-035 lists a refusal before the blocker messages, one line each', () => {
    renderWithTheme(
      <MessageBand
        messages={[
          { kind: 'refused', text: 'the target "plan" is not a flow of this pipeline' },
          { kind: 'blocker', text: 'the pipeline has no flow.' },
        ]}
      />,
    );
    const lines = Array.from(screen.getByRole('status').children).map((line) => line.textContent);
    expect(lines).toEqual([
      'Refused · the target "plan" is not a flow of this pipeline',
      'Blocker · the pipeline has no flow.',
    ]);
  });
});

describe('F-11 AC-014 band with no message', () => {
  it('F-11 AC-014 draws nothing when there is no message', () => {
    const { container } = renderWithTheme(<MessageBand messages={[]} />);
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
