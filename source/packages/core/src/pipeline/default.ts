import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };

// The default pipeline is data. The file is read at build time by the import above;
// core never reads files at run time (architecture.md §6 decision 17).
export const defaultPipeline = defaultPipelineJson;
