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
    id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6',
    name: '',
    arguments: [],
    body: 'Builds the project.',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    next: '9db17c97-0038-5730-901f-161db419c217',
    blocks: [
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c' },
      {
        index: 1,
        id: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c',
        kind: 'agent',
        name: 'build-agent',
        description: '',
        arguments: [],
        next: 'a43c79d0-c35f-5ce2-9620-c8e379373527',
      },
      {
        index: 2,
        id: 'a43c79d0-c35f-5ce2-9620-c8e379373527',
        kind: 'condition',
        description: 'Checks the build.',
        true: { to: 'a5767084-cb93-5669-9a85-49c86b4893f6' },
        false: { to: '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
      },
      { index: 3, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ],
  };
  const verify: Flow = {
    index: 1,
    id: '9db17c97-0038-5730-901f-161db419c217',
    name: 'Verify',
    arguments: [],
    body: '',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    blocks: [
      { index: 0, id: 'ea1a6b62-509c-5a55-a4a4-0425dfa533f5', kind: 'start', next: '3391f01d-c30a-5c5f-858b-f203c1b8ecbc' },
      {
        index: 1,
        id: '3391f01d-c30a-5c5f-858b-f203c1b8ecbc',
        kind: 'agent',
        name: 'verify-agent',
        description: 'Verifies the build.',
        arguments: [],
        next: 'd411ff37-b98f-532e-b9bf-fe7ad813999b',
      },
      { index: 2, id: 'd411ff37-b98f-532e-b9bf-fe7ad813999b', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ],
  };
  const rules = [
    { index: 0, id: 'fb5ace87-cc29-51f9-b8e5-fcd356703753', title: 'One', text: 'First rule.' },
    { index: 1, id: 'fb5ace87-cc29-51f9-b8e5-fcd356703753', title: 'Two', text: 'Second rule with the same id.' },
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
