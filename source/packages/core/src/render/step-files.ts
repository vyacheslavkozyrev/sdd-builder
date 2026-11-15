import type { GeneratedFile, ProjectConfig, StepDefinition } from '../model.js';
import { DEFAULT_STEP_CATALOG } from '../catalog.js';
import { TemplateError } from '../errors.js';
import { selectWorkflows, selectSteps } from '../selection.js';
import type { TemplateSource } from '../template-source.js';
import { renderTemplate } from './template.js';
import { projectValues } from './placeholders.js';
import { stepFilePath } from './paths.js';
import type { StepScope } from './conditionals.js';

/** The template file a catalog step is rendered from, by kind. */
function templateFileName(step: StepDefinition): string {
  return `${step.kind}.md`;
}

/**
 * Files for every enabled step, once each, plus the rule files its tags reference.
 * Catalog steps are rendered from templates/steps/<id>/; custom steps use their body.
 * A missing step template or rule file is refused, naming the step and the path.
 */
export function renderStepFiles(config: ProjectConfig, templates: TemplateSource): GeneratedFile[] {
  const workflows = selectWorkflows(config);
  const steps = new Map<string, StepDefinition>();
  for (const workflow of workflows) {
    for (const selected of selectSteps(workflow, config)) {
      steps.set(selected.stepId, selected.definition);
    }
  }

  const scope: StepScope = {
    enabled: new Set(steps.keys()),
    known: new Set([...DEFAULT_STEP_CATALOG.map((s) => s.id), ...config.customSteps.map((s) => s.id)]),
  };
  const values = projectValues(config);
  const files = new Map<string, GeneratedFile>();

  for (const step of steps.values()) {
    const templatePath = `steps/${step.id}/${templateFileName(step)}`;
    let body: string;
    if (step.origin === 'custom') {
      body = step.body ?? '';
    } else {
      const text = templates.get(templatePath);
      if (text === undefined) {
        throw new TemplateError(templatePath, `missing template for step "${step.id}"`);
      }
      body = renderTemplate(text, { values, scope, templatePath });
    }

    const tags = [...new Set(step.ruleTags)];
    const contextLines = tags.map((tag) => `- .claude/rules/${tag}`);
    const content = tags.length === 0 ? body : `${body.replace(/\n*$/, '')}\n\n## Context rules\n${contextLines.join('\n')}\n`;
    files.set(stepFilePath(step), { path: stepFilePath(step), content });

    for (const tag of tags) {
      const rulePath = `rules/${tag}`;
      const text = templates.get(rulePath);
      if (text === undefined) {
        throw new TemplateError(`steps/${step.id}`, `rule file "${tag}" is not in the templates`);
      }
      files.set(`.claude/rules/${tag}`, { path: `.claude/rules/${tag}`, content: renderTemplate(text, { values, scope, templatePath: rulePath }) });
    }
  }
  return [...files.values()];
}
