// The public surface of the pipeline module (architecture.md §6 decisions 19 and 22). The root of
// core exposes this module as the namespace `pipeline` and nothing else from it.

export * from './model.js';
export { parseProjectConfig } from './parse/project.js';
export { defaultPipeline } from './default.js';
export { analyzeStructure } from './analyze/index.js';
export type { Finding, Severity } from './analyze/index.js';
export { configProblems } from './generate/problems.js';
export { planGeneration } from './generate/plan.js';
export { checkReply } from './generate/reply-check.js';
export { GenerationError } from './generate/errors.js';
