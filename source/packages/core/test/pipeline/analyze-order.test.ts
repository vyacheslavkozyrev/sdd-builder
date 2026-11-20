import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';

// One config with problems from several rules. Its findings must come back in document order: the pipeline
// level first, then each flow in pipeline order with its flow-level findings, then its blocks in list order,
// with a condition's `true` route before its `false` route.
function manyProblems(): ProjectConfig {
  const base = validConfig();
  const build: Flow = {
    index: 0,
    id: 'build',
    name: '',
    arguments: [],
    body: 'Builds the project.',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    next: 'verify',
    blocks: [
      { index: 0, id: 'start', kind: 'start', next: 'agent' },
      {
        index: 1,
        id: 'agent',
        kind: 'agent',
        name: 'build-agent',
        description: '',
        arguments: [],
        next: 'cond',
      },
      {
        index: 2,
        id: 'cond',
        kind: 'condition',
        description: 'Checks the build.',
        true: { to: 'nowhere' },
        false: { to: 'missing' },
      },
      { index: 3, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ],
  };
  const verify: Flow = {
    index: 1,
    id: 'verify',
    name: 'Verify',
    arguments: [],
    body: '',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    blocks: [
      { index: 0, id: 'verify-start', kind: 'start', next: 'verify-agent' },
      {
        index: 1,
        id: 'verify-agent',
        kind: 'agent',
        name: 'verify-agent',
        description: 'Verifies the build.',
        arguments: [],
        next: 'verify-end',
      },
      { index: 2, id: 'verify-end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ],
  };
  const rules = [
    { index: 0, id: 'r-one', title: 'One', text: 'First rule.' },
    { index: 1, id: 'r-one', title: 'Two', text: 'Second rule with the same id.' },
  ];
  return { ...base, rules, pipeline: { ...base.pipeline, flows: [build, verify] } };
}

describe('F-03 AC-032 returns every finding in document order', () => {
  it('returns each problem of every rule, pipeline level first, then flow, block and route order', () => {
    const found = analyzeStructure(manyProblems()).map(({ rule, path }) => [rule, path]);
    expect(found).toEqual([
      ['unique-id', 'rules.1.id'],
      ['flow-name', 'pipeline.flows.0.name'],
      ['agent-description', 'pipeline.flows.0.blocks.1.description'],
      ['route-link', 'pipeline.flows.0.blocks.2.true.to'],
      ['route-link', 'pipeline.flows.0.blocks.2.false.to'],
      ['block-reach', 'pipeline.flows.0.blocks.3'],
      ['flow-body', 'pipeline.flows.1.body'],
    ]);
  });

  it('gives the same list in the same order when the same config is analysed again', () => {
    const config = manyProblems();
    expect(analyzeStructure(config)).toEqual(analyzeStructure(config));
  });
});
