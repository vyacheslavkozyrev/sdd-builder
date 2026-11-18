// @vitest-environment jsdom
// DOM tests for the properties panel and the toolbox (F-11 AC-023, AC-025, AC-026, AC-027, AC-028, AC-034).
// The panel's content is tested as pure logic in panel.test.ts and fields.test.ts; here the rendered text,
// the refusal under a field and the footer are checked.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline } from '@sddbuilder/core';
import { PropertiesPanel, BODY_LIMIT } from '../src/builder/PropertiesPanel.js';
import { Toolbox, TOOL_HINTS } from '../src/builder/Toolbox.js';
import { NAME_TAKEN_REASON } from '../src/builder/fields.js';
import type { Selection } from '../src/builder/panel.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

afterEach(() => {
  cleanup();
});

function flow(id: string, name: string, extra: Partial<Flow> = {}): Flow {
  return { id, name, description: `${name} description`, arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[], extra: Partial<Pipeline> = {}): Pipeline {
  return {
    name: 'SDD process',
    description: 'The process we built',
    arguments: [{ id: 'feature-id', required: true, hint: 'The feature' }],
    flows,
    ...extra,
  };
}

const PLAN = flow('plan', 'plan', { body: 'Writes plan.md.', model: 'haiku' });
const BUILD = flow('build', 'build');

// Holds the pipeline as the builder does, so an accepted edit shows in the panel at once.
function Harness({
  initial,
  selection,
  onChange,
  onDelete = vi.fn(),
}: {
  readonly initial: Pipeline;
  readonly selection: Selection | undefined;
  readonly onChange?: (next: Pipeline) => void;
  readonly onDelete?: (flowId: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <PropertiesPanel
      pipeline={value}
      selection={selection}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
      onDelete={onDelete}
    />
  );
}

function panel(): HTMLElement {
  return screen.getByRole('region', { name: 'Properties' });
}

function field(label: string): HTMLInputElement | HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement;
}

// The model select shows its chosen option as text, not as an input value.
function modelText(): string {
  return screen.getByRole('combobox', { name: 'Model' }).textContent ?? '';
}

describe('F-11 AC-023 toolbox', () => {
  it('F-11 AC-023 lists Connection, Approval and Check in that order', () => {
    render(<Toolbox />);
    const items = within(screen.getByRole('region', { name: 'Toolbox' })).getAllByRole('listitem');
    const names = items.map((item) => item.querySelector('p')?.textContent);
    expect(names).toEqual(['Connection', 'Approval', 'Check']);
  });

  it('F-11 AC-023 shows each tool with its hint and no Start, End or switch-off control (negative case)', () => {
    render(<Toolbox />);
    const region = screen.getByRole('region', { name: 'Toolbox' });
    expect(within(region).getByText(TOOL_HINTS.Connection)).toBeTruthy();
    expect(within(region).getByText(TOOL_HINTS.Approval)).toBeTruthy();
    expect(within(region).getByText(TOOL_HINTS.Check)).toBeTruthy();
    expect(within(region).queryByText(/^Start$|^End$/)).toBeNull();
    expect(within(region).queryByRole('button')).toBeNull();
    expect(within(region).queryByText(/switch|disable/i)).toBeNull();
  });
});

describe('F-11 AC-025 panel content by selection', () => {
  it('F-11 AC-025 with nothing selected shows the pipeline name, description, arguments, model, tools, rule tags and body', () => {
    const value = config([PLAN], { model: 'sonnet', tools: ['Read', 'Edit'], ruleTags: ['general', 'qa'], body: 'Runs the feature.' });
    render(<Harness initial={value} selection={undefined} />);
    expect(screen.getByText('Pipeline properties')).toBeTruthy();
    expect(field('Name').value).toBe('SDD process');
    expect(field('Description').value).toBe('The process we built');
    expect(panel().textContent).toContain('feature-id · required');
    expect(modelText()).toBe('sonnet');
    expect(field('Tools').value).toBe('Read, Edit');
    expect(field('Rule tags').value).toBe('general, qa');
    expect(field('Body').value).toBe('Runs the feature.');
  });

  it('F-11 AC-025 with a flow selected shows its name, description, arguments, model and body', () => {
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} />);
    expect(screen.getByText('Flow: plan')).toBeTruthy();
    expect(field('Name · required').value).toBe('plan');
    expect(field('Description').value).toBe('plan description');
    expect(field('Arguments').value).toBe('');
    expect(modelText()).toBe('haiku');
    expect(field('Body').value).toBe('Writes plan.md.');
    expect(screen.queryByLabelText('Tools')).toBeNull();
    expect(screen.queryByLabelText('Rule tags')).toBeNull();
  });

  it('F-11 AC-025 with an arrow selected shows its artifact label, source, target and gate', () => {
    const gated = flow('build', 'build', {
      connectedTo: { to: 'verify', label: 'commits', gate: { kind: 'approval', description: 'A person reviews the diff' } },
    });
    render(<Harness initial={config([gated, flow('verify', 'verify')])} selection={{ kind: 'arrow', source: 'build' }} />);
    const text = panel().textContent ?? '';
    expect(text).toContain('Artifact label');
    expect(text).toContain('commits');
    expect(text).toContain('Source');
    expect(text).toContain('Target');
    expect(text).toContain('verify');
    expect(text).toContain('approval · human');
    expect(text).toContain('A person reviews the diff');
  });

  it('F-11 AC-025 an arrow with no gate shows no gate field', () => {
    const plain = flow('build', 'build', { connectedTo: { to: 'verify', label: 'commits' } });
    render(<Harness initial={config([plain, flow('verify', 'verify')])} selection={{ kind: 'arrow', source: 'build' }} />);
    expect(panel().textContent).not.toContain('Gate');
  });
});

describe('F-11 AC-026 generated file line', () => {
  it('F-11 AC-026 shows the pipeline file for the pipeline', () => {
    render(<Harness initial={config([PLAN])} selection={undefined} />);
    expect(screen.getByText('Generates .claude/commands/pipeline.md')).toBeTruthy();
  });

  it('F-11 AC-026 names a flow file from its id, not its name', () => {
    render(<Harness initial={config([flow('specify', 'Specify Step')])} selection={{ kind: 'flow', id: 'specify' }} />);
    expect(screen.getByText('Generates .claude/commands/specify.md')).toBeTruthy();
    expect(screen.queryByText(/Specify Step\.md/)).toBeNull();
  });

  it('F-11 AC-026 shows no generated file for an arrow (negative case)', () => {
    const linked = flow('build', 'build', { connectedTo: { to: 'verify', label: 'commits' } });
    render(<Harness initial={config([linked, flow('verify', 'verify')])} selection={{ kind: 'arrow', source: 'build' }} />);
    expect(panel().textContent).not.toContain('Generates');
  });
});

describe('F-11 AC-027 accepted and refused edits', () => {
  it('F-11 AC-027 an edit the parser accepts updates the value and the panel shows it at once', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={undefined} onChange={onChange} />);
    fireEvent.change(field('Name'), { target: { value: 'New process' } });
    fireEvent.blur(field('Name'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ name: 'New process' });
    expect(field('Name').value).toBe('New process');
  });

  it('F-11 AC-027 Enter commits a single-line field', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Description'), { target: { value: 'Writes the plan' } });
    fireEvent.keyDown(field('Description'), { key: 'Enter' });
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      flows: [expect.objectContaining({ id: 'plan', description: 'Writes the plan' })],
    });
  });

  it('F-11 AC-027 a refused name keeps the saved value in the field and shows the reason beside it', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN, BUILD])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Name · required'), { target: { value: 'build' } });
    fireEvent.blur(field('Name · required'));
    expect(onChange).not.toHaveBeenCalled();
    expect(field('Name · required').value).toBe('plan');
    expect(screen.getByText(`Refused: ${NAME_TAKEN_REASON}`)).toBeTruthy();
  });

  it('F-11 AC-027 a refused edit clears when the next edit is accepted', () => {
    render(<Harness initial={config([PLAN, BUILD])} selection={{ kind: 'flow', id: 'plan' }} />);
    fireEvent.change(field('Name · required'), { target: { value: 'build' } });
    fireEvent.blur(field('Name · required'));
    expect(screen.getByText(`Refused: ${NAME_TAKEN_REASON}`)).toBeTruthy();
    fireEvent.change(field('Name · required'), { target: { value: 'design' } });
    fireEvent.blur(field('Name · required'));
    expect(screen.queryByText(`Refused: ${NAME_TAKEN_REASON}`)).toBeNull();
    expect(field('Name · required').value).toBe('design');
  });

  it('F-11 AC-027 a blank flow name is refused with the parser message and keeps the saved name', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Name · required'), { target: { value: '   ' } });
    fireEvent.blur(field('Name · required'));
    expect(onChange).not.toHaveBeenCalled();
    expect(field('Name · required').value).toBe('plan');
    expect(screen.getByText('Refused: Name must be non-blank text.')).toBeTruthy();
  });

  it('F-11 AC-027 a refused name committed with Enter reverts the field and shows the reason', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN, BUILD])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Name · required'), { target: { value: 'build' } });
    fireEvent.keyDown(field('Name · required'), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(field('Name · required').value).toBe('plan');
    expect(screen.getByText(`Refused: ${NAME_TAKEN_REASON}`)).toBeTruthy();
  });

  it('F-11 AC-027 Enter does not commit a multi-line body (negative case); blur does', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Body'), { target: { value: 'Writes more.' } });
    fireEvent.keyDown(field('Body'), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(field('Body'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ flows: [expect.objectContaining({ body: 'Writes more.' })] });
  });

  it('F-11 AC-027 an edit that changes nothing does not call onChange', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={undefined} onChange={onChange} />);
    fireEvent.blur(field('Name'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-027 a list field is split on commas and blank items are dropped', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={undefined} onChange={onChange} />);
    fireEvent.change(field('Tools'), { target: { value: ' Read , , Edit ' } });
    fireEvent.blur(field('Tools'));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ tools: ['Read', 'Edit'] });
  });

  it('F-11 AC-027 clearing an optional text field removes it from the pipeline', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([flow('plan', 'plan', { body: 'Writes plan.md.' })])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Body'), { target: { value: '' } });
    fireEvent.blur(field('Body'));
    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]).not.toHaveProperty('body');
  });
});

describe('F-11 AC-028 body counter and limit', () => {
  it('F-11 AC-028 shows the body length in code points against 1000', () => {
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} />);
    expect(screen.getByText('15 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-028 counts one emoji as one character', () => {
    render(<Harness initial={config([flow('plan', 'plan', { body: '😀' })])} selection={{ kind: 'flow', id: 'plan' }} />);
    expect(screen.getByText('1 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-028 accepts a body of exactly 1000 characters', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Body'), { target: { value: 'a'.repeat(BODY_LIMIT) } });
    fireEvent.blur(field('Body'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1000 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-028 refuses a body of 1,001 characters, shows the reason and keeps the saved body', () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    fireEvent.change(field('Body'), { target: { value: 'a'.repeat(BODY_LIMIT + 1) } });
    fireEvent.blur(field('Body'));
    expect(onChange).not.toHaveBeenCalled();
    expect(field('Body').value).toBe('Writes plan.md.');
    expect(screen.getByText('Refused: Body must be at most 1000 characters.')).toBeTruthy();
    expect(screen.getByText('15 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-028 counts a pipeline body the same way', () => {
    render(<Harness initial={config([PLAN], { body: 'Runs the feature.' })} selection={undefined} />);
    expect(screen.getByText('17 / 1000 characters')).toBeTruthy();
  });
});

describe('F-11 AC-034 no switch-off on a flow', () => {
  it('F-11 AC-034 a flow footer has Delete flow only (negative case: no switch-off)', () => {
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} />);
    expect(screen.getByRole('button', { name: 'Delete flow' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(/switch|disable|off/i)).toBeNull();
  });

  it('F-11 AC-034 Delete flow asks the caller to delete that flow by its id', () => {
    const onDelete = vi.fn();
    render(<Harness initial={config([PLAN, BUILD])} selection={{ kind: 'flow', id: 'build' }} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    expect(onDelete).toHaveBeenCalledWith('build');
  });

  it('F-11 AC-034 the pipeline has no Delete control and says it cannot be removed (negative case)', () => {
    render(<Harness initial={config([PLAN])} selection={undefined} />);
    // The only buttons are the argument row controls (AC-027); none of them switches the pipeline or a flow off.
    for (const button of screen.getAllByRole('button')) {
      expect(button.textContent).toMatch(/^(Edit|Remove|Add argument)$/);
    }
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('The pipeline cannot be removed.')).toBeTruthy();
  });
});

describe("F-11 AC-027 a flow's arguments stay text", () => {
  it("F-11 AC-027 a flow's arguments are one text field, not rows, and an edit is saved as text", () => {
    const onChange = vi.fn();
    render(<Harness initial={config([PLAN])} selection={{ kind: 'flow', id: 'plan' }} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Add argument' })).toBeNull();
    fireEvent.change(field('Arguments'), { target: { value: 'topic' } });
    fireEvent.blur(field('Arguments'));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      flows: [expect.objectContaining({ id: 'plan', arguments: 'topic' })],
    });
  });
});
