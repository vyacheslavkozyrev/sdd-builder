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
