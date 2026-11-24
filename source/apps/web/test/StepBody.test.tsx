import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StepBody } from '../src/wizard/StepBody.js';
import type { RuleActions } from '../src/wizard/RuleList.js';
import type { StepNumber } from '../src/wizard/steps.js';
import type { WizardValues } from '../src/wizard/state.js';

import { valuesWith } from './wizardValues.js';

// Markup tests run in the Node environment (architecture.md §5). The body takes the step, the
// values, the update handler and the rule actions; the project and technical steps read the values.
const EMPTY_VALUES: WizardValues = valuesWith('', '');
const NO_RULE_ACTIONS: RuleActions = { onAdd: () => {}, onRemove: () => {}, onUpdate: () => {} };
const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

function markup(step: StepNumber, values: WizardValues = EMPTY_VALUES): string {
  return renderToStaticMarkup(
    <StepBody
      step={step}
      values={values}
      onChange={() => {}}
      ruleActions={NO_RULE_ACTIONS}
      onPipelineChange={() => {}}
    />,
  );
}

describe('F-09 AC-012 step body shows the project step on step 1', () => {
  it('F-09 AC-012 renders the project name field and the idea field on step 1', () => {
    const html = markup(1);
    expect(html).toContain('id="project-name"');
    expect(html).toContain('id="project-idea"');
    expect(html).toContain('0 / 5,000');
  });

  it('F-09 AC-012 renders no F-08 placeholder line on step 1', () => {
    expect(markup(1)).not.toContain(PLACEHOLDER_LINE);
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
    { step: 3 as const, present: 'aria-label="Pipeline tabs"', absent: 'id="technical-language"' },
    { step: 4 as const, present: 'Privacy notice', absent: 'id="technical-language"' },
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

describe('F-13 AC-001 step body shows the analyze and generate step on step 4', () => {
  it('F-13 AC-001 renders the privacy notice and its checkbox on step 4', () => {
    const html = markup(4);
    expect(html).toContain('Privacy notice');
    expect(html).toContain('I have read the notice. Send the brief for review.');
  });

  it('F-13 AC-001 renders the Analyze heading and the disabled Analyze reason on step 4', () => {
    const html = markup(4);
    expect(html).toContain('>Analyze<');
    expect(html).toContain('Tick the box to analyse');
  });

  it('F-13 AC-001 renders the project preview with its Generate control on step 4', () => {
    expect(markup(4)).toContain('Project preview');
  });

  it('F-13 AC-001 renders no F-08 placeholder line on step 4', () => {
    expect(markup(4)).not.toContain(PLACEHOLDER_LINE);
  });

  it('F-13 AC-001 negative case: renders no project name or idea field on step 4', () => {
    const html = markup(4);
    expect(html).not.toContain('id="project-name"');
    expect(html).not.toContain('id="project-idea"');
  });

  it('F-13 AC-001 negative case: renders no text input, textarea or select on step 4 (only the privacy checkbox)', () => {
    const html = markup(4);
    const inputs = html.match(/<input\b[^>]*>/g) ?? [];
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => expect(input).toMatch(/type="checkbox"/));
    expect(html).not.toMatch(/<textarea\b/);
    expect(html).not.toMatch(/<select\b/);
  });

  it.each(['Project', 'Technical details', 'Workflow', 'Analyze and generate'])(
    'F-13 AC-001 negative case: renders no step title element "%s" on step 4',
    (title) => {
      expect(markup(4)).not.toContain(`>${title}<`);
    },
  );

  it('F-13 AC-001 negative case: renders no step counter such as "1 of 4" on step 4', () => {
    const html = markup(4);
    expect(html).not.toMatch(/\b[1-4] of 4\b/);
    expect(html).not.toMatch(/\bStep\s+[1-4]\b/i);
  });

  it('F-13 AC-001 negative case: renders no pipeline tabs on step 4', () => {
    expect(markup(4)).not.toContain('aria-label="Pipeline tabs"');
  });
});
