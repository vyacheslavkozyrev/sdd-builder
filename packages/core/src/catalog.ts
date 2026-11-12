import type { BlockDefinition, CustomBlockDefinition } from './model.js';

/**
 * Default SDLC block catalog. Derived from the working process of the
 * ComEd and PhotoSync projects (`.claude/commands`, `.claude/agents`,
 * `spec/documents/process.md`), generalised so that no block is tied to
 * Swift or to one platform.
 */
export const DEFAULT_BLOCK_CATALOG: readonly BlockDefinition[] = [
  {
    id: 'research',
    name: 'Research',
    summary: 'Investigate technical unknowns for one feature and record findings.',
    defaultOrder: 1,
    scope: 'feature',
    required: false,
    commandName: 'research',
    agentName: null,
    consumes: [],
    produces: ['research.md'],
  },
  {
    id: 'specify',
    name: 'Specify',
    summary: 'Turn a feature into user stories with tagged, testable acceptance criteria. The user approves them.',
    defaultOrder: 2,
    scope: 'feature',
    required: true,
    commandName: 'specify',
    agentName: null,
    consumes: ['features'],
    produces: ['stories.md'],
  },
  {
    id: 'plan',
    name: 'Plan',
    summary: 'Split approved stories into small, ordered tasks, each with the criteria it covers. The user approves the plan.',
    defaultOrder: 3,
    scope: 'feature',
    required: true,
    commandName: 'plan',
    agentName: null,
    consumes: ['specify'],
    produces: ['plan.md'],
  },
  {
    id: 'implement',
    name: 'Implement',
    summary: 'Write one task and its tests, run the checks, stage the change. Does not commit.',
    defaultOrder: 4,
    scope: 'task',
    required: true,
    commandName: 'implement',
    agentName: 'implement',
    consumes: ['plan'],
    produces: ['code', 'tests'],
  },
  {
    id: 'review',
    name: 'Review',
    summary: 'Review the staged diff against the criteria and the rules, fix findings (bounded rounds). Does not commit.',
    defaultOrder: 5,
    scope: 'task',
    required: true,
    commandName: 'review',
    agentName: 'review',
    consumes: ['implement'],
    produces: ['review notes'],
  },
  {
    id: 'test',
    name: 'Test',
    summary: 'Run the project checks (format, build, tests) for the change and its dependants.',
    defaultOrder: 6,
    scope: 'task',
    required: true,
    commandName: 'test',
    agentName: null,
    consumes: ['review'],
    produces: ['test results'],
  },
  {
    id: 'commit',
    name: 'Commit',
    summary: 'Update progress, then make one commit for the task. Only reviewed and tested work reaches the history.',
    defaultOrder: 7,
    scope: 'task',
    required: true,
    commandName: 'commit',
    agentName: null,
    consumes: ['test'],
    produces: ['commit', 'progress.md'],
  },
  {
    id: 'verify',
    name: 'Verify',
    summary: 'After the last task, check every criterion has a passing test and prepare the manual device or environment checklist.',
    defaultOrder: 8,
    scope: 'feature',
    required: false,
    commandName: 'verify',
    agentName: 'test',
    consumes: ['commit'],
    produces: ['test matrix', 'checklist.md'],
  },
  {
    id: 'release',
    name: 'Release',
    summary: 'Build the distribution artifact and prepare store or release metadata.',
    defaultOrder: 9,
    scope: 'project',
    required: false,
    commandName: 'release',
    agentName: null,
    consumes: ['verify'],
    produces: ['release notes'],
  },
];

/**
 * Looks up a block by id in the catalog first, then among the project's custom blocks.
 * Throws on unknown ids so typos fail loudly.
 */
export function resolveBlock(
  id: string,
  customBlocks: readonly CustomBlockDefinition[],
): BlockDefinition | CustomBlockDefinition {
  const fromCatalog = DEFAULT_BLOCK_CATALOG.find((block) => block.id === id);
  if (fromCatalog) {
    return fromCatalog;
  }
  const fromCustom = customBlocks.find((block) => block.id === id);
  if (fromCustom) {
    return fromCustom;
  }
  throw new Error(`Unknown block id: ${id}`);
}
