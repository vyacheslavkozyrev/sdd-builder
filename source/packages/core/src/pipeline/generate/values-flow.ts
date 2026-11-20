import type { Argument, Block, ConditionBlock, Flow, Route } from '../model.js';
import { GenerationError } from './error.js';
import { walkFlow } from './walk.js';

// The values of a flow's command layout (F-04, AC-012, AC-015, AC-016, AC-018). Each value is a text built in code
// (decision 36b): `flowArguments` is one line per argument; `flowSteps` is one numbered line per Agent block, in the
// order the walk lists them; `flowConditions` is one numbered rule per Condition, with its true and false routes as
// sub-lines; `flowApproval` is the approval paragraph, empty when the flow's approval is off. The Start and End blocks
// are not numbered. The values are a pure function of the flow: the same flow always gives the same text.
//
// Layout rule (plan, "Decision used by the plan"): a value of whole lines or a paragraph starts with its own line
// break and is empty when it has no lines. A layout writes such a placeholder at the end of a line, with no line break
// after it, so an empty value leaves no blank line for the caller to remove.

const ROUND_LIMIT_MIN = 1;
const ROUND_LIMIT_MAX = 5;

export function flowValues(flow: Flow): Record<string, string> {
  const walked = walkFlow(flow);
  const places = placesOf(walked);
  const agents = walked.flatMap((block) => (block.kind === 'agent' ? [block] : []));
  const conditions = walked.flatMap((block) => (block.kind === 'condition' ? [block] : []));

  return {
    flowId: flow.id,
    flowName: flow.name,
    flowDescription: flow.description ?? '',
    flowArguments: linesOf(flow.arguments.map((arg) => `- ${describeArgument(arg)}`)),
    flowSteps: linesOf(
      agents.map((block, index) => {
        const args = block.arguments.length === 0 ? '' : ` with the arguments ${describeArguments(block.arguments)}`;
        return `${index + 1}. Run the agent \`.claude/agents/${block.name}.md\`${args}: ${block.description}`;
      }),
    ),
    flowConditions: linesOf(conditions.map((block, index) => conditionRule(block, index + 1, places, flow))),
    flowApproval: flow.approval
      ? "\n\nThe process stops here for the person's approval at the end of this flow."
      : '',
  };
}

// The lines of a value, each line one entry, with the line break before the first one; '' when there are none.
function linesOf(lines: readonly string[]): string {
  return lines.length === 0 ? '' : `\n${lines.join('\n')}`;
}

// The place of each block a route can name, as the text names it: an Agent is its step number and agent file, a
// Condition is its rule number, and the ends of the flow are named as they are. Numbers count only Agent and
// Condition blocks, in walk order.
function placesOf(walked: readonly Block[]): Map<string, string> {
  const places = new Map<string, string>();
  let step = 0;
  let rule = 0;
  for (const block of walked) {
    switch (block.kind) {
      case 'start':
        places.set(block.id, 'the start of the flow');
        break;
      case 'agent':
        step += 1;
        places.set(block.id, `step ${step} (the agent \`.claude/agents/${block.name}.md\`)`);
        break;
      case 'condition':
        rule += 1;
        places.set(block.id, `rule ${rule}`);
        break;
      case 'end':
        places.set(block.id, 'the end of the flow');
        break;
    }
  }
  return places;
}

function conditionRule(
  block: ConditionBlock,
  number: number,
  places: ReadonlyMap<string, string>,
  flow: Flow,
): string {
  return [
    `${number}. ${block.description}`,
    `   - True: ${routeText(block.true, block, places, flow)}`,
    `   - False: ${routeText(block.false, block, places, flow)}`,
  ].join('\n');
}

// A route as a sentence without its final full stop. A `{stop}` route asks the person a question built from the
// condition's description (decision 40). A return carries its round limit, checked here as a programmer error.
function routeText(
  route: Route,
  condition: ConditionBlock,
  places: ReadonlyMap<string, string>,
  flow: Flow,
): string {
  if ('stop' in route) {
    return `the flow stops, and the command asks the person: "The check did not pass: ${condition.description} What should happen next?"`;
  }
  const place = places.get(route.to);
  if (place === undefined) {
    throw new GenerationError(`the flow ${flow.id} routes to ${route.to}, which is no block of the flow`);
  }
  if (!('roundLimit' in route)) return `go to ${place}`;
  if (!Number.isInteger(route.roundLimit) || route.roundLimit < ROUND_LIMIT_MIN || route.roundLimit > ROUND_LIMIT_MAX) {
    throw new GenerationError(
      `the flow ${flow.id} has a return with the round limit ${route.roundLimit}, outside ${ROUND_LIMIT_MIN} to ${ROUND_LIMIT_MAX}`,
    );
  }
  return `return to ${place}, with at most ${route.roundLimit} rounds`;
}

function describeArgument(arg: Argument): string {
  const kind = arg.required ? 'required' : 'optional';
  return arg.hint === '' ? `\`${arg.id}\` (${kind})` : `\`${arg.id}\` (${kind}, ${arg.hint})`;
}

function describeArguments(args: readonly Argument[]): string {
  return args.map(describeArgument).join(', ');
}
