import type { Flow, Pipeline } from '../model.js';
import { describeArgument, inlineText, linesOf } from './values-text.js';

// The values of the pipeline command layout (F-04, AC-017). `pipelineName` and `pipelineDescription` are inline;
// `pipelineArguments` is one line per argument; `pipelineFlows` is one numbered line per flow, in pipeline order, with
// its id, its description when it has one, and whether the process stops for a person at the end of the flow. A flow
// is listed once and its id is not written as a step. The values are a pure function of the pipeline.
export function pipelineValues(pipeline: Pipeline): Record<string, string> {
  return {
    pipelineName: inlineText(pipeline.name),
    pipelineDescription: inlineText(pipeline.description),
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
