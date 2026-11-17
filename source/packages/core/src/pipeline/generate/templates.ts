// The shape of the template input of the generator (source/templates/README.md). The texts are data: they are
// read by the caller (source/apps/api, F-07) and passed in, so core never reads a file. This module holds the
// shape only, not the template text.

// A layout is a text with placeholders and the `##` headings a Markdown output must carry.
export interface Layout {
  readonly text: string;
  readonly headings: readonly string[];
}

// A base file is a layout written at a fixed output path, such as `CLAUDE.md`.
export interface BaseFile extends Layout {
  readonly path: string;
}

// The template input: the base files in their output order, and the layouts of the Claude Code files that
// are built from the config (the pipeline command, a flow's command, an agent and a rule).
export interface Templates {
  readonly base: readonly BaseFile[];
  readonly pipelineCommand: Layout;
  readonly command: Layout;
  readonly agent: Layout;
  readonly rule: Layout;
}
