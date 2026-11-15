// Flow command files (F-02 AC-023, AC-026): one `.claude/commands/<flow-id>.md` per enabled child flow, its enabled
// blocks as numbered steps in block order, each naming the file it calls. Pure: the files are returned, never written.
// The step text lives in this file; `command-layouts.ts` reuses `describeStep` for the layout placeholders. A disabled
// block or flow is never mentioned, because the text is built from the selection alone.
import type { GeneratedFile } from '../../model.js';
import type { AgentBlock, ChildBlock, ConditionBlock, ConnectionBlock, ProjectConfig, Route } from '../model.js';
import { selectBlocks, type SelectedFlow } from './select.js';

const COMMANDS_DIR = '.claude/commands/';
const AGENTS_DIR = '.claude/agents/';

/** The text of a route for a Condition: where its pass or fail output goes. */
function describeRoute(route: Route): string {
  switch (route.kind) {
    case 'next':
      return 'continue to the next step';
    case 'stop':
      return 'stop the process';
    case 'back':
      return `go back to block \`${route.blockId}\` and run again from there`;
  }
}

/** A Condition's step: its check, its decider, and where pass and fail go. */
function describeCondition(block: ConditionBlock): string {
  return (
    `Check ${block.checkType}, decided by ${block.decidedBy} (\`${block.id}\`). ` +
    `On pass, ${describeRoute(block.passRoute)}. On fail, ${describeRoute(block.failRoute)}.`
  );
}

/** An Agent's step: the agent file it calls and the scope it runs over. */
function describeAgent(block: AgentBlock): string {
  return `Run the agent in \`${AGENTS_DIR}${block.name}.md\`, once per ${block.scope} (\`${block.id}\`).`;
}

/**
 * A Connection's step: the artifact handed over and, when both ends are selected blocks of the flow, the two ends.
 * An end that is disabled is not named (AC-026), so the step then says the artifact only.
 */
function describeConnection(block: ConnectionBlock, selected: ReadonlySet<string>): string {
  if (!selected.has(block.from) || !selected.has(block.to)) {
    return `Hand over ${block.artifact} (\`${block.id}\`).`;
  }
  return `Hand over ${block.artifact} from \`${block.from}\` to \`${block.to}\` (\`${block.id}\`).`;
}

/** One numbered step for a block of a child flow. `selected` holds the ids of the flow's selected blocks. */
export function describeStep(block: ChildBlock, selected: ReadonlySet<string>): string {
  switch (block.kind) {
    case 'start':
      return `Start the flow (\`${block.id}\`).`;
    case 'agent':
      return describeAgent(block);
    case 'condition':
      return describeCondition(block);
    case 'connection':
      return describeConnection(block, selected);
    case 'end': {
      const produced = block.produced === undefined ? '' : `, producing ${block.produced}`;
      return `End the flow with outcome ${block.outcome}${produced} (\`${block.id}\`).`;
    }
  }
}

/** The command file of one selected flow: its heading, then its enabled blocks as numbered steps in order. */
function commandFile(entry: SelectedFlow): GeneratedFile {
  const selected = new Set(entry.blocks.map((block) => block.id));
  const steps = entry.blocks.map((block, index) => `${index + 1}. ${describeStep(block, selected)}`);
  const lines = [
    `# ${entry.flow.name}`,
    '',
    `Run the steps of the flow \`${entry.flow.id}\` in order.`,
    '',
    ...steps,
  ];
  return { path: `${COMMANDS_DIR}${entry.flow.id}.md`, content: `${lines.join('\n')}\n` };
}

/**
 * Renders one command file per enabled child flow, sorted by path (F-02 AC-023, AC-026). A disabled flow gives no
 * file, and its blocks and the disabled blocks of an enabled flow are not mentioned. Deterministic for the same config.
 */
export function renderFlowCommands(config: ProjectConfig): GeneratedFile[] {
  return selectBlocks(config)
    .flows.map(commandFile)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
