// The public surface of the pipeline module (decision 22). The root of core exports it as the
// namespace `pipeline`. Only the parser, the default pipeline, the structural analysis (F-03), the
// generator entry points (F-04) and the model types are exported.
export { parseProjectConfig } from './parse/index.js';
export { defaultPipeline } from './default.js';
export { analyzeStructure } from './analyze/index.js';
export { analyzeBrief } from './analyze/brief.js';
export type { Finding, ReviewEntry, ReviewResult, Severity } from './analyze/index.js';
export { checkReview } from './analyze/index.js';
export { configProblems } from './generate/refuse.js';
export { planGeneration } from './generate/plan.js';
export { checkReply } from './generate/reply-check.js';
export type {
  AgentBlock,
  Argument,
  Artifact,
  Block,
  ConditionBlock,
  EndBlock,
  Flow,
  Model,
  Pipeline,
  Problem,
  ProjectConfig,
  Route,
  Rule,
  RuleTag,
  Stack,
  StartBlock,
} from './model.js';
