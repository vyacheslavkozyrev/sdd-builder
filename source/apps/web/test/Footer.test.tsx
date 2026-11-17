import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '../src/layout/Footer.js';

function render(): string {
  return renderToStaticMarkup(<Footer />);
}

describe('F-07 footer', () => {
  it('F-07 AC-004 states that the work is not saved and is lost on refresh', () => {
    const markup = render();
    expect(markup).toContain(
      'The work is not saved. It is lost when the browser is refreshed.',
    );
  });

  it('F-07 AC-005 contains no button element', () => {
    expect(render()).not.toMatch(/<button\b/i);
  });

  it('F-07 AC-005 contains no link or anchor element', () => {
    const markup = render();
    expect(markup).not.toMatch(/<a\b/i);
    expect(markup).not.toMatch(/\bhref=/i);
  });

  it('F-07 AC-005 contains no control role', () => {
    const markup = render();
    expect(markup).not.toMatch(/role="(button|link)"/i);
    expect(markup).not.toMatch(/<input\b/i);
  });

  it('F-07 AC-014 renders Material UI elements with a Mui class prefix', () => {
    const markup = render();
    expect(markup).toMatch(/class="[^"]*\bMui[A-Za-z]+-root\b/);
  });
});
