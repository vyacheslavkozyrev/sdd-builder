import type { Flow, Pipeline } from '../model.js';
import { describeArgument, inlineText, linesOf } from './values-text.js';

// The values of the pipeline command layout (F-04, AC-017). `pipelineName` and `pipelineDescription` are inline;
// `pipelineArguments` is one line per argument; `pipelineFlows` is one numbered line per flow, in pipeline order, with
// its id, its description when it has one, and whether the process stops for a person at the end of the flow. A flow
// is listed once and its id is not written as a step. `pipelineModel` and `pipelineTools` are the optional frontmatter
// lines and `pipelineBody` the body paragraph (AC-039, decision 26); each starts with its own line break and is ''
// when the pipeline has no such entry. A tool name is inline text, so a line break in it cannot add a frontmatter
// line. The values are a pure function of the pipeline.
export function pipelineValues(pipeline: Pipeline): Record<string, string> {
  return {
    pipelineName: inlineText(pipeline.name),
    pipelineDescription: inlineText(pipeline.description),
    pipelineModel: pipeline.model === undefined ? '' : `\nmodel: ${pipeline.model}`,
    pipelineTools:
      pipeline.tools === undefined || pipeline.tools.length === 0
        ? ''
        : `\ntools: ${pipeline.tools.map(inlineText).join(', ')}`,
    pipelineBody: pipeline.body ? `\n\n${pipeline.body}` : '',
    pipelineArguments: linesOf(pipeline.arguments.map((arg) => `- ${describeArgument(arg)}`)),
    pipelineFlows: linesOf(pipeline.flows.map((flow, index) => flowLine(flow, index + 1))),
  };
}

function flowLine(flow: Flow, number: number): string {
  const head = `${number}. Flow \`${flow.id}\``;
  const approval = flow.approval
    ? 'The process stops for a person at the end of this flow.'
    : 'The process does not stop at the end of this flow.';
  return flow.description ? `${head}: ${inlineText(flow.description)} ${approval}` : `${head}. ${approval}`;
}
