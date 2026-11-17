// The public surface of the pipeline module (architecture.md §6 decisions 19 and 22). The root of
// core exposes this module as the namespace `pipeline` and nothing else from it.

export * from './model.js';
export { parseProjectConfig } from './parse/project.js';
export { defaultPipeline } from './default.js';
