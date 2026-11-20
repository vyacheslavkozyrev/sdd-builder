// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App.js';

// Markup checks render the application as static HTML. The wiring checks click the real
// buttons in jsdom, so the App's reducer runs for real: a wrong dispatch fails them.

afterEach(() => {
  cleanup();
});

// Emotion writes a <style> tag before each styled element; they are not part of the layout.
function markup(): string {
  return renderToStaticMarkup(<App />).replace(/<style\b[\s\S]*?<\/style>/g, '');
}

// The centre area, from its opening tag to its closing tag.
function centre(html: string): string {
  return html.slice(html.indexOf('<main'), html.indexOf('</main>'));
}

const TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];
const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

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
});

describe('F-08 AC-001 stepper titles on the first screen', () => {
  it('F-08 AC-001 renders the four stepper titles in order', () => {
    const html = markup();
    const positions = TITLES.map((title) => html.indexOf(`>${title}<`));
    positions.forEach((position) => expect(position).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe('F-08 AC-012 application wiring on the first screen', () => {
  it('F-08 AC-012 renders Prev disabled and Next shown on step 1', () => {
    const html = markup();
    expect(html).toMatch(/<button\b[^>]*\bdisabled=""[^>]*>Prev<\/button>/);
    expect(html).toMatch(/<button\b(?![^>]*\bdisabled)[^>]*>Next<\/button>/);
  });

  it('F-08 AC-012 negative case: Prev is not enabled on step 1', () => {
    expect(markup()).not.toMatch(/<button\b(?![^>]*\bdisabled)[^>]*>Prev<\/button>/);
  });
});

describe('F-08 AC-013 step body in the centre area', () => {
  it('F-08 AC-013 renders the step body placeholder line in the centre area', () => {
    expect(centre(markup())).toContain(PLACEHOLDER_LINE);
  });

  it('F-08 AC-013 negative case: the centre area shows no step title, step counter or input', () => {
    const body = centre(markup());
    TITLES.forEach((title) => expect(body).not.toContain(`>${title}<`));
    expect(body).not.toMatch(/Step \d/);
    expect(body).not.toMatch(/<input\b/);
  });
});

describe('F-08 AC-005 Prev is wired to the reducer', () => {
  it('F-08 AC-005 negative case: Prev on step 2 returns to step 1 through the wiring', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));

    expect(screen.getByRole('img', { name: 'Project: current step' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Prev' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('F-08 AC-006 Next is wired to the reducer', () => {
  // Reaching step N from step 1 takes N - 1 clicks; the click that leaves step N is the N-th.
  it.each([
    { from: 1, next: 'Technical details' },
    { from: 2, next: 'Workflow' },
    { from: 3, next: 'Analyze and generate' },
  ])('F-08 AC-006 Next moves from step $from to $next', ({ from, next }) => {
    render(<App />);

    for (let click = 0; click < from; click += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }

    expect(screen.getByRole('img', { name: `${next}: current step` })).toBeTruthy();
  });

  it('F-08 AC-006 clicking Next on step 1 marks Project as done', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('img', { name: 'Project: done' })).toBeTruthy();
  });
});

describe('F-08 AC-012 New project restarts the wizard', () => {
  it('F-08 AC-012 pressing New project on step 4 returns to step 1 at once', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('img', { name: 'Analyze and generate: current step' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(screen.getByRole('img', { name: 'Project: current step' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Analyze and generate: to do' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Prev' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('F-08 AC-012 negative case: New project from step 3 does not keep step 3 as the current step', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(screen.getByRole('img', { name: 'Project: current step' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Workflow: current step' })).toBeNull();
  });
});
