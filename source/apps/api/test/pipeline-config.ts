import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@sddbuilder/core';

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
