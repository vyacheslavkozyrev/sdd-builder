// The default pipeline, as a parsed ProjectConfig. The data is templates/pipeline/default.json,
// imported at build time (architecture.md §5 and decision 17). The data is code-controlled, so a
// refusal here is a programmer error, not a user error.
import defaultJson from '../../../../templates/pipeline/default.json' with { type: 'json' };
import type { ProjectConfig } from './model.js';
import { parsePipelineConfig } from './parse.js';

const parsed = parsePipelineConfig(defaultJson);
if (!parsed.ok) {
  const details = parsed.problems.map((problem) => `${problem.path || '(root)'}: ${problem.message}`).join('; ');
  throw new Error(`templates/pipeline/default.json is not a valid pipeline: ${details}`);
}

/** The default pipeline (building-blocks.md §4) as a valid ProjectConfig. */
export const defaultProjectConfig: ProjectConfig = parsed.config;
