import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LeftPanel } from '../src/layout/LeftPanel.js';

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
