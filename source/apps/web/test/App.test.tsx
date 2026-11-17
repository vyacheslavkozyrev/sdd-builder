import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../src/App.js';
import { AppFrame } from '../src/layout/AppFrame.js';

const NOTE = 'The work is not saved. It is lost when the browser is refreshed.';

function render(): string {
  return renderToStaticMarkup(<App />);
}

describe('F-07 application root', () => {
  it('F-07 AC-008 shows the header with the wordmark SDDBuilder on the first screen', () => {
    const markup = render();
    expect(markup).toContain('<header');
    expect(markup).toContain('SDDBuilder');
  });

  it('F-07 AC-008 shows the footer not-saved note on the first screen', () => {
    const markup = render();
    expect(markup).toContain('<footer');
    expect(markup).toContain(NOTE);
  });

  it('F-07 AC-008 renders the frame as the outer element, with the header as its first child', () => {
    // App takes no state and calls no hooks, so it can be invoked directly to read the element it returns.
    const root = App();
    if (!isValidElement(root)) throw new Error('App did not return an element');
    expect(root.type).toBe(AppFrame);
    // Emotion writes <style> tags into the static markup; they are not part of the layout.
    const layout = render().replace(/<style\b[\s\S]*?<\/style>/g, '');
    expect(layout).toMatch(/^<div\b[^>]*>\s*<header\b/);
  });
});
