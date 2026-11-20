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
          id: 'build',
          name: 'Build',
          arguments: [],
          body: 'Runs the build agent.',
          artifacts: [{ label: 'out.md', template: 'The output' }],
          approval: false,
          blocks: [
            { index: 0, id: 'start', kind: 'start', next: 'agent' },
            {
              index: 1,
              id: 'agent',
              kind: 'agent',
              name: 'build-agent',
              description: 'Builds the project.',
              arguments: [],
              next: 'end',
            },
            { index: 2, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
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
