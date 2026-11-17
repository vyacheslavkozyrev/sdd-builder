import { describe, expect, it } from 'vitest';
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

// Fixture templates, given as data. They use the placeholders the values fill, so the planned text depends on
// the config; the texts are small and invented.
const fixtureTemplates: Templates = {
  base: [
    {
      path: 'CLAUDE.md',
      text: '# Fixture\n{{processList}}\n{{commandList}}\n{{agentList}}\n{{ruleList}}\n',
      headings: [],
    },
    { path: 'spec/documents/process.md', text: '{{processList}}\n', headings: [] },
    { path: 'spec/specifications/F-00-template/stories.md', text: '# Stories\n', headings: [] },
    { path: 'spec/specifications/F-00-template/plan.md', text: '# Plan\n', headings: [] },
  ],
  pipelineCommand: { text: 'pipeline {{argumentList}}\n{{pipelineStepList}}\n{{commandList}}\n', headings: [] },
  command: { text: 'flow {{flowId}} {{flowName}}\n{{stepList}}\n{{routeRules}}\n', headings: [] },
  agent: { text: 'agent {{name}}\n{{description}}\n{{ruleTags}}\n', headings: [] },
  rule: { text: 'rule {{ruleTitle}}\n{{ruleText}}\n', headings: [] },
};

// The default pipeline, parsed from the imported data (the same object the product ships), with the given rules.
function defaultConfig(rules: Rule[] = []): ProjectConfig {
  const result = parseProjectConfig({ schemaVersion: 2, rules, pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

const RULES: Rule[] = [
  { id: 'tone', title: 'Tone', text: 'Plain and short.' },
  { id: 'style', title: 'Style', text: 'One idea per line.' },
];

// The planned files of a config that is expected to plan; fails the test otherwise.
function planned(config: ProjectConfig, templates: Templates = fixtureTemplates) {
  const plan: Plan = planGeneration(config, templates);
  if (!plan.ok) {
    throw new Error('expected the config to be planned');
  }
  return plan.files;
}

describe('F-04 AC-008 planning the same config and templates twice gives equal plans', () => {
  it('F-04 AC-008 gives equal plans for the default pipeline with rules, with the same paths, order and texts', () => {
    const config = defaultConfig(RULES);
    const first = planGeneration(config, fixtureTemplates);
    const second = planGeneration(config, fixtureTemplates);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second).toEqual(first);
  });

  it('F-04 AC-008 gives equal layouts, descriptions and rule tags on every planned file', () => {
    const config = defaultConfig(RULES);
    const first = planned(config);
    const second = planned(structuredClone(config));
    expect(second).toStrictEqual(first);
    expect(first.every((file) => typeof file.description === 'string')).toBe(true);
    expect(first.every((file) => Array.isArray(file.ruleTags))).toBe(true);
  });
});

describe('F-04 AC-007 a config with its flows and rules in another order gives the same paths', () => {
  it('F-04 AC-007 gives the same paths and order when the rules are listed in reverse', () => {
    const forward = planned(defaultConfig(RULES));
    const backward = planned(defaultConfig([...RULES].reverse()));
    expect(backward.map((file) => file.path)).toEqual(forward.map((file) => file.path));
  });

  it('F-04 AC-007 gives the same paths and order when the flows after the first one are listed in reverse', () => {
    // The first flow is the entry of the pipeline (reachability starts there), so it stays first; the rest keep
    // their Connections whatever their order in the list.
    const config = defaultConfig(RULES);
    const reversed = structuredClone(config);
    const [entry, ...others] = reversed.pipeline.flows;
    if (entry === undefined) {
      throw new Error('the default pipeline has no flow');
    }
    reversed.pipeline.flows = [entry, ...others.reverse()];
    const forward = planned(config);
    const backward = planned(reversed);
    expect(backward.map((file) => file.path)).toEqual(forward.map((file) => file.path));
  });
});

describe('F-04 AC-009 no planned text holds a date, a time, a UUID or a random string', () => {
  // The fixed list of patterns. Each one is checked against a sample first, so a pattern that never matches
  // cannot make the test pass by accident.
  const PATTERNS: readonly { readonly name: string; readonly pattern: RegExp; readonly sample: string }[] = [
    { name: 'a date', pattern: /\b\d{4}-\d{2}-\d{2}\b/, sample: 'on 2026-11-17' },
    { name: 'a time', pattern: /\b\d{1,2}:\d{2}(?::\d{2})?\b/, sample: 'at 09:30:00' },
    {
      name: 'a UUID',
      pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
      sample: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    },
    {
      name: 'a random string of 20 letters and digits',
      pattern: /\b(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{20,}\b/i,
      sample: 'token a8fK2mQ9xZ1pL7vB3nR0T',
    },
  ];

  it.each(PATTERNS)('F-04 AC-009 recognises $name in a sample, so the check below can fail', ({ pattern, sample }) => {
    expect(pattern.test(sample)).toBe(true);
  });

  it('F-04 AC-009 finds none of the patterns in any planned text of a fixed config', () => {
    const files = planned(defaultConfig(RULES));
    const hits = files.flatMap((file) =>
      PATTERNS.filter(({ pattern }) => pattern.test(file.text)).map(({ name }) => `${file.path}: ${name}`),
    );
    expect(hits).toEqual([]);
  });
});

describe('F-04 AC-010 planning does not change the config or the templates', () => {
  it('F-04 AC-010 leaves the config and the templates equal to their state before the call', () => {
    const config = defaultConfig(RULES);
    const templates = structuredClone(fixtureTemplates);
    const configBefore = structuredClone(config);
    const templatesBefore = structuredClone(templates);

    planGeneration(config, templates);

    expect(config).toStrictEqual(configBefore);
    expect(templates).toStrictEqual(templatesBefore);
  });

  it('F-04 AC-010 leaves the config unchanged when it is refused, too', () => {
    const config = defaultConfig(RULES);
    const firstFlow = config.pipeline.flows[0];
    if (firstFlow === undefined) {
      throw new Error('the default pipeline has no flow');
    }
    firstFlow.ruleTags = ['missing'];
    const configBefore = structuredClone(config);

    const plan = planGeneration(config, fixtureTemplates);

    expect(plan.ok).toBe(false);
    expect(config).toStrictEqual(configBefore);
  });
});
