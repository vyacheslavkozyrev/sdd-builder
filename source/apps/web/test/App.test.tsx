// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App.js';

// Markup checks render the application as static HTML. The wiring checks click the real
// buttons in jsdom, so the App's reducer runs for real: a wrong dispatch fails them.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// The project fields, found by their placeholders (the name is a single line, the idea a textarea).
function nameField(): HTMLInputElement {
  return screen.getByPlaceholderText('Name your project') as HTMLInputElement;
}

function ideaField(): HTMLTextAreaElement {
  return screen.getByPlaceholderText('For example: a tracker for hourly work.') as HTMLTextAreaElement;
}

function clickNext(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

function clickPrev(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
}

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

describe('F-09 AC-012 step 1 body in the centre area', () => {
  it('F-09 AC-012 renders the project name and idea fields on the first screen', () => {
    const body = centre(markup());
    expect(body).toContain('id="project-name"');
    expect(body).toContain('id="project-idea"');
  });

  it('F-09 AC-012 negative case: the first screen shows no F-08 placeholder line', () => {
    expect(centre(markup())).not.toContain(PLACEHOLDER_LINE);
  });
});

describe('F-08 AC-013 step body in the centre area on step 2', () => {
  it('F-08 AC-013 renders the step body placeholder line in the centre area on step 2', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(PLACEHOLDER_LINE)).toBeTruthy();
  });

  it('F-08 AC-013 negative case: the centre area shows no step title, step counter or input on step 2', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    const text = main?.textContent ?? '';
    expect(text).not.toMatch(/Step \d/);
    TITLES.forEach((title) => expect(text).not.toContain(title));
    expect(main?.querySelector('input')).toBeNull();
    expect(main?.querySelector('textarea')).toBeNull();
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

describe('F-09 AC-004 a blank name does not block Next', () => {
  it.each([
    { label: 'an empty name', value: '' },
    { label: 'a spaces-only name', value: '   ' },
  ])('F-09 AC-004 Next moves to step 2 with $label', ({ value }) => {
    render(<App />);
    fireEvent.change(nameField(), { target: { value: 'Tracker' } });
    fireEvent.change(nameField(), { target: { value } });
    expect(nameField().value).toBe(value);

    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false);
    clickNext();

    expect(screen.getByRole('img', { name: 'Technical details: current step' })).toBeTruthy();
  });
});

describe('F-09 AC-009 a blank idea does not block Next', () => {
  it.each([
    { label: 'an empty idea', value: '' },
    { label: 'a spaces-only idea', value: '   ' },
  ])('F-09 AC-009 Next moves to step 2 with $label', ({ value }) => {
    render(<App />);
    fireEvent.change(ideaField(), { target: { value: 'Hourly work log' } });
    fireEvent.change(ideaField(), { target: { value } });
    expect(ideaField().value).toBe(value);

    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false);
    clickNext();

    expect(screen.getByRole('img', { name: 'Technical details: current step' })).toBeTruthy();
  });
});

describe('F-09 AC-013 name and idea are kept across steps', () => {
  it('F-09 AC-013 keeps the name and the idea after Next, Prev and Next again', () => {
    render(<App />);
    fireEvent.change(nameField(), { target: { value: 'Tracker' } });
    fireEvent.change(ideaField(), { target: { value: 'Hourly work log' } });

    clickNext();
    clickPrev();
    clickNext();

    expect(screen.getByRole('img', { name: 'Technical details: current step' })).toBeTruthy();
    clickPrev();
    expect(nameField().value).toBe('Tracker');
    expect(ideaField().value).toBe('Hourly work log');
  });

  it('F-09 AC-013 keeps the name and the idea after going to step 4 and back to step 1', () => {
    render(<App />);
    fireEvent.change(nameField(), { target: { value: 'Tracker' } });
    fireEvent.change(ideaField(), { target: { value: 'Hourly work log' } });

    clickNext();
    clickNext();
    clickNext();
    expect(screen.getByRole('img', { name: 'Analyze and generate: current step' })).toBeTruthy();

    clickPrev();
    clickPrev();
    clickPrev();

    expect(screen.getByRole('img', { name: 'Project: current step' })).toBeTruthy();
    expect(nameField().value).toBe('Tracker');
    expect(ideaField().value).toBe('Hourly work log');
  });
});

describe('F-09 AC-014 New project clears the name and the idea', () => {
  it('F-09 AC-014 shows the name and the idea empty again after New project', () => {
    render(<App />);
    fireEvent.change(nameField(), { target: { value: 'Tracker' } });
    fireEvent.change(ideaField(), { target: { value: 'Hourly work log' } });
    clickNext();

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(screen.getByRole('img', { name: 'Project: current step' })).toBeTruthy();
    expect(nameField().value).toBe('');
    expect(ideaField().value).toBe('');
  });

  it('F-09 AC-014 negative case: no value of the earlier project remains after New project from step 4', () => {
    render(<App />);
    fireEvent.change(nameField(), { target: { value: 'Tracker' } });
    clickNext();
    clickNext();
    clickNext();

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(nameField().value).not.toBe('Tracker');
    expect(nameField().value).toBe('');
  });
});

describe('F-09 AC-015 the project step makes no storage or console call on change', () => {
  it('F-09 AC-015 typing a name and an idea calls no localStorage, sessionStorage or console method', () => {
    const storage = [
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'getItem'),
    ];
    const consoleMethods = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
      vi.spyOn(console, 'debug').mockImplementation(() => {}),
    ];
    render(<App />);

    fireEvent.change(nameField(), { target: { value: 'Tracker' } });
    fireEvent.change(ideaField(), { target: { value: 'Hourly work log' } });

    for (const spy of [...storage, ...consoleMethods]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
