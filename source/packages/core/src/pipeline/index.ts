// The public surface of the pipeline module (decision 22). The root of core exports it as the
// namespace `pipeline`. Only the parser, the default pipeline and the model types are exported.
export { parseProjectConfig } from './parse/index.js';
export { defaultPipeline } from './default.js';
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
