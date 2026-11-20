import { renderToStaticMarkup } from 'react-dom/server';
import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { LeftPanel } from '../src/layout/LeftPanel.js';
import { getLeftPanelStyles } from '../src/layout/layoutStyles.js';

// Markup tests run in the Node environment. The click test is in LeftPanel.click.test.tsx,
// because a DOM environment is enabled per file (architecture.md §5).
const noop = (): void => undefined;

function markup(): string {
  return renderToStaticMarkup(<LeftPanel onNewProject={noop} />);
}

describe('F-07 AC-001 left panel wordmark and New project', () => {
  it('F-07 AC-001 renders the text SDDBuilder', () => {
    expect(markup()).toContain('SDDBuilder');
  });

  it('F-07 AC-001 renders the button New project', () => {
    expect(markup()).toMatch(/<button\b[^>]*>New project<\/button>/);
  });

  it('F-07 AC-001 renders the logo mark before the wordmark, in the same row', () => {
    const html = markup();
    const logo = html.indexOf('aria-label="SDDBuilder logo"');
    const wordmark = html.indexOf('SDDBuilder</p>');
    expect(logo).toBeGreaterThan(-1);
    expect(wordmark).toBeGreaterThan(logo);
  });

  it('F-07 AC-001 renders the wordmark above the New project button', () => {
    const html = markup();
    const wordmark = html.indexOf('SDDBuilder');
    const button = html.indexOf('New project');
    expect(wordmark).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(wordmark);
  });
});

describe('F-07 AC-003 no other control in the left panel', () => {
  it('F-07 AC-003 renders exactly one button, New project', () => {
    expect(markup().match(/<button\b/g)).toHaveLength(1);
  });

  it('F-07 AC-003 negative case: renders no Demo, Prev or Next control', () => {
    const html = markup();
    expect(html).not.toMatch(/Demo/);
    expect(html).not.toMatch(/Prev/);
    expect(html).not.toMatch(/Next/);
  });

  it('F-07 AC-003 negative case: renders no link, input or select', () => {
    const html = markup();
    expect(html).not.toMatch(/<a\b/);
    expect(html).not.toMatch(/<input\b/);
    expect(html).not.toMatch(/<select\b/);
  });
});

describe('F-07 AC-013 Material UI elements', () => {
  it('F-07 AC-013 renders the panel as a Material UI element', () => {
    expect(markup()).toMatch(/<div class="MuiPaper-root[ "]/);
  });

  it('F-07 AC-013 renders the New project control as a Material UI button', () => {
    expect(markup()).toMatch(/<button class="[^"]*MuiButton-root[^"]*"[^>]*>New project<\/button>/);
  });
});

function slotted(): string {
  return renderToStaticMarkup(
    <LeftPanel onNewProject={noop} stepper={<span>STEPPER</span>} navigation={<span>NAVIGATION</span>} />,
  );
}

describe('F-08 AC-004 left panel order with the stepper and the navigation slots', () => {
  it('F-08 AC-004 renders the logo, wordmark, New project, stepper, then navigation', () => {
    const html = slotted();
    const order = ['aria-label="SDDBuilder logo"', 'SDDBuilder</p>', 'New project', 'STEPPER', 'NAVIGATION'].map(
      (part) => html.indexOf(part),
    );
    for (const index of order) {
      expect(index).toBeGreaterThan(-1);
    }
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('F-08 AC-004 places the navigation last in the panel markup', () => {
    const html = slotted();
    expect(html.slice(html.indexOf('NAVIGATION'))).toMatch(/^NAVIGATION(<\/[a-z]+>)+$/);
  });

  it('F-08 AC-004 places the stepper below New project and above the navigation', () => {
    const html = slotted();
    expect(html.indexOf('New project')).toBeLessThan(html.indexOf('STEPPER'));
    expect(html.indexOf('STEPPER')).toBeLessThan(html.indexOf('NAVIGATION'));
  });
});

describe('F-08 AC-004 no slots renders exactly the F-07 panel', () => {
  it('F-08 AC-004 renders no element beyond the F-07 panel with no slots', () => {
    const panel = markup().replace(/<style\b[\s\S]*?<\/style>/g, '');
    const tags = panel.match(/<[a-z]+\b/g);
    expect(tags).toEqual(['<div', '<div', '<div', '<p', '<button']);
  });

  it('F-08 AC-004 renders no stepper or navigation text when the slots are absent', () => {
    const html = markup();
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html.endsWith('New project</button></div>')).toBe(true);
  });
});

describe('F-08 AC-004 left panel style getters', () => {
  const other = createTheme({
    palette: {
      background: { paper: '#000002' },
      divider: '#000005',
    },
  });

  it('F-08 AC-004 takes the panel colours from the theme given, as before the slots', () => {
    const styles = getLeftPanelStyles(other);
    expect(styles.root).toMatchObject({ borderRight: '1px solid #000005', bgcolor: '#000002' });
  });

  it('F-08 AC-004 pins the foot to the bottom: the panel is a column and the foot takes the auto top margin', () => {
    const styles = getLeftPanelStyles(other);
    expect(styles.root).toMatchObject({ display: 'flex', flexDirection: 'column' });
    expect(styles.foot).toMatchObject({ mt: 'auto' });
  });

  it('F-08 AC-004 the stepper and foot styles carry no colour, so no colour literal is written', () => {
    const styles = getLeftPanelStyles(other);
    expect(styles.stepper).not.toHaveProperty('color');
    expect(styles.stepper).not.toHaveProperty('bgcolor');
    expect(styles.foot).not.toHaveProperty('color');
    expect(styles.foot).not.toHaveProperty('bgcolor');
  });
});
