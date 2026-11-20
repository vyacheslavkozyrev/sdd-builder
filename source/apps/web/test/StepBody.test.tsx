import { renderToStaticMarkup } from 'react-dom/server';
import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme.js';
import { StepBody } from '../src/wizard/StepBody.js';
import type { RuleActions } from '../src/wizard/RuleList.js';
import type { StepNumber } from '../src/wizard/steps.js';
import type { WizardValues } from '../src/wizard/state.js';
import { getStepBodyStyles } from '../src/wizard/wizardStyles.js';

import { valuesWith } from './wizardValues.js';

// Markup tests run in the Node environment (architecture.md §5). The body takes the step, the
// values, the update handler and the rule actions; the placeholder steps ignore the values.
const EMPTY_VALUES: WizardValues = valuesWith('', '');
const NO_RULE_ACTIONS: RuleActions = { onAdd: () => {}, onRemove: () => {}, onUpdate: () => {} };
const PLACEHOLDER_STEPS: readonly StepNumber[] = [3, 4];
const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

function markup(step: StepNumber, values: WizardValues = EMPTY_VALUES): string {
  return renderToStaticMarkup(
    <StepBody step={step} values={values} onChange={() => {}} ruleActions={NO_RULE_ACTIONS} />,
  );
}

const STEP_TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];

describe('F-09 AC-012 step body shows the project step on step 1', () => {
  it('F-09 AC-012 renders the project name field and the idea field on step 1', () => {
    const html = markup(1);
    expect(html).toContain('id="project-name"');
    expect(html).toContain('id="project-idea"');
    expect(html).toContain('0 / 5,000');
  });

  it('F-09 AC-012 renders no F-08 placeholder line on step 1', () => {
    expect(markup(1)).not.toContain('The content of this step is added in a later feature.');
  });

  it.each(PLACEHOLDER_STEPS)('F-09 AC-012 renders the placeholder line on step %i and no project field', (step) => {
    const html = markup(step);
    expect(html).toContain('The content of this step is added in a later feature.');
    expect(html).not.toContain('id="project-name"');
    expect(html).not.toContain('id="project-idea"');
  });

  it('F-09 AC-012 passes the values to the project step on step 1', () => {
    const html = markup(1, valuesWith('Tracker', ''));
    expect(html).toContain('value="Tracker"');
  });
});

describe('F-10 AC-021 step body shows the technical details step on step 2', () => {
  // The four steps, each with the element that must be there and the one that must not (table-driven).
  it.each([
    { step: 1 as const, present: 'id="project-name"', absent: 'id="technical-language"' },
    { step: 2 as const, present: 'id="technical-language"', absent: 'id="project-name"' },
    { step: 3 as const, present: PLACEHOLDER_LINE, absent: 'id="technical-language"' },
    { step: 4 as const, present: PLACEHOLDER_LINE, absent: 'id="technical-language"' },
  ])('F-10 AC-021 step $step renders $present and not $absent', ({ step, present, absent }) => {
    const html = markup(step);
    expect(html).toContain(present);
    expect(html).not.toContain(absent);
  });

  it('F-10 AC-021 renders the five stack fields and the architecture field on step 2', () => {
    const html = markup(2);
    for (const label of ['Language', 'Framework', 'Platform', 'Build tool', 'Test framework']) {
      expect(html).toContain(`>${label}`);
    }
    expect(html).toContain('id="technical-architecture"');
  });

  it('F-10 AC-021 renders the rule list with its Add rule block control on step 2', () => {
    const html = markup(2);
    expect(html).toContain('aria-label="Add rule block"');
    expect(html).toContain('No rule blocks yet.');
  });

  it('F-10 AC-021 renders no F-08 placeholder line on step 2', () => {
    expect(markup(2)).not.toContain(PLACEHOLDER_LINE);
  });

  it('F-10 AC-021 negative case: renders no project name or idea field on step 2', () => {
    const html = markup(2);
    expect(html).not.toContain('id="project-name"');
    expect(html).not.toContain('id="project-idea"');
  });

  it('F-10 AC-021 passes the stack, the architecture and the rule blocks to the step', () => {
    const values: WizardValues = {
      ...EMPTY_VALUES,
      stack: { language: 'TypeScript', framework: '', platform: '', buildTool: '', testFramework: '' },
      architecture: 'Layered',
      rules: [{ name: 'Code Style', description: 'Use named exports.' }],
    };
    const html = markup(2, values);
    expect(html).toContain('value="TypeScript"');
    expect(html).toContain('Layered');
    expect(html).toContain('value="Code Style"');
  });

  it('F-10 AC-025 shows the stack heading before the rule list heading, in one body (screen 01)', () => {
    const html = markup(2);
    const stack = html.indexOf('>Stack<');
    const rules = html.indexOf('>Rule blocks<');
    expect(stack).toBeGreaterThan(-1);
    expect(rules).toBeGreaterThan(stack);
  });
});

describe('F-08 AC-013 step body shows the placeholder line on steps 3 and 4', () => {
  it('F-08 AC-013 renders the exact placeholder line', () => {
    expect(markup(3)).toContain('The content of this step is added in a later feature.');
  });

  it('F-08 AC-013 renders the sparkle mark as an inline SVG', () => {
    expect(markup(3)).toMatch(/<svg\b[^>]*>[\s\S]*<path\b/);
  });

  it('F-08 AC-013 draws the approved sparkle geometry in a 52 px box (screen 01)', () => {
    const html = markup(3);
    expect(html).toContain('viewBox="744 314 52 52"');
    expect(html).toContain('d="M770 314 L776 334 L796 340 L776 346 L770 366 L764 346 L744 340 L764 334 Z"');
  });
});

describe('F-08 AC-013 negative case: no title, no step counter and no input in the body', () => {
  it.each(STEP_TITLES)('F-08 AC-013 negative case: renders no step title "%s"', (title) => {
    expect(markup(3)).not.toContain(title);
  });

  it('F-08 AC-013 negative case: renders no step counter such as "1 of 4"', () => {
    const html = markup(3);
    expect(html).not.toMatch(/\b[1-4] of 4\b/);
    expect(html).not.toMatch(/\bStep\s+[1-4]\b/i);
  });

  it('F-08 AC-013 negative case: renders no input, textarea or select', () => {
    const html = markup(3);
    expect(html).not.toMatch(/<input\b/);
    expect(html).not.toMatch(/<textarea\b/);
    expect(html).not.toMatch(/<select\b/);
  });
});

describe('F-08 AC-013 sparkle is decorative and hidden from assistive technology', () => {
  it('F-08 AC-013 marks the sparkle SVG aria-hidden with no role or label', () => {
    const svg = markup(3).match(/<svg\b[^>]*>/)?.[0] ?? '';
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/role="img"/);
    expect(svg).not.toMatch(/aria-label=/);
  });
});

describe('F-08 AC-015 body style fills the card and centres its content', () => {
  it('F-08 AC-015 the body root fills the height of the card', () => {
    expect(getStepBodyStyles(theme).root).toMatchObject({ height: '100%', width: '100%' });
  });

  it('F-08 AC-015 the body root centres its content both ways', () => {
    expect(getStepBodyStyles(theme).root).toMatchObject({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('F-08 AC-015 the circle is 88 px across and the line sits 11 px below it (screen 01)', () => {
    const styles = getStepBodyStyles(theme);
    expect(styles.circle).toMatchObject({ width: 88, height: 88 });
    expect(styles.line).toMatchObject({ mt: '11px' });
  });
});

describe('F-08 AC-013 body styles read colours from the theme they are given', () => {
  const other = createTheme({
    palette: {
      primary: { main: '#000011' },
      background: { default: '#000012' },
      text: { primary: '#000013' },
      divider: '#000014',
    },
  });

  it('the body uses the theme primary, page, divider and primary text colours', () => {
    const styles = getStepBodyStyles(other);
    expect(styles.sparkle).toMatchObject({ color: '#000011' });
    expect(styles.circle).toMatchObject({ bgcolor: '#000012', border: '1px solid #000014' });
    expect(styles.line).toMatchObject({ color: '#000013' });
  });

  it('the app theme gives the approved Material Kit values for the body (screen 01)', () => {
    const styles = getStepBodyStyles(theme);
    expect(styles.sparkle).toMatchObject({ color: '#635BFF' });
    expect(styles.circle).toMatchObject({ bgcolor: '#F0F4F8', border: '1px solid #DDE7EE' });
    expect(styles.line).toMatchObject({ color: '#32383E', fontWeight: 500 });
  });
});
