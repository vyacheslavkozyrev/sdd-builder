import type { Condition, ProjectConfig, RouteTarget, Workflow } from '../model.js';
import { selectConditions, selectSteps, selectWorkflows } from '../select.js';

/** Letters, digits and underscores only (AC-030). */
function clean(text: string): string {
  return text.replace(/[^A-Za-z0-9_]/g, '_');
}

/** A Mermaid id: parts joined by a single underscore, each cleaned. */
export function mermaidId(...parts: string[]): string {
  return parts.map(clean).join('_');
}

/** The subgraph id of a workflow. */
function workflowNode(id: string): string {
  return mermaidId('wf', id);
}

/** A node inside a workflow: the workflow id, a double underscore, then the cleaned name. */
function innerNode(workflowId: string, name: string): string {
  return `${workflowNode(workflowId)}__${clean(name)}`;
}

/** Labels are quoted; double quotes inside a label become single quotes. */
function label(text: string): string {
  return `"${text.replace(/"/g, "'")}"`;
}

/**
 * Mermaid flowchart of the enabled map (AC-028): one subgraph per enabled
 * workflow with its steps, conditions and branch edges (AC-029), and the
 * map connections between the subgraphs, with gates as decision nodes.
 */
export function renderMermaid(config: ProjectConfig): string {
  const lines: string[] = ['flowchart TD'];
  const workflows = selectWorkflows(config);

  for (const workflow of workflows) {
    lines.push(...renderWorkflow(config, workflow));
  }

  for (const connection of config.connections) {
    const from = workflows.find((w) => w.id === connection.from);
    const to = workflows.find((w) => w.id === connection.to);
    if (!from || !to) {
      continue;
    }
    const artifact = connection.artifact ? `|${label(connection.artifact)}|` : '';
    if (connection.gate) {
      const gateId = mermaidId('gate', connection.id);
      lines.push(`  ${gateId}{${label(`gate: ${connection.gate.type}`)}}`);
      lines.push(`  ${workflowNode(from.id)} ${artifact ? `-->${artifact}` : '-->'} ${gateId}`);
      lines.push(`  ${gateId} -->|${label('pass')}| ${workflowNode(to.id)}`);
    } else {
      lines.push(`  ${workflowNode(from.id)} ${artifact ? `-->${artifact}` : '-->'} ${workflowNode(to.id)}`);
    }
  }
  return lines.join('\n');
}

function renderWorkflow(config: ProjectConfig, workflow: Workflow): string[] {
  const steps = selectSteps(workflow, config);
  const conditions = selectConditions(workflow);
  const subgraph = workflowNode(workflow.id);
  const stepId = (id: string): string => innerNode(workflow.id, id);
  const conditionId = (condition: Condition): string => innerNode(workflow.id, condition.id);
  const stopId = innerNode(workflow.id, 'stop');
  const endId = innerNode(workflow.id, 'end');
  const numberOf = (id: string): number => steps.findIndex((s) => s.stepId === id) + 1;
  const nameOf = (id: string): string => steps.find((s) => s.stepId === id)?.definition.name ?? id;

  const lines = [`  subgraph ${subgraph}[${label(`${workflow.name} (${workflow.scope})`)}]`];
  for (const step of steps) {
    lines.push(`    ${stepId(step.stepId)}[${label(step.definition.name)}]`);
  }
  for (const condition of conditions) {
    lines.push(`    ${conditionId(condition)}{${label(`${condition.gate.type}`)}}`);
  }
  lines.push(`    ${stopId}(${label('stop')})`);
  lines.push(`    ${endId}(${label('end')})`);

  for (let i = 0; i < steps.length; i++) {
    const current = steps[i];
    if (!current) {
      continue;
    }
    const next = steps[i + 1];
    const nextTarget = next ? stepId(next.stepId) : endId;
    const condition = conditions.find((c) => c.afterStepId === current.stepId);
    if (condition) {
      lines.push(`    ${stepId(current.stepId)} --> ${conditionId(condition)}`);
      lines.push(`    ${conditionId(condition)} -->|${label('pass')}| ${routeId(condition.pass, nextTarget, workflow.id, stepId, endId)}`);
      lines.push(`    ${conditionId(condition)} -->|${label(failText(condition, numberOf, nameOf))}| ${failTarget(condition, workflow.id, stepId, stopId)}`);
    } else {
      lines.push(`    ${stepId(current.stepId)} --> ${nextTarget}`);
    }
  }
  lines.push('  end');
  return lines;
}

function routeId(route: RouteTarget | undefined, fallback: string, workflowId: string, stepId: (id: string) => string, endId: string): string {
  if (route === undefined || route.kind === 'next') {
    return fallback;
  }
  if (route.kind === 'stop') {
    return innerNode(workflowId, 'stop');
  }
  return stepId(route.stepId) || endId;
}

function failTarget(condition: Condition, workflowId: string, stepId: (id: string) => string, stopId: string): string {
  const fail = condition.fail;
  if (fail === undefined || fail.kind === 'stop') {
    return stopId;
  }
  if (fail.kind === 'next') {
    return stopId;
  }
  return fail.kind === 'step' ? stepId(fail.stepId) : innerNode(workflowId, 'stop');
}

/** Edge label for a fail output, with its round limit or "no limit set" (AC-029). */
function failText(condition: Condition, numberOf: (id: string) => number, nameOf: (id: string) => string): string {
  const fail = condition.fail;
  if (fail === undefined || fail.kind === 'stop') {
    return 'fail: stop';
  }
  if (fail.kind === 'next') {
    return 'fail: continue';
  }
  const limit = condition.roundLimit === undefined ? 'no limit set' : `limit ${condition.roundLimit}`;
  return `fail: back to step ${numberOf(fail.stepId)} ${nameOf(fail.stepId)}, ${limit}`;
}
