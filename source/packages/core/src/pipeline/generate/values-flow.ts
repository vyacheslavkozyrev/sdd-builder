import type { AgentBlock, Artifact, Block, ConditionBlock, EndBlock, Flow, Route } from '../model.js';
import { GenerationError } from './error.js';
import { describeArgument, describeArguments, inlineText, linesOf } from './values-text.js';
import { walkFlow } from './walk.js';

// The values of a flow's command layout (F-04, AC-012, AC-015, AC-016, AC-018). Each value is a text built in code
// (decision 36b): `flowArguments` is one line per argument; `flowSteps` is one numbered line per block of the walk
// (F-05, AC-010), the Start first and the End last; a Condition step gives its check and its true and false routes as
// sub-lines (F-05, AC-012); `flowConditions` is one numbered rule per Condition, with the same routes as sub-lines;
// `flowArtifacts` is each artifact as a heading with its label and its template text, `No artifacts` when the flow has
// none (F-05, AC-009); the End step names the produced artifact when there is one (F-05, AC-014). `flowApproval` is the
// approval paragraph, empty when the flow's approval is off. The values are a pure function of the flow: the same flow
// always gives the same text.
//
// Layout rule (plan, "Decision used by the plan"): a value of whole lines or a paragraph starts with its own line
// break and is empty when it has no lines. A layout writes such a placeholder at the end of a line, with no line break
// after it, so an empty value leaves no blank line for the caller to remove.

const ROUND_LIMIT_MIN = 1;
const ROUND_LIMIT_MAX = 5;

export function flowValues(flow: Flow): Record<string, string> {
  const walked = walkFlow(flow);
  const steps = stepsOf(walked);
  const places = placesOf(steps);
  const conditions = walked.flatMap((block) => (block.kind === 'condition' ? [block] : []));

  return {
    flowId: flow.id,
    flowName: inlineText(flow.name),
    flowDescription: inlineText(flow.description ?? ''),
    flowArguments: linesOf(flow.arguments.map((arg) => `- ${describeArgument(arg)}`)),
    flowArtifacts: artifactsText(flow.artifacts),
    flowSteps: linesOf(steps.map((block, index) => stepText(block, index + 1, places, flow))),
    flowConditions: linesOf(conditions.map((block, index) => conditionRule(block, index + 1, places, flow))),
    flowApproval: flow.approval
      ? "\n\nThe process stops here for the person's approval at the end of this flow."
      : '',
  };
}

// The steps of the flow: every block of the walk, in walk order, with every End moved after the others so that the
// End is last (AC-010). A Condition is a step too.
function stepsOf(walked: readonly Block[]): Block[] {
  return [...walked.filter((block) => block.kind !== 'end'), ...walked.filter((block) => block.kind === 'end')];
}

function stepText(block: Block, number: number, places: ReadonlyMap<string, string>, flow: Flow): string {
  switch (block.kind) {
    case 'start':
      return `${number}. Start the flow.`;
    case 'agent':
      return agentStep(block, number);
    case 'condition':
      return [`${number}. Check to pass: ${inlineText(block.description)}`, ...routeLines(block, places, flow)].join('\n');
    case 'end':
      return endStep(block, number);
  }
}

// The End step names the flow's produced artifact when it has one (AC-014); with none, it is the plain end.
function endStep(block: EndBlock, number: number): string {
  const artifact = inlineText(block.producedArtifact);
  if (artifact === '') return `${number}. End the flow.`;
  return `${number}. End the flow, producing the artifact \`${artifact}\`.`;
}

// Each artifact of the flow, in order; `No artifacts` when there are none (AC-009). The layout writes the `## Artifacts`
// heading before this value; each artifact heading is level 3 under it.
function artifactsText(artifacts: readonly Artifact[]): string {
  return artifacts.length === 0 ? '\nNo artifacts' : `\n${artifacts.map(artifactText).join('\n\n')}`;
}

// An artifact is a heading with its label, and its template text under it as written; the template's leading and
// trailing blank lines are dropped so that no artifact leaves a gap (AC-009).
function artifactText(artifact: Artifact): string {
  const heading = `### ${inlineText(artifact.label)}`;
  const body = artifact.template.replace(/^(?:[ \t]*\r?\n)+/, '').trimEnd();
  return body === '' ? heading : `${heading}\n\n${body}`;
}

// An Agent step names the agent file and gives the agent's description (AC-011).
function agentStep(block: AgentBlock, number: number): string {
  const args = block.arguments.length === 0 ? '' : ` with the arguments ${describeArguments(block.arguments)}`;
  return `${number}. Run the agent \`.claude/agents/${block.name}.md\`${args}: ${inlineText(block.description)}`;
}

// The place of each block a route can name, as the text names it: a step is its step number, with the agent file or
// the check, and the ends of the flow are named as they are. Step numbers follow `stepsOf`.
function placesOf(steps: readonly Block[]): Map<string, string> {
  const places = new Map<string, string>();
  steps.forEach((block, index) => {
    const number = index + 1;
    switch (block.kind) {
      case 'start':
        places.set(block.id, 'the start of the flow');
        break;
      case 'agent':
        places.set(block.id, `step ${number} (the agent \`.claude/agents/${block.name}.md\`)`);
        break;
      case 'condition':
        places.set(block.id, `step ${number} (the check: ${inlineText(block.description)})`);
        break;
      case 'end':
        places.set(block.id, 'the end of the flow');
        break;
    }
  });
  return places;
}

function conditionRule(
  block: ConditionBlock,
  number: number,
  places: ReadonlyMap<string, string>,
  flow: Flow,
): string {
  return [`${number}. ${inlineText(block.description)}`, ...routeLines(block, places, flow)].join('\n');
}

// The true and false routes of a Condition, each as a sub-line.
function routeLines(block: ConditionBlock, places: ReadonlyMap<string, string>, flow: Flow): string[] {
  return [
    `   - True: ${routeText(block.true, block, places, flow)}`,
    `   - False: ${routeText(block.false, block, places, flow)}`,
  ];
}

// A route as a sentence without its final full stop. A `{stop}` route reads "stop and ask the person what to do" and
// asks a question built from the condition's description (decision 40). A return carries its round limit, checked here
// as a programmer error.
function routeText(
  route: Route,
  condition: ConditionBlock,
  places: ReadonlyMap<string, string>,
  flow: Flow,
): string {
  if ('stop' in route) {
    return `stop and ask the person what to do: "The check did not pass: ${inlineText(condition.description)} What should happen next?"`;
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
