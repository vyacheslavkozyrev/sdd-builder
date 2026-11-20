import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App.js';

// Markup tests run in the Node environment; the application root is static markup here.

// Emotion writes a <style> tag before each styled element; they are not part of the layout.
function markup(): string {
  return renderToStaticMarkup(<App />).replace(/<style\b[\s\S]*?<\/style>/g, '');
}

describe('F-07 AC-008 application root shows the frame on the first screen', () => {
  it('F-07 AC-008 renders the left panel wordmark', () => {
    expect(markup()).toContain('SDDBuilder');
  });

  it('F-07 AC-008 renders the footer note', () => {
    expect(markup()).toContain('The work is not saved.');
  });

  it('F-07 AC-008 renders the Material UI frame as the outer element', () => {
    expect(markup()).toMatch(/^<div class="MuiBox-root[^"]*"/);
  });

  it('F-07 AC-008 renders the left panel and footer inside the frame', () => {
    const html = markup();
    expect(html.indexOf('SDDBuilder')).toBeGreaterThan(html.indexOf('<div class="MuiBox-root'));
    expect(html.indexOf('<footer')).toBeGreaterThan(html.indexOf('<div class="MuiBox-root'));
    expect(html.endsWith('</div>')).toBe(true);
    expect(html.indexOf('<footer')).toBeLessThan(html.lastIndexOf('</div>'));
  });

  it('F-07 AC-008 negative case: renders the empty centre area, with no wizard content', () => {
    expect(markup()).toMatch(/<main class="[^"]*"><\/main>/);
  });
});
