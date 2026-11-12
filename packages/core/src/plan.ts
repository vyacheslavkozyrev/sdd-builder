import type { ProjectConfig, StepDefinition, Workflow } from './model.js';
import { generate } from './generate.js';
import { selectSteps, selectWorkflows } from './select.js';
import type { TemplateSource } from './template-source.js';
import { stepFilePath, workflowFilePath } from './render/paths.js';

/** One planned output file: what it is, what it is for and which rule files its block attaches. */
export interface GenerationPlanEntry {
  /** Path relative to the project root, as generate returns it. */
  readonly path: string;
  /** The file's content, as generate rendered it. */
  readonly layout: string;
  /** The owning block's description: a step's description or summary, a workflow's description; empty otherwise. */
  readonly description: string;
  /** The owning step's rule-set tags; empty for every file that is not a step file. */
  readonly ruleTags: readonly string[];
}

/** The plan for a generation: one entry per output file, in the order of the file list. */
export type GenerationPlan = readonly GenerationPlanEntry[];

/**
 * Describes each file `generate` returns, mapping its path back to the step or
 * workflow that owns it. The same configuration and templates give the same plan.
 */
export function planGeneration(config: ProjectConfig, templates: TemplateSource): GenerationPlan {
  const { files } = generate(config, templates);

  const stepsByPath = new Map<string, StepDefinition>();
  const workflowsByPath = new Map<string, Workflow>();
  for (const workflow of selectWorkflows(config)) {
    workflowsByPath.set(workflowFilePath(workflow.id), workflow);
    for (const selected of selectSteps(workflow, config)) {
      stepsByPath.set(stepFilePath(selected.definition), selected.definition);
    }
  }

  return files.map((file): GenerationPlanEntry => {
    const step = stepsByPath.get(file.path);
    if (step) {
      return { path: file.path, layout: file.content, description: step.description || step.summary, ruleTags: [...step.ruleTags] };
    }
    const workflow = workflowsByPath.get(file.path);
    if (workflow) {
      return { path: file.path, layout: file.content, description: workflow.description ?? '', ruleTags: [] };
    }
    return { path: file.path, layout: file.content, description: '', ruleTags: [] };
  });
}
