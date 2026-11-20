import type { ProjectConfig, RuleTag } from '../model.js';
import { listFiles, type ListedFile } from './file-list.js';
import { renderLayout } from './render.js';
import type { GenerationTemplates } from './templates.js';
import { agentValues } from './values-agent.js';
import { flowValues } from './values-flow.js';
import { pipelineValues } from './values-pipeline.js';
import { ruleValues } from './values-rule.js';

// The plan of a generation (F-04, AC-005, AC-007 to AC-011, AC-036). Each planned file carries its path, its layout
// rendered with its values, the description of its flow or Agent block (empty when it has none) and the rule tags of
// that flow or Agent block (empty when it has none). The files come in the order of the file list. The plan is a pure
// function of the config and the templates: no date, time or random value is added, and neither input is changed.

export interface PlannedFile {
  readonly path: string;
  readonly layout: string;
  readonly description: string;
  readonly ruleTags: readonly RuleTag[];
}

export interface GeneratedPlan {
  readonly files: readonly PlannedFile[];
}

export function planGeneration(config: ProjectConfig, templates: GenerationTemplates): GeneratedPlan {
  return { files: listFiles(config, templates).map((file) => planFile(file, config, templates)) };
}

function planFile(file: ListedFile, config: ProjectConfig, templates: GenerationTemplates): PlannedFile {
  const source = file.source;
  switch (source.kind) {
    case 'base':
      return planned(file.path, renderLayout(source.layout, {}, file.path), '', []);
    case 'pipeline':
      return planned(
        file.path,
        renderLayout(templates.pipeline, pipelineValues(config.pipeline), file.path),
        '',
        [],
      );
    case 'flow':
      return planned(
        file.path,
        renderLayout(templates.flow, flowValues(source.flow), file.path),
        source.flow.description ?? '',
        source.flow.ruleTags ?? [],
      );
    case 'agent':
      return planned(
        file.path,
        renderLayout(templates.agent, agentValues(source.block), file.path),
        source.block.description,
        source.block.ruleTags ?? [],
      );
    case 'rule':
      return planned(file.path, renderLayout(templates.rule, ruleValues(source.rule), file.path), '', []);
  }
}

// A planned file with its own copy of the rule tags, so the plan never shares an array with the config.
function planned(path: string, layout: string, description: string, ruleTags: readonly RuleTag[]): PlannedFile {
  return { path, layout, description, ruleTags: ruleTags.map((tag) => ({ ...tag })) };
}
