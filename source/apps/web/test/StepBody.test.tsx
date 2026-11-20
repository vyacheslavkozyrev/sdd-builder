import { renderToStaticMarkup } from 'react-dom/server';
import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme.js';
import { StepBody } from '../src/wizard/StepBody.js';
import { getStepBodyStyles } from '../src/wizard/wizardStyles.js';

// Markup tests run in the Node environment (architecture.md §5). The body takes no props and
// no state, so the same markup is rendered for every step.
function markup(): string {
  return renderToStaticMarkup(<StepBody />);
}

const STEP_TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];

describe('F-08 AC-013 step body shows the placeholder line', () => {
  it('F-08 AC-013 renders the exact placeholder line', () => {
    expect(markup()).toContain('The content of this step is added in a later feature.');
  });

  it('F-08 AC-013 renders the sparkle mark as an inline SVG', () => {
    expect(markup()).toMatch(/<svg\b[^>]*>[\s\S]*<path\b/);
  });

  it('F-08 AC-013 draws the approved sparkle geometry in a 52 px box (screen 01)', () => {
    const html = markup();
    expect(html).toContain('viewBox="744 314 52 52"');
    expect(html).toContain('d="M770 314 L776 334 L796 340 L776 346 L770 366 L764 346 L744 340 L764 334 Z"');
  });
});

describe('F-08 AC-013 negative case: no title, no step counter and no input in the body', () => {
  it.each(STEP_TITLES)('F-08 AC-013 negative case: renders no step title "%s"', (title) => {
    expect(markup()).not.toContain(title);
  });

  it('F-08 AC-013 negative case: renders no step counter such as "1 of 4"', () => {
    const html = markup();
    expect(html).not.toMatch(/\b[1-4] of 4\b/);
    expect(html).not.toMatch(/\bStep\s+[1-4]\b/i);
  });

  it('F-08 AC-013 negative case: renders no input, textarea or select', () => {
    const html = markup();
    expect(html).not.toMatch(/<input\b/);
    expect(html).not.toMatch(/<textarea\b/);
    expect(html).not.toMatch(/<select\b/);
  });
});

describe('F-08 AC-013 sparkle is decorative and hidden from assistive technology', () => {
  it('F-08 AC-013 marks the sparkle SVG aria-hidden with no role or label', () => {
    const svg = markup().match(/<svg\b[^>]*>/)?.[0] ?? '';
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
