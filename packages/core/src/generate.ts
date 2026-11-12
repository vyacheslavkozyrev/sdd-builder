import type { GeneratedFile, GenerationResult, ProjectConfig } from './model.js';
import { assertValidConfig } from './validate/index.js';
import { GenerationError, TemplateError } from './errors.js';
import type { TemplateSource } from './template-source.js';
import { DEFAULT_STEP_CATALOG } from './catalog.js';
import { selectSteps, selectWorkflows } from './select.js';
import { finishFileList } from './file-list.js';
import { renderMermaid } from './render/mermaid.js';
import { projectValues } from './render/placeholders.js';
import { renderTemplate } from './render/template.js';
import type { StepScope } from './render/conditionals.js';
import { renderWorkflowCommand } from './render/workflow-command.js';
import { renderStepFiles } from './render/step-files.js';

/** Base templates and the paths they produce. */
export const BASE_FILES: readonly { template: string; path: string }[] = [
  { template: 'base/CLAUDE.md', path: 'CLAUDE.md' },
  { template: 'base/process.md', path: 'spec/documents/process.md' },
  { template: 'base/spec-template/stories.md', path: 'spec/specifications/F-00-template/stories.md' },
  { template: 'base/spec-template/plan.md', path: 'spec/specifications/F-00-template/plan.md' },
  { template: 'base/spec-template/progress.md', path: 'spec/specifications/F-00-template/progress.md' },
  { template: 'base/task-check.sh', path: 'scripts/task-check.sh' },
];

/** Every enabled step of every enabled workflow, with the catalog and custom ids that exist. */
function scopeFor(config: ProjectConfig): StepScope {
  const enabled = new Set<string>();
  for (const workflow of selectWorkflows(config)) {
    for (const step of selectSteps(workflow, config)) {
      enabled.add(step.stepId);
    }
  }
  const known = new Set([...DEFAULT_STEP_CATALOG.map((s) => s.id), ...config.customSteps.map((s) => s.id)]);
  return { enabled, known };
}

/**
 * Generates the project files from a configuration and its templates.
 * A configuration that breaks the structural rules is refused with every
 * problem listed (InvalidConfigError). Template problems are collected
 * across the outputs and reported together (GenerationError). The result
 * is deterministic for the same input.
 */
export function generate(config: ProjectConfig, templates: TemplateSource): GenerationResult {
  assertValidConfig(config);

  const problems: string[] = [];
  const files: GeneratedFile[] = [];
  const scope = scopeFor(config);
  const values = {
    ...projectValues(config),
    'process.diagram': `\`\`\`mermaid\n${renderMermaid(config)}\n\`\`\``,
  };

  for (const base of BASE_FILES) {
    const text = templates.get(base.template);
    if (text === undefined) {
      problems.push(`${base.template}: missing base template`);
      continue;
    }
    try {
      files.push({ path: base.path, content: renderTemplate(text, { values, scope, templatePath: base.template }) });
    } catch (error) {
      problems.push(messageOf(error));
    }
  }

  for (const workflow of selectWorkflows(config)) {
    try {
      files.push(renderWorkflowCommand(config, workflow, templates));
    } catch (error) {
      problems.push(messageOf(error));
    }
  }

  try {
    files.push(...renderStepFiles(config, templates));
  } catch (error) {
    problems.push(messageOf(error));
  }

  if (problems.length > 0) {
    throw new GenerationError(problems);
  }
  return { files: finishFileList(files), warnings: [] };
}

function messageOf(error: unknown): string {
  if (error instanceof TemplateError) {
    return error.message;
  }
  throw error;
}
