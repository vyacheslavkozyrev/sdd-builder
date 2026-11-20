import type { Flow, Pipeline } from '../model.js';
import { flowChain } from './mermaid.js';
import {
  argumentsText,
  bodyText,
  inlineText,
  linesOf,
  quotedText,
  yamlToolsText,
} from './values-text.js';

// The lines that stop the run after a flow with approval on (F-05, AC-003). Each is a step of its own, so the flow's own
// step stays one step (AC-004). The last flow has no next flow to wait before, so it has its own line.
const APPROVAL_STEP = "Stop and wait for the person's approval before the next flow.";
const LAST_APPROVAL_STEP = "Stop and wait for the person's approval at the end of the process.";

// The values of the pipeline command layout (F-04, AC-017). `pipelineName` and `pipelineDescription` are inline, and
// `pipelineDescriptionYaml` is the description as a quoted YAML string for the frontmatter line (F-05, AC-005, as AC-017
// does for agents). `pipelineArguments` is one line per argument, `No arguments` when there are none (F-05, AC-001).
// `pipelineFlows` is one numbered step per flow, in the order of the `next` links from the first flow (as `processFlows`,
// F-05, AC-002), with its id and its description when it has one; a flow with approval on is followed by its own
// numbered approval step (F-05, AC-002 to AC-004). A flow is listed once and its id is not written as a step. `pipelineModel` and `pipelineTools` are the optional frontmatter lines and
// `pipelineBody` the body paragraph (AC-039, decision 26, F-05 AC-005); each starts with its own line break and is ''
// when the pipeline has no such entry. The values are a pure function of the pipeline.
export function pipelineValues(pipeline: Pipeline): Record<string, string> {
  return {
    pipelineName: inlineText(pipeline.name),
    pipelineDescription: inlineText(pipeline.description),
    pipelineDescriptionYaml: quotedText(inlineText(pipeline.description)),
    pipelineModel: pipeline.model === undefined ? '' : `\nmodel: ${pipeline.model}`,
    pipelineTools:
      pipeline.tools === undefined || pipeline.tools.length === 0 ? '' : `\ntools: ${yamlToolsText(pipeline.tools)}`,
    pipelineBody: bodyText(pipeline.body ?? ''),
    pipelineArguments: argumentsText(pipeline.arguments),
    pipelineFlows: linesOf(flowSteps(flowChain(pipeline.flows))),
  };
}

// The numbered steps of the flow list, for the flows in chain order: each flow is one step, and each flow with approval
// on is followed by a step that stops the run. The numbers run over both kinds of step. The last flow of the chain (not
// the last in the array) gets the end-of-process wording (F-05, AC-003).
function flowSteps(chain: readonly Flow[]): string[] {
  const steps: string[] = [];
  chain.forEach((flow, index) => {
    steps.push(`${steps.length + 1}. ${flowStep(flow)}`);
    if (flow.approval) {
      const stop = index === chain.length - 1 ? LAST_APPROVAL_STEP : APPROVAL_STEP;
      steps.push(`${steps.length + 1}. ${stop}`);
    }
  });
  return steps;
}

function flowStep(flow: Flow): string {
  const head = `Flow \`${flow.id}\``;
  return flow.description ? `${head}: ${inlineText(flow.description)}` : `${head}.`;
}
