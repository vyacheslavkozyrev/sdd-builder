import type { Condition, Gate, ProjectConfig, RouteTarget, Workflow } from '../model.js';
import { selectConditions, selectSteps } from '../selection.js';

/** A gate as a condition that must hold, e.g. "the checks pass". */
function gateText(gate: Gate, subject: string): string {
  switch (gate.type) {
    case 'approval':
      return `${subject} is approved by the user`;
    case 'checks':
      return 'the checks pass';
    case 'review':
      return 'the review reports no blocker or warning';
    case 'diff-size':
      return gate.threshold === undefined ? 'the staged change is within its size limit' : `the staged change is at most ${gate.threshold} lines`;
  }
}

/**
 * Gate and branch rules for one workflow's command (building-blocks.md §3).
 * Gates on map connections into this workflow come first, as preconditions.
 * Conditions after steps follow in step order. Empty when there are no rules.
 */
export function renderRules(config: ProjectConfig, workflow: Workflow): string {
  const steps = selectSteps(workflow, config);
  const numberOf = (stepId: string): number => steps.findIndex((s) => s.stepId === stepId) + 1;
  const nameOf = (stepId: string): string => steps.find((s) => s.stepId === stepId)?.definition.name ?? stepId;
  const workflowName = (id: string): string => config.workflows.find((w) => w.id === id)?.name ?? id;

  const rules: string[] = [];
  for (const connection of config.connections) {
    if (connection.to === workflow.id && connection.gate) {
      rules.push(`Precondition: unless ${gateText(connection.gate, `the output of ${workflowName(connection.from)}`)}, stop and report.`);
    }
  }

  const active = [...selectConditions(workflow)].sort((a, b) => numberOf(a.afterStepId) - numberOf(b.afterStepId));
  for (const condition of active) {
    rules.push(conditionRule(condition, numberOf, nameOf));
  }
  return rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n');
}

function conditionRule(condition: Condition, numberOf: (id: string) => number, nameOf: (id: string) => string): string {
  const after = `After step ${numberOf(condition.afterStepId)} (${nameOf(condition.afterStepId)})`;
  const subject = `the output of step ${numberOf(condition.afterStepId)}`;
  const unless = `unless ${gateText(condition.gate, subject)}`;
  return `${after}: ${unless}, ${failAction(condition, numberOf, nameOf)}. ${passAction(condition.pass, numberOf, nameOf)}`;
}

function failAction(condition: Condition, numberOf: (id: string) => number, nameOf: (id: string) => string): string {
  const fail = condition.fail;
  if (fail === undefined || fail.kind === 'stop') {
    return 'stop and report';
  }
  if (fail.kind === 'next') {
    return 'continue to the next step';
  }
  const target = `go back to step ${numberOf(fail.stepId)} (${nameOf(fail.stepId)})`;
  if (condition.roundLimit === undefined) {
    return `${target}, retrying until it passes (no limit set)`;
  }
  return `${target}, retrying at most ${condition.roundLimit} times; if the limit is reached, stop and report`;
}

function passAction(pass: RouteTarget | undefined, numberOf: (id: string) => number, nameOf: (id: string) => string): string {
  if (pass === undefined || pass.kind === 'next') {
    return 'Otherwise continue.';
  }
  if (pass.kind === 'stop') {
    return 'Otherwise stop.';
  }
  return `Otherwise go to step ${numberOf(pass.stepId)} (${nameOf(pass.stepId)}).`;
}
