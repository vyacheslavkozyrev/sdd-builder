import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipeline, type ListableTemplateSource } from '@sddbuilder/core';
import { loadTemplates } from '../src/templates.js';

/** The repository's templates/ directory, found from this file's location. */
const REPO_TEMPLATES = fileURLToPath(new URL('../../../templates', import.meta.url));

/** The default pipeline (templates/pipeline/default.json), parsed through the pipeline reader once per test file. */
const DEFAULT_PIPELINE: pipeline.ProjectConfig = parseDefault();

function parseDefault(): pipeline.ProjectConfig {
  const json: unknown = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../templates/pipeline/default.json', import.meta.url)), 'utf8'),
  );
  const parsed = pipeline.parsePipelineConfig(json);
  if (!parsed.ok) {
    throw new Error('the default pipeline must parse');
  }
  return parsed.config;
}

/** A fresh copy of the default pipeline config, with the given fields replaced. Each call returns new objects. */
export function pipelineConfig(overrides: Partial<pipeline.ProjectConfig> = {}): pipeline.ProjectConfig {
  return { ...structuredClone(DEFAULT_PIPELINE), ...overrides };
}

/** A pipeline config with `count` rules, so only the rule cap is in play. */
export function withPipelineRules(count: number): pipeline.ProjectConfig {
  const rules = Array.from({ length: count }, (_, i) => ({
    id: `rule-${i}`,
    title: `Rule ${i}`,
    text: `Rule text ${i}.`,
  }));
  return pipelineConfig({ rules });
}

let repoTemplates: ListableTemplateSource | undefined;

/** The repository's Claude Code templates (templates/), loaded once per test file, for the pipeline plan. */
export function pipelineTemplates(): ListableTemplateSource {
  repoTemplates ??= loadTemplates(REPO_TEMPLATES);
  return repoTemplates;
}

/** A pipeline config the structural rules refuse: the first flow names a rule tag that no rule has. */
export function refusedPipelineConfig(): pipeline.ProjectConfig {
  const config = pipelineConfig();
  const flow = config.pipeline.blocks.find((block): block is pipeline.FlowBlock => block.kind === 'flow');
  if (flow === undefined) {
    throw new Error('the default pipeline must hold a flow');
  }
  flow.ruleTags = ['no-such-rule'];
  return config;
}
