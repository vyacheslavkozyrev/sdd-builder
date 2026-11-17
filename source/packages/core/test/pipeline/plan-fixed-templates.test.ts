import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

// The templates are fixtures given as data: this test reads no template file and no clock. Each run gets its own
// copy, so a run cannot leave state behind for the next one.
const FIXTURE_TEMPLATES: Templates = {
  base: [
    { path: 'CLAUDE.md', text: '# Fixture\n{{processList}}\n{{commandList}}\n', headings: [] },
    { path: 'spec/documents/process.md', text: '{{processList}}\n', headings: [] },
    { path: 'spec/specifications/F-00-template/stories.md', text: '# Stories\n', headings: [] },
    { path: 'spec/specifications/F-00-template/plan.md', text: '# Plan\n', headings: [] },
  ],
  pipelineCommand: { text: 'pipeline {{argumentList}}\n{{pipelineStepList}}\n', headings: [] },
  command: { text: 'flow {{flowId}} {{flowName}}\n{{stepList}}\n{{routeRules}}\n', headings: [] },
  agent: { text: 'agent {{name}}\n{{description}}\n{{ruleTags}}\n', headings: [] },
  rule: { text: 'rule {{ruleTitle}}\n{{ruleText}}\n', headings: [] },
};

function defaultConfig() {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

// The plan of a call that is expected to plan; fails the test otherwise.
function planOf(templates: Templates): Extract<Plan, { readonly ok: true }> {
  const plan = planGeneration(defaultConfig(), templates);
  if (!plan.ok) {
    throw new Error('expected the default pipeline to be planned');
  }
  return plan;
}

describe('F-04 AC-033 planning with the same fixture templates gives the same plan in two runs', () => {
  it('F-04 AC-033 gives an equal plan on the second run with the same fixture templates', () => {
    const first = planOf(structuredClone(FIXTURE_TEMPLATES));
    const second = planOf(structuredClone(FIXTURE_TEMPLATES));
    expect(second).toStrictEqual(first);
  });

  it('F-04 AC-033 gives the same paths, in the same order, and the same texts on both runs', () => {
    const first = planOf(structuredClone(FIXTURE_TEMPLATES));
    const second = planOf(structuredClone(FIXTURE_TEMPLATES));
    expect(second.files.map((file) => file.path)).toEqual(first.files.map((file) => file.path));
    expect(second.files.map((file) => file.text)).toEqual(first.files.map((file) => file.text));
  });

  it('F-04 AC-033 gives the same plan when another plan runs between the two, with other templates', () => {
    const first = planOf(structuredClone(FIXTURE_TEMPLATES));
    const other: Templates = {
      ...structuredClone(FIXTURE_TEMPLATES),
      command: { text: 'another flow layout {{flowId}}\n{{stepList}}\n', headings: [] },
    };
    const changed = planOf(other);
    const second = planOf(structuredClone(FIXTURE_TEMPLATES));
    expect(changed).not.toStrictEqual(first);
    expect(second).toStrictEqual(first);
  });

  it('F-04 AC-033 takes the texts from the templates given as data, so a changed fixture changes the planned text', () => {
    const first = planOf(structuredClone(FIXTURE_TEMPLATES));
    const edited: Templates = {
      ...structuredClone(FIXTURE_TEMPLATES),
      base: FIXTURE_TEMPLATES.base.map((file) =>
        file.path === 'CLAUDE.md' ? { ...file, text: '# Edited fixture\n' } : { ...file },
      ),
    };
    const second = planOf(edited);
    const claudeBefore = first.files.find((file) => file.path === 'CLAUDE.md');
    const claudeAfter = second.files.find((file) => file.path === 'CLAUDE.md');
    expect(claudeBefore?.text).toContain('# Fixture');
    expect(claudeAfter?.text).toBe('# Edited fixture\n');
  });
});
