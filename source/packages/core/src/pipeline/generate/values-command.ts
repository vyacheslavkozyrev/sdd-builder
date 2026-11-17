// The placeholder values of the pipeline command file and of a flow's command file (source/templates/README.md,
// Placeholders; architecture.md §6 decision 35). The lists are built from the config in its own order: a flow's
// steps follow its blocks in block order, the pipeline's steps follow its flows and the gates between them.
// A back route is a Check route to an earlier block of the same flow; a route with `stop` gives no rule. Pure:
// the config is read, never changed.

import type { Argument, Block, Check, Flow, Pipeline, Route } from '../model.js';
import type { PlaceholderValues } from './render.js';

// The values of a flow's command file: its id, name, description, rule tags, steps and back-route rules.
export function flowValues(flow: Flow): PlaceholderValues {
  return {
    flowId: flow.id,
    flowName: flow.name,
    description: flow.description,
    ruleTags: tagList(flow.ruleTags),
    stepList: numbered(flow.blocks.map((block) => stepText(flow, block))),
    routeRules: numbered(backRouteRules(flow)),
  };
}

// The values of the pipeline command file: its arguments, its flow and gate steps, its back-route rules of all
// flows, and the command files it lists (pipeline.md first, then one per child flow in pipeline order).
export function pipelineValues(pipeline: Pipeline): PlaceholderValues {
  return {
    argumentList: pipeline.arguments.map(argumentLine).join('\n'),
    pipelineStepList: numbered(pipeline.flows.flatMap(pipelineSteps)),
    routeRules: numbered(pipeline.flows.flatMap(backRouteRules)),
    commandList: ['.claude/commands/pipeline.md', ...pipeline.flows.map((flow) => `.claude/commands/${flow.id}.md`)]
      .map((path) => `- ${path}`)
      .join('\n'),
  };
}

// A rule-set tag list, comma-separated; `none` when there are no tags.
function tagList(tags: readonly string[] | undefined): string {
  return tags !== undefined && tags.length > 0 ? tags.join(', ') : 'none';
}

// Numbers the lines from 1; an empty list gives an empty text.
function numbered(lines: readonly string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

function argumentLine(argument: Argument): string {
  const flag = argument.required ? 'required' : 'optional';
  return `- \`${argument.id}\` (${flag})${argument.hint === '' ? '' : `: ${argument.hint}`}`;
}

// One step of a flow's command file, from one of its blocks.
function stepText(flow: Flow, block: Block): string {
  switch (block.kind) {
    case 'start':
      return `Start with the arguments \`${flow.arguments}\``;
    case 'agent':
      return `Run the agent \`${block.name}\` with \`${block.arguments}\`: ${block.description}`;
    case 'approval':
      return `Approval: ${block.description}`;
    case 'check':
      return checkText(block);
    case 'end':
      return block.producedArtifact === undefined
        ? `End as \`${block.outcome}\``
        : `End as \`${block.outcome}\`, producing \`${block.producedArtifact}\``;
  }
}

// The steps of the pipeline command for one flow: the flow itself, then the gate that follows it, if any.
function pipelineSteps(flow: Flow): string[] {
  const steps = [`Run the flow \`${flow.id}\` (${flow.name})`];
  const gate = flow.connectedTo?.gate;
  if (gate !== undefined) {
    steps.push(gate.kind === 'approval' ? `Approval: ${gate.description}` : checkText(gate));
  }
  return steps;
}

// A check as a step: what passing means, and the type (with the threshold for a diff size check).
function checkText(check: Pick<Check, 'description' | 'type' | 'threshold'>): string {
  const threshold = check.threshold === undefined ? '' : `, threshold ${check.threshold}`;
  return `Check: ${check.description} (type ${check.type}${threshold})`;
}

// The back-route rules of a flow, one per back route, in block order and then true before false.
function backRouteRules(flow: Flow): string[] {
  return flow.blocks.flatMap((block, index) =>
    block.kind === 'check'
      ? [
          ...backRule(flow, index, 'On pass', block.connectedTo.true),
          ...backRule(flow, index, 'On fail', block.connectedTo.false),
        ]
      : [],
  );
}

// The rule of one route of the Check at `checkIndex`: none unless the route goes to an earlier block of the flow.
// A route that names no block of its flow is refused by the analysis before planning, so it gives no rule here.
function backRule(flow: Flow, checkIndex: number, outcome: string, route: Route): string[] {
  if (!('to' in route)) {
    return [];
  }
  const targetIndex = flow.blocks.findIndex((block) => block.id === route.to);
  if (targetIndex === -1 || targetIndex >= checkIndex) {
    return [];
  }
  const limit = route.roundLimit === undefined ? 'no limit set' : String(route.roundLimit);
  return [`${outcome}, go back to \`${route.to}\` and run again from there; round limit ${limit}.`];
}
