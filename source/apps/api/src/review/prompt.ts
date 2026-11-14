import type {
  AnalysisFinding,
  ArchitectureSpec,
  Condition,
  Gate,
  MapConnection,
  ModuleSpec,
  ProjectConfig,
  RouteTarget,
  StepDefinition,
  TechStack,
  Workflow,
  WorkflowStep,
} from '@sddbuilder/core';

/** The fixed review task and reply format. Only the configuration follows it. */
const REVIEW_INSTRUCTIONS = [
  'You are reviewing a project brief and the spec-driven development process a user designed for it.',
  'Find:',
  '- gaps in the idea: what the brief leaves unsaid that building the product would need;',
  '- contradictory rules, and rules that no test or review could verify;',
  '- test rules that name tools outside the stack (the stack section lists what is in use);',
  '- suggested steps that the process lacks.',
  'This is advice only. Do not change the brief or the process. The structure is checked elsewhere; do not repeat structural problems.',
  'Reply with ONLY a JSON array of objects, with no prose and no code fence. Each object has exactly these fields:',
  "- severity: one of 'info', 'warning' or 'blocker';",
  '- subject: a string naming the part of the brief or the process the finding is about;',
  '- message: a string stating the finding and what to do about it.',
  'If there is nothing to report, reply with [].',
].join('\n');

const BRIEF_HEADING = 'Brief and process (JSON):';

/** Collapses line breaks and other white space, so text taken from the brief cannot start a new list line. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/**
 * The structural findings the review must not repeat, one per line in the order given.
 * Returns an empty string when there are none, so no list section is emitted.
 */
function structuralSection(structural: readonly AnalysisFinding[]): string {
  if (structural.length === 0) {
    return '';
  }
  const lines = structural.map(
    (finding) => `- [${finding.severity}] ${oneLine(finding.subject)}: ${oneLine(finding.message)}`,
  );
  return [
    'The structural check has already found these problems. Do not repeat any of them, and do not restate one in other words: a finding about the same problem is a repeat.',
    ...lines,
  ].join('\n');
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
export function pickProject(config: ProjectConfig) {
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

/**
 * Builds the review prompt: the fixed review task, the structural findings
 * the review must not repeat (when there are any), then the brief and the
 * process as JSON. A pure function of its inputs: it reads no environment,
 * clock or file, so the same configuration and findings give the same text.
 */
export function buildReviewPrompt(config: ProjectConfig, structural: readonly AnalysisFinding[]): string {
  const json = JSON.stringify(pickProject(config), null, 2);
  const section = structuralSection(structural);
  const parts = section === '' ? [REVIEW_INSTRUCTIONS] : [REVIEW_INSTRUCTIONS, '', section];
  return [...parts, '', BRIEF_HEADING, json].join('\n');
}
