import type { MapConnection, ProjectConfig, Workflow } from '../src/index.js';

// The flat default workflows and connections, as literal test data (F-06 T021b). The parse-config and limits suites
// take them as inputs; they no longer come from the removed flat catalog.
const WORKFLOWS: Workflow[] = [
  {
    id: 'specify',
    name: 'Specify',
    scope: 'feature',
    iterationSource: 'features.md',
    enabled: true,
    steps: [
      { stepId: 'define-feature', enabled: true },
      { stepId: 'refine', enabled: true },
      { stepId: 'plan', enabled: true },
    ],
    conditions: [
      { id: 'approve-plan', enabled: true, afterStepId: 'plan', gate: { id: 'approve-plan', type: 'approval', required: true }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'refine' } },
    ],
  },
  {
    id: 'implement-cycle',
    name: 'Implement',
    scope: 'task',
    iterationSource: 'plan.md',
    enabled: true,
    steps: [
      { stepId: 'implement', enabled: true },
      { stepId: 'code-review', enabled: true },
      { stepId: 'unit-tests', enabled: true },
      { stepId: 'e2e-tests', enabled: false },
      { stepId: 'commit', enabled: true },
    ],
    conditions: [
      { id: 'diff-size', enabled: true, afterStepId: 'implement', gate: { id: 'diff-size', type: 'diff-size', threshold: 400, required: true }, pass: { kind: 'next' }, fail: { kind: 'stop' } },
      { id: 'review-clean', enabled: true, afterStepId: 'code-review', gate: { id: 'review-clean', type: 'review', required: true }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'implement' } },
      { id: 'checks-unit', enabled: true, afterStepId: 'unit-tests', gate: { id: 'checks-unit', type: 'checks', required: true }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'implement' } },
      { id: 'checks-e2e', enabled: true, afterStepId: 'e2e-tests', gate: { id: 'checks-e2e', type: 'checks', required: false }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'implement' } },
    ],
  },
  {
    id: 'verify-feature',
    name: 'Verify',
    scope: 'feature',
    iterationSource: 'features.md',
    enabled: true,
    steps: [{ stepId: 'verify', enabled: true }],
    conditions: [
      { id: 'criteria-covered', enabled: true, afterStepId: 'verify', gate: { id: 'criteria-covered', type: 'checks', required: false }, pass: { kind: 'next' }, fail: { kind: 'stop' } },
    ],
  },
  {
    id: 'release-project',
    name: 'Release',
    scope: 'project',
    iterationSource: 'project',
    enabled: true,
    steps: [{ stepId: 'release', enabled: true }],
    conditions: [],
  },
];

const CONNECTIONS: MapConnection[] = [
  { id: 'specify-implement', from: 'specify', to: 'implement-cycle', artifact: 'plan.md' },
  { id: 'implement-verify', from: 'implement-cycle', to: 'verify-feature' },
  { id: 'verify-release', from: 'verify-feature', to: 'release-project', artifact: 'checklist.md' },
];

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
    workflows: structuredClone(WORKFLOWS),
    connections: structuredClone(CONNECTIONS),
    targets: ['claude'],
    ...overrides,
  };
}
