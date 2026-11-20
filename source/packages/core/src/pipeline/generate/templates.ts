// The templates the generator is given (F-04, AC-035). They are data: the caller reads them from
// `source/templates` and passes them in, so core never reads a file. Each layout holds `{{name}}`
// placeholders, rendered by `renderLayout`.
export interface BaseTemplate {
  readonly path: string;
  readonly layout: string;
}

export interface GenerationTemplates {
  // The base files in output order. Their paths come from `source/templates/base/manifest.json`.
  readonly base: readonly BaseTemplate[];
  // One layout text each: the pipeline command, a flow command, an agent file and a rule file.
  readonly pipeline: string;
  readonly flow: string;
  readonly agent: string;
  readonly rule: string;
}
