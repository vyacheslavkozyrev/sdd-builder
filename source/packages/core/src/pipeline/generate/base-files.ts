// Base files (F-02 AC-018, AC-022): `CLAUDE.md`, the process document and the spec template files, rendered
// through the renderer with values from the config. Pure: the templates come from a TemplateSource and the files are
// returned, never written. The process document is text only: its process list is built here from the selection, in order,
// and no Mermaid placeholder is filled.
import type { GeneratedFile } from '../../model.js';
import type { ListableTemplateSource } from '../../template-source.js';
import type { ChildBlock, PipelineBlock, ProjectConfig } from '../model.js';
import { enabledIds, pipelineValues, renderTemplates, type PipelineValues } from './render.js';
import { selectBlocks } from './select.js';

const CLAUDE_SOURCE = 'base/CLAUDE.md';
const PROCESS_NAME = 'process';
const PROCESS_SOURCE = `base/${PROCESS_NAME}.md`;
const SPEC_TEMPLATE_SOURCE = 'base/spec-template/';
const SPEC_TEMPLATE_TARGET = 'spec/specifications/F-00-template/';

/** One line of the process list for a block of a child flow. */
function describeChild(block: ChildBlock): string {
  switch (block.kind) {
    case 'start':
      return `Start (${block.id})`;
    case 'agent':
      return `Agent ${block.name} (${block.id})`;
    case 'condition':
      return `Check ${block.checkType} (${block.id})`;
    case 'connection':
      return `Connection from ${block.from} to ${block.to}, handing over ${block.artifact} (${block.id})`;
    case 'end':
      return `End, ${block.outcome} (${block.id})`;
  }
}

/** One line of the process list for a block of the pipeline. A flow's own blocks follow its line. */
function describePipelineBlock(block: PipelineBlock): string {
  switch (block.kind) {
    case 'start':
      return `Start of the pipeline (${block.id})`;
    case 'condition':
      return `Gate ${block.checkType} on connection ${block.onConnection} (${block.id})`;
    case 'connection':
      return `Connection from ${block.from} to ${block.to}, handing over ${block.artifact} (${block.id})`;
    case 'end':
      return `End of the pipeline, ${block.outcome} (${block.id})`;
    case 'flow':
      return `Flow ${block.name} (${block.id}), with its blocks in order:`;
  }
}

/**
 * The process as text: each enabled pipeline block in pipeline order, and under each enabled flow its enabled blocks in
 * order. A disabled block or flow is not listed. Deterministic: the same config gives the same text.
 */
export function processList(config: ProjectConfig): string {
  const selection = selectBlocks(config);
  const lines: string[] = [];
  for (const block of selection.pipeline) {
    lines.push(`- ${describePipelineBlock(block)}`);
    if (block.kind !== 'flow') continue;
    const entry = selection.flows.find((selected) => selected.flow.id === block.id);
    for (const child of entry?.blocks ?? []) lines.push(`  - ${describeChild(child)}`);
  }
  return lines.join('\n');
}

/** The output path of a base template path: the spec templates move to the F-00 template folder. */
function outputPath(source: string): string {
  if (source === CLAUDE_SOURCE) return 'CLAUDE.md';
  if (source === PROCESS_SOURCE) return `spec/documents/${PROCESS_NAME}.md`;
  return SPEC_TEMPLATE_TARGET + source.slice(SPEC_TEMPLATE_SOURCE.length);
}

/**
 * Renders `CLAUDE.md`, the process document and every spec template file the source holds under
 * `base/spec-template/`, sorted by output path (F-02 AC-018, AC-022). A missing base template fails with its path
 * named, and no files are returned (AC-021, through the renderer).
 */
export function renderBaseFiles(config: ProjectConfig, templates: ListableTemplateSource): GeneratedFile[] {
  const specSources = templates
    .paths()
    .filter((path) => path.startsWith(SPEC_TEMPLATE_SOURCE))
    .sort();
  const values: PipelineValues = { ...pipelineValues(config), processList: processList(config) };
  const rendered = renderTemplates([CLAUDE_SOURCE, PROCESS_SOURCE, ...specSources], {
    templates,
    values,
    enabled: enabledIds(config),
  });
  return rendered
    .map(({ path, text }) => ({ path: outputPath(path), content: text }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
