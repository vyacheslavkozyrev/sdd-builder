// The selection on the Pipeline tab and the properties panel's content (F-11 AC-023, AC-025, AC-026, AC-030, AC-034).
// A pure function: `panelFor` returns the fields of the one selected item, the file it generates and the toolbox list,
// and never changes the pipeline it is given. The selection is one value, so no two items are selected at once
// (AC-030). Nothing selected shows the pipeline's panel (AC-025). No field switches a flow off (decision 34).

import type { pipeline } from '@sddbuilder/core';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;
type Gate = pipeline.Gate;
type Argument = pipeline.Argument;
type Model = pipeline.Model;

// The one item selected on the canvas: the pipeline, a flow by its id, or an arrow by its source flow's id.
export type Selection =
  | { readonly kind: 'pipeline' }
  | { readonly kind: 'flow'; readonly id: string }
  | { readonly kind: 'arrow'; readonly source: string };

export type FieldKey =
  | 'name'
  | 'description'
  | 'arguments'
  | 'model'
  | 'tools'
  | 'ruleTags'
  | 'body'
  | 'label'
  | 'source'
  | 'target'
  | 'gate';

export type FieldValue =
  | string
  | readonly Argument[]
  | readonly string[]
  | Model
  | Gate
  | undefined;

export interface PanelField {
  readonly key: FieldKey;
  readonly label: string;
  readonly value: FieldValue;
}

// The Pipeline toolbox: exactly these three tools, in this order (AC-023). No Start, no End, no switch-off.
export const TOOLBOX = ['Connection', 'Approval', 'Check'] as const;
export type ToolboxTool = (typeof TOOLBOX)[number];

export const PIPELINE_FILE = '.claude/commands/pipeline.md';

export interface PanelContent {
  readonly heading: string;
  readonly fields: readonly PanelField[];
  // The file the item generates (AC-026). An arrow generates no file, so it has none.
  readonly file: string | undefined;
  readonly toolbox: readonly ToolboxTool[];
}

// The panel for the selection. `undefined` is nothing selected, which shows the pipeline's panel (AC-025).
// An unknown flow id, or an arrow that a flow does not have, is a programmer error and throws.
export function panelFor(selection: Selection | undefined, config: Pipeline): PanelContent {
  if (selection === undefined || selection.kind === 'pipeline') {
    return {
      heading: 'Pipeline',
      fields: [
        { key: 'name', label: 'Name', value: config.name },
        { key: 'description', label: 'Description', value: config.description },
        { key: 'arguments', label: 'Arguments', value: config.arguments },
        { key: 'model', label: 'Model', value: config.model },
        { key: 'tools', label: 'Tools', value: config.tools },
        { key: 'ruleTags', label: 'Rule tags', value: config.ruleTags },
        { key: 'body', label: 'Body', value: config.body },
      ],
      file: PIPELINE_FILE,
      toolbox: TOOLBOX,
    };
  }
  if (selection.kind === 'flow') {
    const flow = findFlow(config, selection.id);
    return {
      heading: flow.name,
      fields: [
        { key: 'name', label: 'Name', value: flow.name },
        { key: 'description', label: 'Description', value: flow.description },
        { key: 'arguments', label: 'Arguments', value: flow.arguments },
        { key: 'model', label: 'Model', value: flow.model },
        { key: 'body', label: 'Body', value: flow.body },
      ],
      file: `.claude/commands/${flow.id}.md`,
      toolbox: TOOLBOX,
    };
  }
  const source = findFlow(config, selection.source);
  const link = source.connectedTo;
  if (link === undefined) {
    throw new Error(`The flow ${selection.source} has no arrow.`);
  }
  const fields: PanelField[] = [
    { key: 'label', label: 'Artifact label', value: link.label },
    { key: 'source', label: 'Source', value: source.id },
    { key: 'target', label: 'Target', value: link.to },
  ];
  if (link.gate !== undefined) {
    fields.push({ key: 'gate', label: 'Gate', value: link.gate });
  }
  return { heading: 'Connection', fields, file: undefined, toolbox: TOOLBOX };
}

function findFlow(config: Pipeline, id: string): Flow {
  const flow = config.flows.find((candidate) => candidate.id === id);
  if (flow === undefined) {
    throw new Error(`The pipeline has no flow with the id ${id}.`);
  }
  return flow;
}
