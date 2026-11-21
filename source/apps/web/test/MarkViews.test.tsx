// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { WarningNote, warningsAt } from '../src/builder/MarkViews.js';
import { structureMarks } from '../src/builder/marks.js';
import type { Finding, Placement, StructureMarks } from '../src/builder/marks.js';
import { theme } from '../src/theme.js';

// The views are rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

// The views read their colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// jsdom reports a computed colour as rgb(...), so a theme hex value is converted the same way.
function rgbOf(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

// A finding with a severity, a path and a message. The rule is not shown, so it is a fixed name.
function finding(severity: Finding['severity'], path: string, message: string): Finding {
  return { severity, rule: 'test-rule', path, message };
}

// Marks with the given findings, each placed where its placement says. No blocked flow is needed here.
function marksOf(...entries: ReadonlyArray<{ readonly finding: Finding; readonly placement: Placement }>): StructureMarks {
  return { findings: entries, blockedFlowIds: [] };
}

const onPlan: Placement = { kind: 'flow', flowId: 'plan' };
const onArrowFromPlan: Placement = { kind: 'arrow', source: 'plan' };
const onNothing: Placement = { kind: 'none' };

describe('F-11 AC-035 warning beside the item it names', () => {
  it('F-11 AC-035 returns the warnings placed on a flow box, in the analyzer order', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.name', 'first on plan'), placement: onPlan },
      { finding: finding('warning', 'pipeline.flows.1', 'on build'), placement: { kind: 'flow', flowId: 'build' } },
      { finding: finding('warning', 'pipeline.flows.0', 'second on plan'), placement: onPlan },
    );
    expect(warningsAt(marks, onPlan).map((item) => item.message)).toEqual(['first on plan', 'second on plan']);
  });

  it('F-11 AC-035 returns the warnings placed on the arrow that leaves a flow, and no others', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.next', 'arrow warning'), placement: onArrowFromPlan },
      { finding: finding('warning', 'pipeline.flows.0', 'box warning'), placement: onPlan },
    );
    expect(warningsAt(marks, onArrowFromPlan).map((item) => item.message)).toEqual(['arrow warning']);
    expect(warningsAt(marks, onPlan).map((item) => item.message)).toEqual(['box warning']);
  });

  it('F-11 AC-035 leaves a blocker out of the warnings beside an item, since it is drawn red and in the band', () => {
    const marks = marksOf(
      { finding: finding('blocker', 'pipeline.flows.0', 'a blocker on plan'), placement: onPlan },
      { finding: finding('warning', 'pipeline.flows.0', 'a warning on plan'), placement: onPlan },
    );
    expect(warningsAt(marks, onPlan).map((item) => item.message)).toEqual(['a warning on plan']);
  });

  it('F-11 AC-035 returns nothing for an item with no placed warning, nor for no item at all', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0', 'on plan'), placement: onPlan },
      { finding: finding('warning', 'pipeline.name', 'drawn on no item'), placement: onNothing },
    );
    expect(warningsAt(marks, { kind: 'flow', flowId: 'verify' })).toEqual([]);
    expect(warningsAt(marks, onNothing)).toEqual([]);
  });

  it('F-11 AC-035 draws the warning message after the Warning label in a note', () => {
    renderWithTheme(<WarningNote text="the flow is never reached." />);
    const note = screen.getByRole('note');
    expect(note.textContent).toBe('Warning · the flow is never reached.');
  });

  it('F-11 AC-035 draws the warning note in the warning colours from the theme', () => {
    renderWithTheme(<WarningNote text="the flow is never reached." />);
    const text = screen.getByText('Warning · the flow is never reached.');
    const style = getComputedStyle(text);
    expect(style.color).toBe(rgbOf(theme.palette.warning.dark));
    const box = screen.getByRole('note');
    expect(getComputedStyle(box).backgroundColor).toBe(rgbOf(theme.palette.warning.light));
  });
});

describe('F-11 AC-036 findings with no drawn item under the canvas', () => {
  it('F-11 AC-036 returns every finding placed on none, blockers and warnings both, in order', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.blocks.0.next', 'block warning'), placement: onNothing },
      { finding: finding('blocker', 'pipeline.name', 'a name is required'), placement: onNothing },
      { finding: finding('blocker', 'pipeline.flows.0', 'a flow blocker'), placement: onPlan },
    );
    const unplaced = marks.findings.filter((entry) => entry.placement.kind === 'none').map((entry) => entry.finding);
    expect(unplaced).toEqual([
      finding('warning', 'pipeline.flows.0.blocks.0.next', 'block warning'),
      finding('blocker', 'pipeline.name', 'a name is required'),
    ]);
  });

  it('F-11 AC-036 gives the real analyzer finding of a pipeline with no flow to the panel, with no drawn item', () => {
    const empty = { name: 'Demo', description: 'A demo pipeline.', arguments: [], flows: [] };
    const marks = structureMarks(empty, []);
    expect(marks.findings.length).toBeGreaterThan(0);
    expect(marks.findings.every((entry) => entry.finding.path !== '')).toBe(true);
    expect(marks.findings.every((entry) => entry.placement.kind === 'none')).toBe(true);
  });
});
