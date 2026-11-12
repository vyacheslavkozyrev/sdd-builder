import type { Condition, MapConnection, StepDefinition, Workflow } from './model.js';

/**
 * Default steps for the reference process (ComEd and PhotoSync), as in
 * spec/documents/building-blocks.md §4. Catalog steps may be required.
 */
export const DEFAULT_STEP_CATALOG: readonly StepDefinition[] = [
  { id: 'define-feature', name: 'Define feature', summary: 'Clarify the feature and write the user stories. Asks the user questions.', kind: 'command', origin: 'catalog', required: true, consumes: ['features.md'], produces: ['stories.md'], ruleTags: [] },
  { id: 'refine', name: 'Refine', summary: 'Update the stories after the user answers or requests changes.', kind: 'command', origin: 'catalog', required: true, consumes: ['stories.md'], produces: ['stories.md'], ruleTags: [] },
  { id: 'plan', name: 'Plan', summary: 'Split the stories into ordered tasks, each with the criteria it covers.', kind: 'command', origin: 'catalog', required: true, consumes: ['stories.md'], produces: ['plan.md'], ruleTags: [] },
  { id: 'implement', name: 'Implement', summary: 'Write one task and its tests, run the checks, stage the change.', kind: 'agent', origin: 'catalog', required: true, consumes: ['plan.md'], produces: ['code', 'tests'], ruleTags: ['typescript.md', 'qa.md'] },
  { id: 'code-review', name: 'Code review', summary: 'Review the staged change against the criteria and the rules.', kind: 'agent', origin: 'catalog', required: true, consumes: ['code'], produces: ['review notes'], ruleTags: ['typescript.md', 'qa.md'] },
  { id: 'unit-tests', name: 'Unit tests', summary: 'Run the type check and the test suite.', kind: 'script', origin: 'catalog', required: true, consumes: ['code'], produces: ['test results'], ruleTags: [] },
  { id: 'e2e-tests', name: 'End-to-end tests', summary: 'Run the end-to-end suite, when the project has one.', kind: 'script', origin: 'catalog', required: false, consumes: ['code'], produces: ['test results'], ruleTags: [] },
  { id: 'commit', name: 'Commit', summary: 'Update progress and make one commit for the task.', kind: 'command', origin: 'catalog', required: true, consumes: ['test results'], produces: ['commit'], ruleTags: [] },
  { id: 'verify', name: 'Verify', summary: 'Check every criterion of the feature has a passing test; prepare the checklist.', kind: 'agent', origin: 'catalog', required: true, consumes: ['commit'], produces: ['checklist.md'], ruleTags: [] },
  { id: 'release', name: 'Release', summary: 'Build the distribution artifact and prepare release notes.', kind: 'command', origin: 'catalog', required: false, consumes: ['checklist.md'], produces: ['release notes'], ruleTags: [] },
];

/** Default workflows: Specify, Implement, Verify, Release (building-blocks.md §4). */
export const DEFAULT_WORKFLOWS: readonly Workflow[] = [
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
      { id: 'approve-plan', afterStepId: 'plan', gate: { id: 'approve-plan', type: 'approval', required: true }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'refine' } },
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
      { id: 'diff-size', afterStepId: 'implement', gate: { id: 'diff-size', type: 'diff-size', threshold: 400, required: true }, pass: { kind: 'next' }, fail: { kind: 'stop' } },
      { id: 'review-clean', afterStepId: 'code-review', gate: { id: 'review-clean', type: 'review', required: true }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'implement' } },
      { id: 'checks-unit', afterStepId: 'unit-tests', gate: { id: 'checks-unit', type: 'checks', required: true }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'implement' } },
      { id: 'checks-e2e', afterStepId: 'e2e-tests', gate: { id: 'checks-e2e', type: 'checks', required: false }, pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'implement' } },
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
      { id: 'criteria-covered', afterStepId: 'verify', gate: { id: 'criteria-covered', type: 'checks', required: false }, pass: { kind: 'next' }, fail: { kind: 'stop' } },
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

/** Default map connections: Specify → Implement → Verify → Release. Workflow ids differ from step ids (AC-001). */
export const DEFAULT_CONNECTIONS: readonly MapConnection[] = [
  { id: 'specify-implement', from: 'specify', to: 'implement-cycle', artifact: 'plan.md' },
  { id: 'implement-verify', from: 'implement-cycle', to: 'verify-feature' },
  { id: 'verify-release', from: 'verify-feature', to: 'release-project', artifact: 'checklist.md' },
];

/** Conditions that the defaults place after steps; exported for tests. */
export function defaultConditions(): Condition[] {
  return DEFAULT_WORKFLOWS.flatMap((w) => w.conditions);
}

/** Looks up a catalog step by id. Throws on unknown ids so typos fail loudly. */
export function getCatalogStep(id: string): StepDefinition {
  const found = DEFAULT_STEP_CATALOG.find((step) => step.id === id);
  if (!found) {
    throw new Error(`Unknown catalog step id: ${id}`);
  }
  return found;
}
