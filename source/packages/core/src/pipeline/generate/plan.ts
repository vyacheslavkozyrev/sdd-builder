import type { Finding } from '../analyze/index.js';
import type { ProjectConfig, Rule, RuleTag } from '../model.js';
import { listFiles, type ListedFile } from './file-list.js';
import { renderLayout } from './render.js';
import { configProblems } from './refuse.js';
import type { GenerationTemplates } from './templates.js';
import { agentValues } from './values-agent.js';
import { baseValues } from './values-base.js';
import { flowValues } from './values-flow.js';
import { pipelineValues } from './values-pipeline.js';
import { ruleValues } from './values-rule.js';
import { ruleFileOf } from './values-text.js';

// The plan of a generation (F-04, AC-005, AC-007 to AC-011, AC-036). Each planned file carries its path, its layout
// rendered with its values, the description of its flow or Agent block (empty when it has none) and the rule tags of
// that flow or Agent block (empty when it has none), each as the file name of its rule (F-16, AC-029). The files come in
// the order of the file list. The plan is a pure function of the config and the templates: no date, time or random value
// is added, and neither input is changed.
// A config with a blocker (AC-019 to AC-023) is refused before anything is planned: no file is listed and no layout is
// rendered, and the result carries the blockers of the analysis in its order (AC-020).

// A rule tag of a planned file: the file name of its rule, without the `.md`, and the rule's index (F-16, AC-029).
export interface PlannedRuleTag {
  readonly ruleFile: string;
  readonly index: number;
}

export interface PlannedFile {
  readonly path: string;
  readonly layout: string;
  readonly description: string;
  readonly ruleTags: readonly PlannedRuleTag[];
}

export interface GeneratedPlan {
  readonly files: readonly PlannedFile[];
}

export type PlanResult =
  | ({ readonly ok: true } & GeneratedPlan)
  | { readonly ok: false; readonly problems: readonly Finding[] };

export function planGeneration(config: ProjectConfig, templates: GenerationTemplates): PlanResult {
  const problems = configProblems(config);
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, files: listFiles(config, templates).map((file) => planFile(file, config, templates)) };
}

function planFile(file: ListedFile, config: ProjectConfig, templates: GenerationTemplates): PlannedFile {
  const source = file.source;
  switch (source.kind) {
    case 'base':
      return planned(file.path, renderLayout(source.layout, baseValues(config), file.path), '', []);
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
        renderLayout(templates.flow, flowValues(source.flow, config.rules), file.path),
        source.flow.description ?? '',
        plannedTags(source.flow.ruleTags, config.rules),
      );
    case 'agent':
      return planned(
        file.path,
        renderLayout(templates.agent, agentValues(source.block, config.rules), file.path),
        source.block.description,
        plannedTags(source.block.ruleTags, config.rules),
      );
    case 'rule':
      return planned(file.path, renderLayout(templates.rule, ruleValues(source.rule), file.path), '', []);
  }
}

// The rule tags of a planned file, each with the file name of the rule it names.
function plannedTags(tags: readonly RuleTag[] | undefined, rules: readonly Rule[]): PlannedRuleTag[] {
  return (tags ?? []).map((tag) => ({ ruleFile: ruleFileOf(tag, rules), index: tag.index }));
}

// A planned file with its own copy of the rule tags, so the plan never shares an array with the config.
function planned(path: string, layout: string, description: string, ruleTags: readonly PlannedRuleTag[]): PlannedFile {
  return { path, layout, description, ruleTags: ruleTags.map((tag) => ({ ...tag })) };
}
