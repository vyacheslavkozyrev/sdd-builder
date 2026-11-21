// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ErrorPanel } from '../src/builder/ErrorPanel.js';
import type { Finding, PlacedFinding, Placement } from '../src/builder/marks.js';
import { theme } from '../src/theme.js';

// The panel is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

// The panel reads its colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// jsdom reports a computed colour as rgb(...), so a theme hex value is converted the same way.
function rgbOf(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

function finding(severity: Finding['severity'], path: string, message: string): Finding {
  return { severity, rule: 'test-rule', path, message };
}

function entry(item: Finding, placement: Placement): PlacedFinding {
  return { finding: item, placement };
}

const onNothing: Placement = { kind: 'none' };
const onFlow: Placement = { kind: 'flow', flowId: 'plan' };

// Three blockers and two warnings: two of the blockers are drawn on a box, one is not drawn.
const threeErrorsTwoWarnings: PlacedFinding[] = [
  entry(finding('blocker', 'pipeline.flows.1', 'flow-2 is not connected.'), onFlow),
  entry(finding('blocker', 'pipeline.flows.0.blocks.1.next', 'must point at a block of this flow'), onNothing),
  entry(finding('blocker', 'pipeline.name', 'a name is required'), onNothing),
  entry(finding('warning', 'pipeline.flows.1.body', 'is blank; the generated project will not use it'), onFlow),
  entry(finding('warning', 'pipeline.description', 'is short'), onNothing),
];

// The counter button is the one named by its counter text.
function counterButton(): HTMLElement {
  return screen.getByRole('button', { name: '3 errors · 2 warnings' });
}

describe('F-11 AC-035 the counter of the error panel', () => {
  it('F-11 AC-035 shows the total of the blockers and of the warnings in one counter', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    expect(counterButton().textContent).toBe('3 errors · 2 warnings');
  });

  it('F-11 AC-035 uses the singular for one error and one warning', () => {
    renderWithTheme(
      <ErrorPanel
        findings={[
          entry(finding('blocker', 'pipeline.name', 'a name is required'), onNothing),
          entry(finding('warning', 'pipeline.description', 'is short'), onNothing),
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: '1 error · 1 warning' })).toBeTruthy();
  });

  it('F-11 AC-035 shows only the kind that is present when there are no blockers', () => {
    renderWithTheme(<ErrorPanel findings={[entry(finding('warning', 'pipeline.description', 'is short'), onNothing)]} />);
    expect(screen.getByRole('button', { name: '1 warning' })).toBeTruthy();
  });

  it('F-11 AC-035 draws the counter in the blocker colours from the theme', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    const style = getComputedStyle(counterButton());
    expect(style.color).toBe(rgbOf(theme.palette.error.main));
    expect(style.backgroundColor).toBe(rgbOf(theme.palette.error.light));
  });

  it('F-11 AC-035 negative case: no finding draws no panel at all', () => {
    const { container } = renderWithTheme(<ErrorPanel findings={[]} />);
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('F-11 AC-035 the panel is closed by default and does not cover the canvas', () => {
  it('F-11 AC-035 starts closed: the counter is collapsed and no list is drawn', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    expect(counterButton().getAttribute('aria-expanded')).toBe('false');
    expect(counterButton().getAttribute('aria-controls')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Errors and warnings' })).toBeNull();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('F-11 AC-035 the closed panel takes its place in the flow, not over the canvas', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    expect(getComputedStyle(counterButton().parentElement as HTMLElement).position).toBe('relative');
    expect(getComputedStyle(counterButton()).position).not.toBe('absolute');
  });
});

describe('F-11 AC-036 a click opens every item with its kind, its path and its message', () => {
  it('F-11 AC-036 a click opens the list and shows each finding with its kind, path and message', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    fireEvent.click(counterButton());
    expect(counterButton().getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('region', { name: 'Errors and warnings' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    // The findings drawn on an item come first, in the analyzer's order; the unplaced ones follow in their section.
    expect(items.map((item) => item.textContent)).toEqual([
      'Blockerpipeline.flows.1flow-2 is not connected.',
      'Warningpipeline.flows.1.bodyis blank; the generated project will not use it',
      'Blockerpipeline.flows.0.blocks.1.nextmust point at a block of this flow',
      'Blockerpipeline.namea name is required',
      'Warningpipeline.descriptionis short',
    ]);
  });

  it('F-11 AC-036 the list items keep the analyzer message unchanged', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    fireEvent.click(counterButton());
    const list = screen.getByRole('region', { name: 'Errors and warnings' });
    expect(within(list).getByText('must point at a block of this flow')).toBeTruthy();
    expect(within(list).getByText('is short')).toBeTruthy();
  });

  it('F-11 AC-036 a second click closes the list again', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    fireEvent.click(counterButton());
    fireEvent.click(counterButton());
    expect(counterButton().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Errors and warnings' })).toBeNull();
  });

  it('F-11 AC-036 lists the findings with no drawn item in the section "Not on a drawn item", inside the panel', () => {
    renderWithTheme(<ErrorPanel findings={threeErrorsTwoWarnings} />);
    fireEvent.click(counterButton());
    const list = screen.getByRole('region', { name: 'Errors and warnings' });
    const section = within(list).getByRole('region', { name: 'Not on a drawn item' });
    expect(within(section).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Blockerpipeline.flows.0.blocks.1.nextmust point at a block of this flow',
      'Blockerpipeline.namea name is required',
      'Warningpipeline.descriptionis short',
    ]);
  });

  it('F-11 AC-036 draws no "Not on a drawn item" section when every finding is drawn on an item', () => {
    renderWithTheme(
      <ErrorPanel findings={[entry(finding('blocker', 'pipeline.flows.1', 'flow-2 is not connected.'), onFlow)]} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '1 error' }));
    expect(screen.queryByRole('region', { name: 'Not on a drawn item' })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('F-11 AC-036 draws the kind of each item in the blocker colour from the theme', () => {
    renderWithTheme(<ErrorPanel findings={[entry(finding('blocker', 'pipeline.name', 'a name is required'), onNothing)]} />);
    fireEvent.click(screen.getByRole('button', { name: '1 error' }));
    const kind = screen.getByText('Blocker');
    expect(getComputedStyle(kind).color).toBe(rgbOf(theme.palette.error.main));
  });
});
