import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';

// A valid config: one flow, Start → Agent → End, with `index` on every list item. Each call returns a
// fresh value, so a test may keep or change it without affecting another test.
export function validConfig(): ProjectConfig {
  return {
    schemaVersion: 2,
    rules: [],
    pipeline: {
      name: 'Build pipeline',
      description: 'One flow that builds the project.',
      arguments: [],
      flows: [
        {
          index: 0,
          id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6',
          name: 'Build',
          arguments: [],
          body: 'Runs the build agent.',
          artifacts: [{ label: 'out.md', template: 'The output' }],
          approval: false,
          blocks: [
            { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c' },
            {
              index: 1,
              id: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c',
              kind: 'agent',
              name: 'build-agent',
              description: 'Builds the project.',
              arguments: [],
              next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
            },
            { index: 2, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
          ],
        },
      ],
    },
  };
}

// The valid config with its only flow changed by `change`; every other part is kept.
export function withFlow(change: (flow: Flow) => Flow): ProjectConfig {
  const base = validConfig();
  const flow = base.pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return { ...base, pipeline: { ...base.pipeline, flows: [change(flow)] } };
}
