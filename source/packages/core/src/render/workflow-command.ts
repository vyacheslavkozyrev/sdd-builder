import type { GeneratedFile, ProjectConfig, Workflow } from '../model.js';
import { DEFAULT_STEP_CATALOG } from '../catalog.js';
import { TemplateError } from '../errors.js';
import { selectSteps } from '../selection.js';
import type { TemplateSource } from '../template-source.js';
import { renderTemplate } from './template.js';
import { projectValues } from './placeholders.js';
import { renderRules } from './rules-text.js';
import { stepFilePath, workflowFilePath } from './paths.js';

/** The template that frames every workflow command. */
export const WORKFLOW_TEMPLATE = 'workflows/workflow.md';

/** "for each task in plan.md", "for each feature in features.md", or "once per project". */
export function scopeText(workflow: Workflow): string {
  if (workflow.scope === 'project') {
    return 'once per project';
  }
  return `for each ${workflow.scope} in ${workflow.iterationSource}`;
}

/** Numbered list of the enabled steps in tab order, each naming its file. */
export function stepsText(config: ProjectConfig, workflow: Workflow): string {
  return selectSteps(workflow, config)
    .map((step, index) => `${index + 1}. ${step.definition.name} (${step.definition.kind}: \`${stepFilePath(step.definition)}\`)`)
    .join('\n');
}

/** Renders `.claude/commands/workflow-<id>.md`, including its gate and branch rules. */
export function renderWorkflowCommand(config: ProjectConfig, workflow: Workflow, templates: TemplateSource): GeneratedFile {
  const text = templates.get(WORKFLOW_TEMPLATE);
  if (text === undefined) {
    throw new TemplateError(WORKFLOW_TEMPLATE, 'missing workflow template');
  }
  const enabled = new Set(selectSteps(workflow, config).map((s) => s.stepId));
  const known = new Set([...DEFAULT_STEP_CATALOG.map((s) => s.id), ...config.customSteps.map((s) => s.id)]);
  const values = {
    ...projectValues(config),
    'workflow.name': workflow.name,
    'workflow.id': workflow.id,
    'workflow.scope': scopeText(workflow),
    'workflow.steps': stepsText(config, workflow),
    'workflow.rules': renderRules(config, workflow),
  };
  const content = renderTemplate(text, { values, scope: { enabled, known }, templatePath: WORKFLOW_TEMPLATE });
  return { path: workflowFilePath(workflow.id), content };
}
