import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };

// The default pipeline as data (architecture.md §11, decision 17). It is imported when the package is built;
// core never reads a file at run time. It is the value of the pipeline object, typed as unknown: it is a
// document like any other input, and the parser checks it.
export const defaultPipeline: unknown = defaultPipelineJson;
