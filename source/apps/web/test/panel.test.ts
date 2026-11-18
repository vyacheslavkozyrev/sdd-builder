import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { PIPELINE_FILE, TOOLBOX, panelFor } from '../src/builder/panel.js';
import type { PanelField, Selection } from '../src/builder/panel.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;
type FlowLink = pipeline.FlowLink;

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: 'Does a step', arguments: 'the brief', blocks: [], ...extra };
}

function config(flows: Flow[] = [flow('specify'), flow('plan')], extra: Partial<Pipeline> = {}): Pipeline {
  return {
    name: 'pipeline',
    description: 'A process',
    arguments: [{ id: 'topic', required: true, hint: 'The topic' }],
    model: 'sonnet',
    tools: ['Read'],
    ruleTags: ['tests-first'],
    body: 'Run the flows.',
    flows,
    ...extra,
  };
}

// Two flows, with an arrow from `specify` to `plan`, unless another link is given.
function withArrow(link: FlowLink = { to: 'plan', label: 'Spec' }): Pipeline {
  return config([flow('specify', { connectedTo: link }), flow('plan')]);
}

function keys(fields: readonly PanelField[]): string[] {
  return fields.map((field) => field.key);
}

describe('F-11 AC-023 Pipeline toolbox', () => {
  it('F-11 AC-023 lists Connection, Approval and Check in that order', () => {
    expect(TOOLBOX).toEqual(['Connection', 'Approval', 'Check']);
    expect(panelFor(undefined, config()).toolbox).toEqual(['Connection', 'Approval', 'Check']);
  });

  it('F-11 AC-023 holds no Start and no End in any panel (negative case)', () => {
    const selections: Selection[] = [
      { kind: 'pipeline' },
      { kind: 'flow', id: 'specify' },
      { kind: 'arrow', source: 'specify' },
    ];
    const cfg = withArrow();
    for (const selection of selections) {
      const { toolbox } = panelFor(selection, cfg);
      expect(toolbox).not.toContain('Start');
      expect(toolbox).not.toContain('End');
    }
  });
});

describe('F-11 AC-025 properties panel fields', () => {
  it('F-11 AC-025 shows the pipeline fields with nothing selected', () => {
    const result = panelFor(undefined, config());
    expect(result.heading).toBe('Pipeline');
    expect(keys(result.fields)).toEqual(['name', 'description', 'arguments', 'model', 'tools', 'ruleTags', 'body']);
    expect(result.fields.find((field) => field.key === 'name')?.value).toBe('pipeline');
    expect(result.fields.find((field) => field.key === 'body')?.value).toBe('Run the flows.');
  });

  it('F-11 AC-025 shows the pipeline fields when the pipeline is selected', () => {
    expect(keys(panelFor({ kind: 'pipeline' }, config()).fields)).toEqual(keys(panelFor(undefined, config()).fields));
  });

  it('F-11 AC-025 shows the flow fields with a flow selected, and no pipeline-only fields', () => {
    const result = panelFor({ kind: 'flow', id: 'plan' }, config());
    expect(result.heading).toBe('Name plan');
    expect(keys(result.fields)).toEqual(['name', 'description', 'arguments', 'model', 'body']);
    expect(result.fields.find((field) => field.key === 'arguments')?.value).toBe('the brief');
  });

  it('F-11 AC-025 shows the arrow label, source, target, and the gate when it has one', () => {
    const gate = { kind: 'approval' as const, description: 'Owner approves' };
    const cfg = withArrow({ to: 'plan', label: 'Spec', gate });
    const result = panelFor({ kind: 'arrow', source: 'specify' }, cfg);
    expect(result.heading).toBe('Connection');
    expect(result.fields).toEqual([
      { key: 'label', label: 'Artifact label', value: 'Spec' },
      { key: 'source', label: 'Source', value: 'specify' },
      { key: 'target', label: 'Target', value: 'plan' },
      { key: 'gate', label: 'Gate', value: gate },
    ]);
  });

  it('F-11 AC-025 leaves the gate out of an arrow without one', () => {
    expect(keys(panelFor({ kind: 'arrow', source: 'specify' }, withArrow()).fields)).toEqual([
      'label',
      'source',
      'target',
    ]);
  });

  it('F-11 AC-025 refuses an arrow the flow does not have (programmer error)', () => {
    expect(() => panelFor({ kind: 'arrow', source: 'plan' }, config())).toThrow('The flow plan has no arrow.');
  });

  it('F-11 AC-025 refuses an unknown flow id (programmer error)', () => {
    expect(() => panelFor({ kind: 'flow', id: 'missing' }, config())).toThrow(
      'The pipeline has no flow with the id missing.',
    );
  });
});

describe('F-11 AC-026 generated file line', () => {
  it('F-11 AC-026 names the pipeline file for the pipeline panel', () => {
    expect(panelFor(undefined, config()).file).toBe('.claude/commands/pipeline.md');
    expect(PIPELINE_FILE).toBe('.claude/commands/pipeline.md');
  });

  it('F-11 AC-026 names the flow file by the flow id', () => {
    expect(panelFor({ kind: 'flow', id: 'plan' }, config()).file).toBe('.claude/commands/plan.md');
  });

  it('F-11 AC-026 gives an arrow no generated file', () => {
    expect(panelFor({ kind: 'arrow', source: 'specify' }, withArrow()).file).toBeUndefined();
  });
});

describe('F-11 AC-030 one selection at a time', () => {
  it('F-11 AC-030 shows only the selected item when the selection moves', () => {
    const cfg = withArrow();
    const onFlow = panelFor({ kind: 'flow', id: 'plan' }, cfg);
    expect(onFlow.heading).toBe('Name plan');
    const onArrow = panelFor({ kind: 'arrow', source: 'specify' }, cfg);
    expect(onArrow.heading).toBe('Connection');
    expect(onArrow.fields.some((field) => field.key === 'arguments')).toBe(false);
    const onPipeline = panelFor({ kind: 'pipeline' }, cfg);
    expect(onPipeline.heading).toBe('Pipeline');
  });

  it('F-11 AC-030 leaves the pipeline value unchanged by a panel read', () => {
    const cfg = config();
    const snapshot = JSON.stringify(cfg);
    panelFor({ kind: 'flow', id: 'specify' }, cfg);
    panelFor(undefined, cfg);
    expect(JSON.stringify(cfg)).toBe(snapshot);
  });
});

describe('F-11 AC-034 no switch-off on a flow', () => {
  it('F-11 AC-034 gives a flow no switch-off field (negative case, decision 34)', () => {
    const result = panelFor({ kind: 'flow', id: 'plan' }, config());
    const labels = result.fields.map((field) => field.label.toLowerCase());
    expect(labels.some((label) => /enabled|switch|on\/off|off/.test(label))).toBe(false);
    expect(keys(result.fields).some((key) => /enabled|switch|off/i.test(key))).toBe(false);
    expect(result.toolbox.some((tool) => /switch|off/i.test(tool))).toBe(false);
  });
});
