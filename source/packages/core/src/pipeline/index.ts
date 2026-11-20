// The public surface of the pipeline module (decision 22). The root of core exports it as the
// namespace `pipeline`. Only the parser, the default pipeline, the structural analysis (F-03) and the
// model types are exported.
export { parseProjectConfig } from './parse/index.js';
export { defaultPipeline } from './default.js';
export { analyzeStructure } from './analyze/index.js';
export type { Finding, Severity } from './analyze/index.js';
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
