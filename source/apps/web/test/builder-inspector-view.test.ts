import { describe, expect, it } from 'vitest';
import { DEFAULT_STEP_CATALOG, getCatalogStep } from '@sddbuilder/core';
import type { StepDefinition } from '@sddbuilder/core';
import { NO_FILE_TEXT, stepInspector } from '../src/builder/inspector-view.js';

function custom(overrides: Partial<StepDefinition> = {}): StepDefinition {
  return {
    id: 'my-step',
    name: 'My step',
    summary: 'A custom step.',
    kind: 'command',
    origin: 'custom',
    required: false,
    consumes: [],
    produces: [],
    ruleTags: [],
    body: 'Do the thing.',
    ...overrides,
  };
}

describe('F-06 AC-033 inspector shows the files a step produces', () => {
  it('F-06 AC-033 lists the produced files of a catalog step', () => {
    const inspector = stepInspector(getCatalogStep('plan'));
    expect(inspector.files).toEqual(['plan.md']);
    expect(inspector.producesText).toBe('plan.md');
  });

  it('F-06 AC-033 lists every produced output of a catalog step that writes several', () => {
    const inspector = stepInspector(getCatalogStep('implement'));
    expect(inspector.files).toEqual(['code', 'tests']);
    expect(inspector.producesText).toBe('code, tests');
  });

  it('F-06 AC-033 lists the produced files of a custom step', () => {
    const inspector = stepInspector(custom({ produces: ['security.md', 'notes.md'] }));
    expect(inspector.files).toEqual(['security.md', 'notes.md']);
    expect(inspector.producesText).toBe('security.md, notes.md');
  });

  it('F-06 AC-033 returns a copy of the produced list, not the definition array', () => {
    const definition = custom({ produces: ['a.md'] });
    const inspector = stepInspector(definition);
    inspector.files.push('b.md');
    expect(definition.produces).toEqual(['a.md']);
  });

  it('F-06 AC-033 covers every catalog step with its own produced files', () => {
    for (const step of DEFAULT_STEP_CATALOG) {
      expect(stepInspector(step).files).toEqual(step.produces);
    }
  });
});

describe('F-06 AC-034 inspector shows the rule-set tags of a step', () => {
  it('F-06 AC-034 lists the rule-set tags of a catalog step', () => {
    const inspector = stepInspector(getCatalogStep('implement'));
    expect(inspector.ruleTags).toEqual(['code.md', 'qa.md']);
  });

  it('F-06 AC-034 lists the rule-set tags of a custom step', () => {
    const inspector = stepInspector(custom({ ruleTags: ['security.md'] }));
    expect(inspector.ruleTags).toEqual(['security.md']);
  });

  it('F-06 AC-034 shows no tags for a step with no tags', () => {
    expect(stepInspector(getCatalogStep('plan')).ruleTags).toEqual([]);
    expect(stepInspector(custom()).ruleTags).toEqual([]);
  });

  it('F-06 AC-034 returns a copy of the tag list, not the definition array', () => {
    const definition = custom({ ruleTags: ['qa.md'] });
    const inspector = stepInspector(definition);
    inspector.ruleTags.push('x.md');
    expect(definition.ruleTags).toEqual(['qa.md']);
  });
});

describe('F-06 AC-035 a step that produces no file shows that no file is generated', () => {
  it('F-06 AC-035 gives the no-file text, not an empty text, when produces is empty', () => {
    const inspector = stepInspector(custom({ produces: [] }));
    expect(inspector.producesText).toBe('no file generated');
    expect(inspector.producesText).toBe(NO_FILE_TEXT);
    expect(inspector.files).toEqual([]);
  });

  it('F-06 AC-035 gives the no-file text for a catalog step that produces nothing', () => {
    const withNothing = { ...getCatalogStep('plan'), produces: [] };
    expect(stepInspector(withNothing).producesText).toBe('no file generated');
  });

  it('F-06 AC-035 still shows the tags of a step that produces no file', () => {
    const inspector = stepInspector(custom({ produces: [], ruleTags: ['qa.md'] }));
    expect(inspector.producesText).toBe('no file generated');
    expect(inspector.ruleTags).toEqual(['qa.md']);
  });

  it('F-06 AC-033 gives the heading and summary the inspector shows for a step', () => {
    const inspector = stepInspector(custom({ name: 'Review', summary: 'Checks the diff.' }));
    expect(inspector.name).toBe('Review');
    expect(inspector.summary).toBe('Checks the diff.');
  });
});
