import { createTheme } from '@mui/material/styles';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme.js';
import type { StepNumber } from '../src/wizard/steps.js';
import { WizardNav } from '../src/wizard/WizardNav.js';
import { getWizardNavStyles } from '../src/wizard/wizardStyles.js';

// Markup tests run in the Node environment (architecture.md §5). The click tests are in
// WizardNav.click.test.tsx, because a DOM environment is enabled per file. The buttons are
// checked as rendered HTML: the word, the Material UI class and the disabled attribute.
const noop = (): void => undefined;

function markup(step: StepNumber): string {
  return renderToStaticMarkup(<WizardNav step={step} onPrev={noop} onNext={noop} />);
}

// The whole <button> element that carries the given word.
function button(html: string, word: string): string {
  const match = html.match(new RegExp(`<button\\b[^>]*>${word}</button>`));
  return match?.[0] ?? '';
}

const STEPS: readonly StepNumber[] = [1, 2, 3, 4];

describe('F-08 AC-005 Prev is disabled on step 1 and enabled on steps 2 to 4', () => {
  const table: ReadonlyArray<readonly [StepNumber, boolean]> = [
    [1, true],
    [2, false],
    [3, false],
    [4, false],
  ];

  it.each(table)('F-08 AC-005 on step %i Prev has the disabled attribute: %s', (step, disabled) => {
    expect(/\sdisabled=""/.test(button(markup(step), 'Prev'))).toBe(disabled);
  });

  it('F-08 AC-005 negative case: Prev on step 1 is not enabled', () => {
    expect(button(markup(1), 'Prev')).not.toBe('');
    expect(button(markup(1), 'Prev')).toMatch(/\sdisabled=""/);
  });
});

describe('F-08 AC-007 Next is shown on every step and disabled on step 4', () => {
  const table: ReadonlyArray<readonly [StepNumber, boolean]> = [
    [1, false],
    [2, false],
    [3, false],
    [4, true],
  ];

  it.each(table)('F-08 AC-007 on step %i Next has the disabled attribute: %s', (step, disabled) => {
    const html = markup(step);
    expect(button(html, 'Next')).not.toBe('');
    expect(/\sdisabled=""/.test(button(html, 'Next'))).toBe(disabled);
  });

  it.each(STEPS)('F-08 AC-007 Next keeps its place on step %i: it is the second button, after Prev', (step) => {
    const html = markup(step);
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html.indexOf('>Prev</button>')).toBeLessThan(html.indexOf('>Next</button>'));
  });

  it('F-08 AC-007 negative case: step 4 does not render Next as enabled', () => {
    expect(button(markup(4), 'Next')).not.toMatch(/^<button\b(?![^>]*\sdisabled="")/);
  });
});

describe('F-08 AC-014 Prev and Next are Material UI buttons with their words', () => {
  it.each(STEPS)('F-08 AC-014 on step %i both buttons carry the class MuiButton-root', (step) => {
    const html = markup(step);
    expect(button(html, 'Prev')).toMatch(/<button class="[^"]*MuiButton-root[^"]*"/);
    expect(button(html, 'Next')).toMatch(/<button class="[^"]*MuiButton-root[^"]*"/);
  });

  it('F-08 AC-014 renders the outlined Prev and the contained primary Next', () => {
    const html = markup(2);
    expect(button(html, 'Prev')).toMatch(/MuiButton-outlined/);
    expect(button(html, 'Next')).toMatch(/MuiButton-contained/);
  });

  it('F-08 AC-014 renders the words Prev and Next and no other text', () => {
    const html = markup(2);
    expect(html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '')).toBe('PrevNext');
  });
});

describe('F-08 AC-014 button size and shape come from the wizard nav getter', () => {
  it('F-08 AC-014 Prev and Next are 100 by 40 px with an 8 px radius', () => {
    const styles = getWizardNavStyles(theme);
    expect(styles.prev).toMatchObject({ width: 100, height: 40, borderRadius: '8px' });
    expect(styles.next).toMatchObject({ width: 100, height: 40, borderRadius: '8px' });
  });

  it('F-08 AC-014 the buttons sit side by side in one row', () => {
    expect(getWizardNavStyles(theme).row).toMatchObject({ display: 'flex', gap: '12px' });
  });

  it('F-08 AC-014 the outlined Prev takes its white fill and grey outline from the theme', () => {
    const other = createTheme({
      palette: {
        primary: { main: '#102030' },
        background: { paper: '#000017', default: '#000018' },
        divider: '#000015',
        grey: { 300: '#000016' },
        text: { primary: '#000013', disabled: '#000019' },
      },
    });
    expect(getWizardNavStyles(other).prev).toMatchObject({
      bgcolor: '#000017',
      borderColor: '#000016',
      color: '#000013',
    });
  });

  it('F-08 AC-005 AC-007 a disabled Prev and Next take the grey fill, outline and text from the theme', () => {
    const other = createTheme({
      palette: {
        background: { paper: '#000017', default: '#000018' },
        divider: '#000015',
        text: { primary: '#000013', disabled: '#000019' },
      },
    });
    const disabledGrey = {
      bgcolor: '#000018',
      borderColor: '#000015',
      color: '#000019',
      boxShadow: 'none',
    };
    expect(getWizardNavStyles(other).prev).toMatchObject({ '&.Mui-disabled': disabledGrey });
    expect(getWizardNavStyles(other).next).toMatchObject({
      '&.Mui-disabled': { ...disabledGrey, border: '1px solid' },
    });
  });

  it('F-08 AC-005 AC-007 the app theme gives disabled text the screen grey #9FA6AD (screens 01 and 04)', () => {
    expect(theme.palette.text.disabled).toBe('#9FA6AD');
  });
});
