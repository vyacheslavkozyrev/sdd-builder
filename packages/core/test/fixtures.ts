import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS, type ProjectConfig } from '../src/index.js';

/** A valid configuration built from the defaults. Tests change one thing at a time. */
export function baseConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Demo project',
    idea: 'A demo project for the generator tests.',
    stack: { language: 'TypeScript', testFramework: 'Vitest' },
    architecture: { style: 'layered', modules: [] },
    codeRules: [],
    testRules: [],
    customSteps: [],
    workflows: structuredClone([...DEFAULT_WORKFLOWS]),
    connections: structuredClone([...DEFAULT_CONNECTIONS]),
    targets: ['claude'],
    ...overrides,
  };
}

import type { MapConnection, Workflow } from '../src/index.js';

/** A minimal workflow with one enabled step and no conditions. */
export function workflow(id: string, overrides: Partial<Workflow> = {}): Workflow {
  return {
    id,
    name: id,
    scope: 'project',
    iterationSource: 'project',
    enabled: true,
    steps: [{ stepId: 'release', enabled: true }],
    conditions: [],
    ...overrides,
  };
}

export function connection(from: string, to: string, id = `${from}-${to}`): MapConnection {
  return { id, from, to };
}
