import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Footer } from '../src/layout/Footer.js';

// Markup tests run in the Node environment; no DOM is needed for a static footer.

function markup(): string {
  return renderToStaticMarkup(<Footer />);
}

describe('F-07 AC-004 footer not-saved note', () => {
  it('F-07 AC-004 states that the work is not saved', () => {
    expect(markup()).toContain('The work is not saved.');
  });

  it('F-07 AC-004 states that the work is lost when the browser is refreshed', () => {
    expect(markup()).toContain('It is lost when the browser is refreshed.');
  });
});

describe('F-07 AC-005 footer holds no button or link', () => {
  it('F-07 AC-005 renders no button', () => {
    expect(markup()).not.toMatch(/<button\b/);
  });

  it('F-07 AC-005 negative case: renders no link', () => {
    expect(markup()).not.toMatch(/<a\b/);
  });

  it('F-07 AC-005 negative case: renders no save, download or persistence control', () => {
    const html = markup();
    expect(html).not.toMatch(/<input\b/);
    expect(html).not.toMatch(/<select\b/);
    expect(html).not.toMatch(/\b(save|download|export)\b/i);
  });
});

describe('F-07 AC-014 footer is a Material UI element', () => {
  it('F-07 AC-014 renders the footer with a Material UI class', () => {
    expect(markup()).toMatch(/<footer class="[^"]*\bMui[A-Za-z]+-root\b[^"]*"/);
  });

  it('F-07 AC-014 renders the note with a Material UI typography class', () => {
    expect(markup()).toMatch(/<p class="[^"]*MuiTypography-root[^"]*"/);
  });
});
