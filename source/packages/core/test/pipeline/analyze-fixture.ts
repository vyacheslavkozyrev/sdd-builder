// The valid ProjectConfig that every structural rule test starts from: one flow, Start → Agent → End.
// `buildConfig` returns a fresh copy, so a test changes one part of it and leaves the rest valid.
import type { ProjectConfig } from '../../src/pipeline/model.js';

export const validConfig: ProjectConfig = {
  schemaVersion: 2,
  rules: [],
  pipeline: {
    name: 'Fixture pipeline',
    description: 'A minimal valid pipeline for the structural checks.',
    arguments: [{ id: 'feature-id', required: true, hint: 'F-XX' }],
    flows: [
      {
        id: 'build',
        name: 'Build',
        description: 'Builds one feature.',
        arguments: 'feature-id',
        blocks: [
          {
            id: 'build-start',
            kind: 'start',
            connectedTo: { to: 'build-agent', label: 'feature-id' },
          },
          {
            id: 'build-agent',
            kind: 'agent',
            name: 'build',
            description: 'Builds the feature.',
            arguments: 'feature-id',
            connectedTo: { to: 'build-end', label: 'code' },
          },
          {
            id: 'build-end',
            kind: 'end',
            outcome: 'done',
          },
        ],
      },
    ],
  },
};

// Returns a fresh copy of the valid config, with `change` applied to it.
export function buildConfig(change?: (config: ProjectConfig) => void): ProjectConfig {
  const config = structuredClone(validConfig);
  change?.(config);
  return config;
}
