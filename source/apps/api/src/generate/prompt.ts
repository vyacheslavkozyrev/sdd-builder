import type {
  ArchitectureSpec,
  Condition,
  Gate,
  GenerationPlan,
  MapConnection,
  ModuleSpec,
  ProjectConfig,
  RouteTarget,
  StepDefinition,
  TechStack,
  Workflow,
  WorkflowStep,
} from '@sddbuilder/core';

/** The fixed generation task and reply format. Only the brief, the plan and the findings follow it. */
const GENERATION_INSTRUCTIONS = [
  'You are writing the files of a Claude Code project framework for the project described below.',
  'For each planned file, write its full content. The layout shows the structure the file must have; the description and rule tags say what the file is for and which rules apply to it.',
  'Write for this project only. Do not mention the tool that produced these files. Leave no placeholders, such as braces around a name, and no TODO markers.',
  'Reply with ONLY one JSON object that maps each planned path to its text, with no prose and no code fence. Use exactly the planned paths as keys, and no other keys. Every value is a string.',
].join('\n');

const BRIEF_HEADING = 'Brief and process (JSON):';
const PLAN_HEADING = 'Planned files, in order:';
const FINDINGS_HEADING = 'Findings of the previous reply. Fix each of them in this reply:';

/** Collapses line breaks and other white space, so text taken from the brief cannot start a new list line. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function pickStack(stack: TechStack) {
  return {
    language: stack.language,
    framework: stack.framework,
    platform: stack.platform,
    buildTool: stack.buildTool,
    testFramework: stack.testFramework,
  };
}

function pickModule(module: ModuleSpec) {
  return {
    name: module.name,
    layer: module.layer,
    responsibility: module.responsibility,
    dependsOn: module.dependsOn,
  };
}

function pickArchitecture(architecture: ArchitectureSpec) {
  return {
    style: architecture.style,
    modules: architecture.modules.map(pickModule),
    notes: architecture.notes,
  };
}

function pickGate(gate: Gate) {
  return {
    id: gate.id,
    type: gate.type,
    threshold: gate.threshold,
    required: gate.required,
  };
}

function pickRoute(route: RouteTarget | undefined) {
  if (route === undefined) {
    return undefined;
  }
  if (route.kind === 'step') {
    return { kind: route.kind, stepId: route.stepId };
  }
  return { kind: route.kind };
}

function pickCondition(condition: Condition) {
  return {
    id: condition.id,
    afterStepId: condition.afterStepId,
    gate: pickGate(condition.gate),
    pass: pickRoute(condition.pass),
    fail: pickRoute(condition.fail),
    roundLimit: condition.roundLimit,
  };
}

function pickWorkflowStep(step: WorkflowStep) {
  return { stepId: step.stepId, enabled: step.enabled };
}

function pickWorkflow(workflow: Workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    scope: workflow.scope,
    iterationSource: workflow.iterationSource,
    enabled: workflow.enabled,
    description: workflow.description,
    steps: workflow.steps.map(pickWorkflowStep),
    conditions: workflow.conditions.filter((condition) => condition.enabled).map(pickCondition),
  };
}

function pickConnection(connection: MapConnection) {
  return {
    id: connection.id,
    from: connection.from,
    to: connection.to,
    artifact: connection.artifact,
    gate: connection.gate === undefined ? undefined : pickGate(connection.gate),
  };
}

function pickStep(step: StepDefinition) {
  return {
    id: step.id,
    name: step.name,
    summary: step.summary,
    kind: step.kind,
    origin: step.origin,
    required: step.required,
    consumes: step.consumes,
    produces: step.produces,
    ruleTags: step.ruleTags,
    body: step.body,
    description: step.description,
  };
}

/**
 * Picks the brief and the process in a fixed key order, so the text depends
 * only on the values, never on how the object was built. Fields not listed
 * here (for example schemaVersion, or anything added at runtime) are left out.
 */
function pickProject(config: ProjectConfig) {
  return {
    name: config.name,
    idea: config.idea,
    stack: pickStack(config.stack),
    architecture: pickArchitecture(config.architecture),
    codeRules: config.codeRules,
    testRules: config.testRules,
    workflows: config.workflows.map(pickWorkflow),
    connections: config.connections.map(pickConnection),
    customSteps: config.customSteps.map(pickStep),
    targets: config.targets,
  };
}

/** Lists each planned file with its path, description, rule tags and layout, in plan order. */
function plannedSection(plan: GenerationPlan): string {
  if (plan.length === 0) {
    return 'No files are planned.';
  }
  return plan
    .map((entry, index) =>
      [
        `File ${index + 1} of ${plan.length}: ${entry.path}`,
        `Description: ${oneLine(entry.description) || '(none)'}`,
        `Rule tags: ${entry.ruleTags.length === 0 ? '(none)' : entry.ruleTags.join(', ')}`,
        'Layout:',
        entry.layout,
      ].join('\n'),
    )
    .join('\n\n');
}

/** The findings of the previous reply, one per line in the order given. */
function findingsSection(findings: readonly string[]): string {
  return [FINDINGS_HEADING, ...findings.map((finding) => `- ${oneLine(finding)}`)].join('\n');
}

/**
 * Builds the generation prompt: the fixed task, the brief and the process as
 * JSON, each planned file in plan order, and, for a retry, the findings of the
 * previous reply. A pure function of its inputs: it reads no environment,
 * clock or file, so the same input gives the same text.
 */
export function buildGenerationPrompt(
  config: ProjectConfig,
  plan: GenerationPlan,
  findings?: readonly string[],
): string {
  const json = JSON.stringify(pickProject(config), null, 2);
  const parts = [GENERATION_INSTRUCTIONS, '', BRIEF_HEADING, json, '', PLAN_HEADING, plannedSection(plan)];
  if (findings !== undefined && findings.length > 0) {
    parts.push('', findingsSection(findings));
  }
  return parts.join('\n');
}
