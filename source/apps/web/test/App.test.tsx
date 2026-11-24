// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App.js';

// Markup checks render the application as static HTML. The wiring checks click the real
// buttons in jsdom, so the App's reducer runs for real: a wrong dispatch fails them.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Step 3 draws the pipeline canvas (React Flow), which creates a ResizeObserver; jsdom does not provide one.
// The observer never reports, which is enough: the canvas boxes carry their own size.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
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

describe('F-13 AC-001 step body in the centre area on step 4', () => {
  it('F-13 AC-001 renders the privacy notice in the centre area on step 4', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Privacy notice')).toBeTruthy();
    expect(screen.queryByText(PLACEHOLDER_LINE)).toBeNull();
  });

  it('F-13 AC-001 negative case: the centre area shows no step counter or text input on step 4', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    const text = main?.textContent ?? '';
    expect(text).not.toMatch(/Step \d/);
    expect(text).not.toContain('Analyze and generate');
    expect(main?.querySelector('input:not([type="checkbox"])')).toBeNull();
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

// The technical details step, reached through the wizard. Step 2 is one Next away from step 1.
function clickPrevNTimes(times: number): void {
  for (let click = 0; click < times; click += 1) clickPrev();
}

function clickNextNTimes(times: number): void {
  for (let click = 0; click < times; click += 1) clickNext();
}

function stackField(label: string): HTMLInputElement {
  return screen.getByRole('textbox', { name: label }) as HTMLInputElement;
}

function architectureField(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Architecture (optional)' }) as HTMLTextAreaElement;
}

function addRuleButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Add rule block' }) as HTMLButtonElement;
}

// The rule block fields by their block number (the ids are rule-name-N and rule-description-N).
function ruleNameField(block: number): HTMLInputElement {
  const field = document.getElementById(`rule-name-${block}`);
  if (!(field instanceof HTMLInputElement)) throw new Error(`no name field for rule block ${block}`);
  return field;
}

function ruleDescriptionField(block: number): HTMLTextAreaElement {
  const field = document.getElementById(`rule-description-${block}`);
  if (!(field instanceof HTMLTextAreaElement)) throw new Error(`no description field for rule block ${block}`);
  return field;
}

function mainText(): string {
  return document.querySelector('main')?.textContent ?? '';
}

// Goes to step 2 and fills the stack, the architecture and one rule block.
function fillStep2(): void {
  clickNext();
  fireEvent.change(stackField('Language'), { target: { value: 'TypeScript' } });
  fireEvent.change(stackField('Framework'), { target: { value: 'React' } });
  fireEvent.change(stackField('Platform'), { target: { value: 'Node' } });
  fireEvent.change(stackField('Build tool'), { target: { value: 'Vite' } });
  fireEvent.change(stackField('Test framework'), { target: { value: 'Vitest' } });
  fireEvent.change(architectureField(), { target: { value: 'Layered' } });
  fireEvent.click(addRuleButton());
  fireEvent.change(ruleNameField(1), { target: { value: 'Code Style' } });
  fireEvent.change(ruleDescriptionField(1), { target: { value: 'Use named exports.' } });
}

describe('F-10 AC-008 the rule list starts empty through the app', () => {
  // Each route is the clicks from step 1 that end on step 2.
  it.each([
    { label: 'a fresh wizard', route: ['Next'] },
    { label: 'after Next, Prev and Next', route: ['Next', 'Prev', 'Next'] },
    { label: 'after going to step 4 and back to step 2', route: ['Next', 'Next', 'Next', 'Prev', 'Prev'] },
  ])('F-10 AC-008 shows zero rule blocks on step 2 for $label', ({ route }) => {
    render(<App />);
    for (const button of route) {
      if (button === 'Next') clickNext();
      else clickPrev();
    }

    expect(screen.getByRole('img', { name: 'Technical details: current step' })).toBeTruthy();
    expect(mainText()).toContain('No rule blocks yet.');
    expect(document.getElementById('rule-name-1')).toBeNull();
  });
});

describe('F-10 AC-019 duplicate ids through the app', () => {
  it('F-10 AC-019 flags both blocks whose names give the same id and keeps both names as typed', () => {
    render(<App />);
    clickNext();
    fireEvent.click(addRuleButton());
    fireEvent.click(addRuleButton());
    fireEvent.change(ruleNameField(1), { target: { value: 'Code Style' } });
    fireEvent.change(ruleNameField(2), { target: { value: 'code style' } });

    expect(mainText()).toContain('Same file as rule block 2. Both are kept.');
    expect(mainText()).toContain('Same file as rule block 1. Both are kept.');
    expect(ruleNameField(1).value).toBe('Code Style');
    expect(ruleNameField(2).value).toBe('code style');
  });

  it('F-10 AC-019 negative case: removing one of the two clears the message on the other', async () => {
    render(<App />);
    clickNext();
    fireEvent.click(addRuleButton());
    fireEvent.click(addRuleButton());
    fireEvent.change(ruleNameField(1), { target: { value: 'Code Style' } });
    fireEvent.change(ruleNameField(2), { target: { value: 'code style' } });

    fireEvent.click(screen.getByRole('button', { name: 'Remove rule block 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(mainText()).not.toContain('Same file as rule block');
    expect(ruleNameField(1).value).toBe('Code Style');
  });
});

describe('F-10 AC-021 each wizard step shows its own body through the app', () => {
  it.each([
    { label: 'Project', clicks: 0, shows: 'Project: current step', present: 'id="project-name"' },
    { label: 'Technical details', clicks: 1, shows: 'Technical details: current step', present: 'id="technical-language"' },
    { label: 'Workflow', clicks: 2, shows: 'Workflow: current step', present: 'aria-label="Pipeline tabs"' },
    { label: 'Analyze and generate', clicks: 3, shows: 'Analyze and generate: current step', present: 'Privacy notice' },
  ])('F-10 AC-021 step $label shows its own body', ({ clicks, shows, present }) => {
    const { container } = render(<App />);
    clickNextNTimes(clicks);

    expect(screen.getByRole('img', { name: shows })).toBeTruthy();
    expect(container.innerHTML).toContain(present);
  });

  it('F-10 AC-021 negative case: step 2 shows no placeholder line and no project field', () => {
    render(<App />);
    clickNext();
    expect(mainText()).not.toContain(PLACEHOLDER_LINE);
    expect(document.getElementById('project-name')).toBeNull();
  });

  it('F-10 AC-025 shows the stack, the architecture and the rule list in the centre area on step 2', () => {
    render(<App />);
    clickNext();
    const text = mainText();
    expect(text.indexOf('Stack')).toBeGreaterThan(-1);
    expect(text.indexOf('Rule blocks')).toBeGreaterThan(text.indexOf('Stack'));
    expect(text).toContain('Architecture (optional)');
    expect(text).not.toContain(PLACEHOLDER_LINE);
  });
});

describe('F-10 AC-022 step 2 values are kept through the app', () => {
  it.each([
    { label: 'Language', value: 'TypeScript', read: () => stackField('Language').value },
    { label: 'Framework', value: 'React', read: () => stackField('Framework').value },
    { label: 'Platform', value: 'Node', read: () => stackField('Platform').value },
    { label: 'Build tool', value: 'Vite', read: () => stackField('Build tool').value },
    { label: 'Test framework', value: 'Vitest', read: () => stackField('Test framework').value },
    { label: 'architecture', value: 'Layered', read: () => architectureField().value },
    { label: 'rule name', value: 'Code Style', read: () => ruleNameField(1).value },
    { label: 'rule description', value: 'Use named exports.', read: () => ruleDescriptionField(1).value },
  ])('F-10 AC-022 keeps the $label after Next, Prev and Next again', ({ value, read }) => {
    render(<App />);
    fillStep2();

    clickNext();
    clickPrev();
    clickNext();
    clickPrev();

    expect(read()).toBe(value);
  });

  it('F-10 AC-022 keeps every step 2 value after going to step 4 and back to step 2', () => {
    render(<App />);
    fillStep2();

    clickNextNTimes(2);
    expect(screen.getByRole('img', { name: 'Analyze and generate: current step' })).toBeTruthy();
    clickPrevNTimes(2);

    expect(screen.getByRole('img', { name: 'Technical details: current step' })).toBeTruthy();
    expect(stackField('Language').value).toBe('TypeScript');
    expect(stackField('Test framework').value).toBe('Vitest');
    expect(architectureField().value).toBe('Layered');
    expect(ruleNameField(1).value).toBe('Code Style');
    expect(ruleDescriptionField(1).value).toBe('Use named exports.');
  });
});

describe('F-10 AC-023 New project clears the step 2 values through the app', () => {
  it('F-10 AC-023 shows the stack, the architecture and the rule list empty after New project', () => {
    render(<App />);
    fillStep2();
    clickNextNTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(screen.getByRole('img', { name: 'Project: current step' })).toBeTruthy();
    clickNext();

    expect(stackField('Language').value).toBe('');
    expect(stackField('Framework').value).toBe('');
    expect(architectureField().value).toBe('');
    expect(mainText()).toContain('No rule blocks yet.');
    expect(document.getElementById('rule-name-1')).toBeNull();
  });

  it('F-10 AC-023 negative case: no value of the earlier project remains on step 2 after New project', () => {
    render(<App />);
    fillStep2();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    clickNext();

    expect(screen.queryByDisplayValue('TypeScript')).toBeNull();
    expect(screen.queryByDisplayValue('Code Style')).toBeNull();
    expect(screen.queryByDisplayValue('Layered')).toBeNull();
  });
});

describe('F-10 AC-024 the technical details step makes no storage or console call through the app', () => {
  it('F-10 AC-024 changing a stack field, the architecture and a rule block calls no storage or console method', () => {
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
    fillStep2();

    for (const spy of [...storage, ...consoleMethods]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
