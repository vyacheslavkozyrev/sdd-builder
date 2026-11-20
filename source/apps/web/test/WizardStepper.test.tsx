import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTheme } from '@mui/material/styles';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme.js';
import { WizardStepper } from '../src/wizard/WizardStepper.js';
import { getWizardStepperStyles } from '../src/wizard/wizardStyles.js';
import type { StepNumber, StepState } from '../src/wizard/steps.js';

// Markup tests run in the Node environment (architecture.md §5). The stepper is checked as
// rendered HTML: the titles, the state of each step (the node carries data-state) and the
// Material UI class. The getter test proves the colours come from the theme it is given.

function markup(current: StepNumber): string {
  return renderToStaticMarkup(<WizardStepper current={current} />);
}

// The state of each step in order, read from the node markup.
function states(html: string): string[] {
  return [...html.matchAll(/data-state="([^"]+)"/g)].map((match) => match[1] ?? '');
}

const TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];

describe('F-08 AC-001 four steps with their titles, in order', () => {
  it('F-08 AC-001 renders the four titles in the order Project, Technical details, Workflow, Analyze and generate', () => {
    const html = markup(1);
    const positions = TITLES.map((title) => html.indexOf(`>${title}<`));
    positions.forEach((position) => expect(position).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('F-08 AC-001 renders exactly four steps', () => {
    expect(markup(2).match(/<li\b/g)).toHaveLength(4);
  });
});

describe('F-08 AC-002 state of each step follows the current step', () => {
  const table: ReadonlyArray<readonly [StepNumber, readonly StepState[]]> = [
    [1, ['current', 'to-do', 'to-do', 'to-do']],
    [2, ['done', 'current', 'to-do', 'to-do']],
    [3, ['done', 'done', 'current', 'to-do']],
    [4, ['done', 'done', 'done', 'current']],
  ];

  it.each(table)('F-08 AC-002 on step %i the states are %j', (current, expected) => {
    expect(states(markup(current))).toEqual(expected);
  });

  it('F-08 AC-002 negative case: no step is done or to do when the current step is 1', () => {
    expect(states(markup(1))).not.toContain('done');
  });
});

describe('F-08 AC-003 the stepper is not clickable', () => {
  it('F-08 AC-003 renders no button element', () => {
    expect(markup(2)).not.toMatch(/<button\b/);
  });

  it('F-08 AC-003 renders no link element', () => {
    expect(markup(2)).not.toMatch(/<a\b/);
  });

  it('F-08 AC-003 negative case: renders no button role and no tab stop', () => {
    const html = markup(2);
    expect(html).not.toMatch(/role="button"/);
    expect(html).not.toMatch(/tabindex=/);
  });

  it('F-08 AC-003 negative case: the source uses no StepButton and no click handler', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/wizard/WizardStepper.tsx'), 'utf8');
    expect(source).not.toMatch(/StepButton/);
    expect(source).not.toMatch(/onClick/);
  });
});

describe('F-08 AC-014 stepper is a Material UI stepper', () => {
  it('F-08 AC-014 renders the class MuiStepper-root', () => {
    expect(markup(1)).toMatch(/<ol class="[^"]*MuiStepper-root[^"]*"/);
  });

  it('F-08 AC-014 renders the vertical orientation', () => {
    expect(markup(1)).toMatch(/MuiStepper-vertical/);
  });
});

describe('F-08 AC-014 style getter reads its colours from the theme it is given', () => {
  const other = createTheme({
    palette: {
      primary: { main: '#102030' },
      success: { main: '#000011', dark: '#000012' },
      text: { primary: '#000013', secondary: '#000014' },
      divider: '#000015',
      grey: { 300: '#000016' },
      background: { paper: '#000017' },
    },
  });

  it('F-08 AC-014 the done node and label use the theme success colours', () => {
    const styles = getWizardStepperStyles(other);
    expect(styles.node.done).toMatchObject({ bgcolor: '#000011' });
    expect(styles.label.done).toMatchObject({ color: '#000012' });
  });

  it('F-08 AC-014 the current ring is a tint of the theme primary colour, with a gap in the paper colour', () => {
    expect(getWizardStepperStyles(other).node.current).toMatchObject({
      bgcolor: '#102030',
      boxShadow: '0 0 0 4px #000017, 0 0 0 8px rgba(16, 32, 48, 0.2)',
    });
  });

  it('F-08 AC-002 the line above a current or done step is green, the line above a to-do step is grey', () => {
    const connector = getWizardStepperStyles(other).connector as Record<string, Record<string, unknown>>;
    expect(connector['&.Mui-active .MuiStepConnector-line, &.Mui-completed .MuiStepConnector-line']).toMatchObject({
      borderColor: '#000011',
    });
    expect(connector['& .MuiStepConnector-line']).toMatchObject({ borderColor: '#000016' });
  });

  it('F-08 AC-002 each step node names its step and state for screen readers and hover (U-03)', () => {
    const html = markup(2);
    expect(html).toContain('aria-label="Project: done"');
    expect(html).toContain('aria-label="Technical details: current step"');
    expect(html).toContain('aria-label="Workflow: to do"');
    expect(html).toContain('title="Analyze and generate: to do"');
  });

  it('F-08 AC-014 the to-do node and label use the theme outline and secondary text colours', () => {
    const styles = getWizardStepperStyles(other);
    expect(styles.node['to-do']).toMatchObject({ border: '1.5px solid #000016', color: '#000014' });
    expect(styles.label['to-do']).toMatchObject({ color: '#000014' });
  });

  it('F-08 AC-014 the app theme gives the approved values for the done node and label', () => {
    const styles = getWizardStepperStyles(theme);
    expect(styles.node.done).toMatchObject({ bgcolor: '#15B79F' });
    expect(styles.label.done).toMatchObject({ color: '#107569', fontSize: 12 });
  });

  it('F-08 AC-014 the current label is 13 px and the other labels 12 px, as on screen 01', () => {
    const styles = getWizardStepperStyles(theme);
    expect(styles.label.current).toMatchObject({ fontSize: 13, color: '#635BFF' });
    expect(styles.label['to-do']).toMatchObject({ fontSize: 12 });
  });
});
