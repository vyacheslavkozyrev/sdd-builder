import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../src/App.js';
import { AppFrame } from '../src/layout/AppFrame.js';
import { Wizard } from '../src/wizard/Wizard.js';
import { PLACEHOLDER_LINE } from '../src/wizard/StepBody.js';
import { ADD_LABEL } from '../src/wizard/RuleBlocks.js';
import { LANGUAGE_ID } from '../src/wizard/TechnicalStep.js';
import {
  initialWizardState,
  wizardReducer,
  type RuleBlock,
  type WizardAction,
  type WizardState,
} from '../src/wizard/state.js';

// The wizard values with the project step set and the step 2 values empty.
function project(name: string, idea: string) {
  return {
    name,
    idea,
    stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
    architecture: '',
    rules: [],
  };
}

// App keeps the wizard state in useReducer. Hooks cannot run outside a render,
// so the test replaces useReducer with a stand-in: it records the reducer and
// the initial state App passes, returns the current state, and its dispatch
// runs the recorded reducer on that state. The reducer rules are tested in
// state.test.ts; this file tests that App wires the reducer and the handlers.
const hooks = vi.hoisted(() => ({
  state: null as unknown as WizardState,
  reducer: null as unknown as (state: WizardState, action: WizardAction) => WizardState,
  init: null as unknown as () => WizardState,
  dispatch: null as unknown as (action: WizardAction) => void,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useReducer: (
      reducer: (state: WizardState, action: WizardAction) => WizardState,
      _initialArg: unknown,
      init: () => WizardState,
    ) => {
      hooks.reducer = reducer;
      hooks.init = init;
      return [hooks.state, hooks.dispatch];
    },
  };
});

const NOTE = 'The work is not saved. It is lost when the browser is refreshed.';

beforeEach(() => {
  hooks.state = initialWizardState();
  hooks.dispatch = (action) => {
    hooks.state = hooks.reducer(hooks.state, action);
  };
});

function render(): string {
  return renderToStaticMarkup(<App />);
}

/** The root element App returns, which must be an AppFrame. */
function frameOf(): ReactElement<{ onNewProject: () => void; children?: unknown }> {
  const root = App();
  if (!isValidElement<{ onNewProject: () => void; children?: unknown }>(root)) {
    throw new Error('App did not return an element');
  }
  expect(root.type).toBe(AppFrame);
  return root;
}

type WizardProps = {
  step: number;
  values: ReturnType<typeof project>;
  onUpdate: (patch: { name?: string; idea?: string }) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
  onUpdateRule: (index: number, patch: Partial<RuleBlock>) => void;
  onPrev: () => void;
  onNext: () => void;
};

/** The Wizard element inside the frame. */
function wizardOf(): ReactElement<WizardProps> {
  const child = frameOf().props.children;
  if (!isValidElement<WizardProps>(child)) {
    throw new Error('the frame does not hold a wizard element');
  }
  expect(child.type).toBe(Wizard);
  return child;
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
    // Emotion writes <style> tags into the static markup; they are not part of the layout.
    const layout = render().replace(/<style\b[\s\S]*?<\/style>/g, '');
    expect(layout).toMatch(/^<div\b[^>]*>\s*<header\b/);
  });

  it('F-07 AC-008 no longer shows the F-07 centre placeholder text', () => {
    expect(render()).not.toContain('Screen content is added by the wizard (F-08).');
  });
});

describe('F-08 application wiring', () => {
  it('F-08 AC-012 renders the wizard inside the frame, as its centre content', () => {
    expect(wizardOf().type).toBe(Wizard);
  });

  it('F-08 AC-012 shows the first step body on the first screen', () => {
    expect(render()).toContain('id="project-name"');
    expect(render()).not.toContain(PLACEHOLDER_LINE);
  });

  it('F-09 AC-012 shows the placeholder line on step 3 (App wiring)', () => {
    hooks.state = { step: 3, values: project('', '') };
    expect(render()).toContain(PLACEHOLDER_LINE);
  });

  it('F-09 AC-013 passes the name and the idea from the state to the wizard', () => {
    hooks.state = { step: 1, values: project('Tracker', 'A tracker') };
    expect(wizardOf().props.values).toEqual(project('Tracker', 'A tracker'));
  });

  it('F-09 AC-013 the update handler merges the patch into the values through the reducer', () => {
    hooks.state = { step: 1, values: project('Tracker', '') };
    wizardOf().props.onUpdate({ idea: 'A tracker' });
    expect(hooks.state.values).toEqual(project('Tracker', 'A tracker'));
  });

  it('F-09 AC-013 the values stay after Next, Prev and Next again', () => {
    hooks.state = { step: 1, values: project('Tracker', 'A tracker') };
    wizardOf().props.onNext();
    wizardOf().props.onPrev();
    wizardOf().props.onNext();
    expect(hooks.state.values).toEqual(project('Tracker', 'A tracker'));
  });

  it('F-09 AC-014 New project clears the name and the idea (negative case: no earlier value remains)', () => {
    hooks.state = { step: 1, values: project('Tracker', 'A tracker') };
    frameOf().props.onNewProject();
    expect(hooks.state.values).toEqual(project('', ''));
    expect(render()).not.toContain('Tracker');
  });

  it('F-08 AC-012 passes the current step from the state to the wizard', () => {
    hooks.state = { step: 3, values: project('', '') };
    expect(wizardOf().props.step).toBe(3);
  });

  it('F-08 AC-012 App uses the wizard reducer and the initial wizard state', () => {
    frameOf();
    expect(hooks.reducer).toBe(wizardReducer);
    expect(hooks.init).toBe(initialWizardState);
  });

  it('F-08 AC-012 New project from step 4 returns the wizard to step 1', () => {
    hooks.state = { step: 4, values: project('', '') };
    frameOf().props.onNewProject();
    expect(wizardOf().props.step).toBe(1);
  });

  it('F-08 AC-006 Next moves the wizard forward one step through the reducer', () => {
    wizardOf().props.onNext();
    expect(wizardOf().props.step).toBe(2);
    wizardOf().props.onNext();
    expect(wizardOf().props.step).toBe(3);
  });

  it('F-08 AC-008 Prev moves the wizard back one step through the reducer', () => {
    hooks.state = { step: 3, values: project('', '') };
    wizardOf().props.onPrev();
    expect(wizardOf().props.step).toBe(2);
  });
});

// The wizard values with the step 2 values set: the stack, the architecture and the rule blocks.
function withStep2(rules: RuleBlock[] = []) {
  return {
    name: 'Tracker',
    idea: 'A tracker',
    stack: { language: 'TypeScript', framework: 'React', platform: '', buildTool: '', testFramework: '' },
    architecture: 'Layers',
    rules,
  };
}

describe('F-10 application wiring for the technical details step', () => {
  it('F-10 AC-019 shows the technical details card on step 2 through the app', () => {
    hooks.state = { step: 2, values: withStep2() };
    expect(render()).toContain(`id="${LANGUAGE_ID}"`);
    expect(render()).toContain(ADD_LABEL);
    expect(render()).not.toContain(PLACEHOLDER_LINE);
  });

  it.each([
    ['one forward and back', ['next', 'prev', 'next']],
    ['to step 4 and back to step 2', ['next', 'next', 'next', 'prev', 'prev']],
    ['to step 3 and back', ['next', 'next', 'prev']],
  ] as const)('F-10 AC-008 the rule list starts empty through the app when the path is %s (table-driven)', (_label, path) => {
    hooks.state = initialWizardState();
    for (const move of path) {
      wizardOf().props[move === 'next' ? 'onNext' : 'onPrev']();
    }
    expect(hooks.state.values.rules).toEqual([]);
  });

  it('F-10 AC-008 Add rule block through the app appends one empty block and nothing else', () => {
    hooks.state = { step: 2, values: withStep2() };
    wizardOf().props.onAddRule();
    expect(hooks.state.values.rules).toEqual([{ name: '', description: '' }]);
  });

  it('F-10 AC-009 Remove and update of a rule block reach the reducer through the app', () => {
    hooks.state = { step: 2, values: withStep2([{ name: 'a', description: '' }, { name: 'b', description: '' }]) };
    wizardOf().props.onUpdateRule(1, { description: 'Text' });
    expect(hooks.state.values.rules).toEqual([
      { name: 'a', description: '' },
      { name: 'b', description: 'Text' },
    ]);
    wizardOf().props.onRemoveRule(0);
    expect(hooks.state.values.rules).toEqual([{ name: 'b', description: 'Text' }]);
  });

  it('F-10 AC-020 step 2 values stay after Next, Prev and Next again, and after step 4 and back', () => {
    const rules = [{ name: 'Code Style', description: 'Use the formatter.' }];
    hooks.state = { step: 2, values: withStep2(rules) };
    const expected = withStep2(rules);
    wizardOf().props.onNext();
    wizardOf().props.onPrev();
    wizardOf().props.onNext();
    expect(hooks.state.values).toEqual(expected);
    wizardOf().props.onNext();
    wizardOf().props.onPrev();
    wizardOf().props.onPrev();
    expect(wizardOf().props.step).toBe(2);
    expect(hooks.state.values).toEqual(expected);
  });

  it('F-10 AC-021 New project clears every step 2 value and the rule list (negative case: no earlier value remains)', () => {
    hooks.state = { step: 4, values: withStep2([{ name: 'Code Style', description: 'Use the formatter.' }]) };
    frameOf().props.onNewProject();
    expect(hooks.state.values).toEqual(project('', ''));
    hooks.state = { ...hooks.state, step: 2 };
    const markup = render();
    expect(markup).toContain('No rule blocks yet.');
    expect(markup).not.toContain('Code Style');
    expect(markup).not.toContain('Use the formatter.');
  });
});
