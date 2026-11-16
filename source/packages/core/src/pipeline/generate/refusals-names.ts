// Refusals of names, required blocks and Condition checks (F-02 AC-008 to AC-011, AC-013), and of the descriptions of
// the flows, Agent blocks and Conditions (F-02 AC-029, F-06 AC-016). The parser refuses the same cases for a config read
// from JSON; these checks keep generate refusing them for a config built in code. The rule tags that name no project rule (F-03 AC-029) are
// refused only here: the parser reads the tags' shape, and the rules are checked against the whole config.
//
// Names: every block and flow id, and every argument name, is file-safe and unique across the pipeline. An Agent block is
// a custom block (architecture.md decision 8) when it is not part of the default pipeline; its id clashes are refused by the
// same rule, and every clashing path is named. Agent names are file-safe and unique among agents.
//
// Required blocks: the pipeline's own Start and End, and the gates between flows (the Conditions of the default pipeline),
// are always required. In an enabled child flow the Start and End are required. A block of a required kind that is
// disabled is refused. A missing Start or End is left to the shape checks, which name the flow; a missing gate is refused
// here by its id. Disabled blocks and flows are not checked at all, ids and names included (AC-014), and advice (a retry with no round
// limit, an input with no upstream producer) never refuses (AC-013).
import { defaultProjectConfig } from '../default.js';
import { ID_MESSAGE, isValidId } from '../ids.js';
import type { ChildBlock, CheckType, ConditionBlock, FlowBlock, PipelineBlock, ProjectConfig } from '../model.js';
import { childPath, indexPath, type PipelineProblem } from '../parse-util.js';

/** A named value and the dotted path where it is written, for the clash messages. */
interface Named {
  readonly path: string;
  readonly value: string;
}

/** A block of a list, as the required-block checks read it. */
interface ListBlock {
  readonly kind: string;
  readonly id: string;
  readonly enabled: boolean;
}

const BLOCKS_PATH = childPath('pipeline', 'blocks');
const CHECK_TYPES: readonly string[] = ['approval', 'checks', 'diff-size'];

/** The gates between flows of the default pipeline. They are required in every pipeline (architecture.md decision 8). */
const REQUIRED_GATE_IDS: readonly string[] = defaultProjectConfig.pipeline.blocks.flatMap((block) =>
  block.kind === 'condition' ? [block.id] : [],
);

/** Whether a description is missing, not a string, or blank. */
function isBlankDescription(description: unknown): boolean {
  return typeof description !== 'string' || description.trim() === '';
}

/**
 * The description problems of the enabled flows and of the enabled blocks inside them: a flow's description is its command's
 * text, an Agent block's is its stub text, and a Condition's (what passing means, F-06 AC-016) is its rule text. A blank one is
 * refused at the path of its own block; the pipeline's own gates are checked the same way.
 */
export function descriptionProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  config.pipeline.blocks.forEach((block, index) => {
    const blockPath = indexPath(BLOCKS_PATH, index);
    if (block.kind === 'condition' && block.enabled && isBlankDescription(block.description)) {
      problems.push({ path: blockPath, message: `Condition "${block.id}" has no description; its rule text would be empty` });
    }
    if (block.kind !== 'flow' || !block.enabled) return;
    if (isBlankDescription(block.description)) {
      problems.push({ path: blockPath, message: `Flow "${block.id}" has no description; its command text would be empty` });
    }
    block.blocks.forEach((child, childIndex) => {
      const childAt = indexPath(childPath(blockPath, 'blocks'), childIndex);
      if (child.kind === 'agent' && child.enabled && isBlankDescription(child.description)) {
        problems.push({ path: childAt, message: `Agent block "${child.id}" has no description; its stub text would be empty` });
      }
      if (child.kind === 'condition' && child.enabled && isBlankDescription(child.description)) {
        problems.push({ path: childAt, message: `Condition "${child.id}" has no description; its rule text would be empty` });
      }
    });
  });
  return problems;
}

/** The enabled child blocks of a flow at `flowPath`, with their paths in the flow's block list. A disabled block is left out (AC-014). */
function childrenOf(flowPath: string, blocks: readonly ChildBlock[]): Array<{ path: string; block: ChildBlock }> {
  const listPath = childPath(flowPath, 'blocks');
  return blocks.flatMap((block, index) => (block.enabled ? [{ path: indexPath(listPath, index), block }] : []));
}

/** Every enabled flow of the pipeline with its path. A disabled flow is left out (AC-014). */
function flowsOf(config: ProjectConfig): Array<{ path: string; flow: FlowBlock }> {
  return config.pipeline.blocks.flatMap((block, index) =>
    block.kind === 'flow' && block.enabled ? [{ path: indexPath(BLOCKS_PATH, index), flow: block }] : [],
  );
}

/** The ids and argument names of the enabled blocks, with their paths: pipeline blocks, flows, child blocks and arguments. */
function idEntries(config: ProjectConfig): Named[] {
  const entries: Named[] = [];
  config.pipeline.blocks.forEach((block, index) => {
    if (!block.enabled) return;
    const path = indexPath(BLOCKS_PATH, index);
    entries.push({ path: childPath(path, 'id'), value: block.id });
    if (block.kind === 'start') {
      const argumentsPath = childPath(path, 'arguments');
      block.arguments.forEach((argument, at) => {
        entries.push({ path: childPath(indexPath(argumentsPath, at), 'name'), value: argument.name });
      });
    }
  });
  for (const { path, flow } of flowsOf(config)) {
    for (const { path: childAt, block } of childrenOf(path, flow.blocks)) {
      entries.push({ path: childPath(childAt, 'id'), value: block.id });
    }
  }
  return entries;
}

/** The agent names of the config, with their paths. Agents are child blocks of flows. */
function agentNameEntries(config: ProjectConfig): Named[] {
  return flowsOf(config).flatMap(({ path, flow }) =>
    childrenOf(path, flow.blocks).flatMap(({ path: childAt, block }) =>
      block.kind === 'agent' ? [{ path: childPath(childAt, 'name'), value: block.name }] : [],
    ),
  );
}

/** Each entry whose value follows the id rule is file-safe; each other one is refused at its path. */
function fileSafeProblems(entries: readonly Named[], problems: PipelineProblem[]): void {
  for (const entry of entries) {
    if (!isValidId(entry.value)) problems.push({ path: entry.path, message: ID_MESSAGE });
  }
}

/** Each value used by more than one entry is refused at every path it is written at, naming the others. */
function clashProblems(entries: readonly Named[], problems: PipelineProblem[]): void {
  const groups = new Map<string, Named[]>();
  for (const entry of entries) {
    const group = groups.get(entry.value);
    if (group === undefined) groups.set(entry.value, [entry]);
    else group.push(entry);
  }
  for (const [value, group] of groups) {
    if (group.length < 2) continue;
    for (const entry of group) {
      const others = group
        .filter((other) => other !== entry)
        .map((other) => other.path)
        .join(', ');
      problems.push({ path: entry.path, message: `"${value}" is used more than once; also at ${others}` });
    }
  }
}

/** The name and id problems: file-safe ids, names and argument names, and no clash across the pipeline. */
export function nameProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  const ids = idEntries(config);
  const agentNames = agentNameEntries(config);
  fileSafeProblems([...ids, ...agentNames], problems);
  clashProblems(ids, problems);
  clashProblems(agentNames, problems);
  return problems;
}

/**
 * The Start and End rule of one list (the pipeline, or an enabled child flow): when the list holds a Start or an End
 * and none of that kind is enabled, each disabled one is refused. A list with none of a kind is left to the shape checks.
 */
function endpointProblems(listPath: string, owner: string, blocks: readonly ListBlock[], problems: PipelineProblem[]): void {
  for (const kind of ['start', 'end'] as const) {
    const ofKind = blocks.flatMap((block, index) => (block.kind === kind ? [{ block, index }] : []));
    if (ofKind.length === 0 || ofKind.some(({ block }) => block.enabled)) continue;
    const label = kind === 'start' ? 'Start' : 'End';
    for (const { block, index } of ofKind) {
      problems.push({
        path: indexPath(listPath, index),
        message: `${label} block "${block.id}" is disabled; ${owner} needs an enabled ${label} block`,
      });
    }
  }
}

/** The gates of the default pipeline must be pipeline Conditions, present and enabled. */
function gateProblems(blocks: readonly PipelineBlock[], problems: PipelineProblem[]): void {
  for (const gateId of REQUIRED_GATE_IDS) {
    const index = blocks.findIndex((block) => block.id === gateId);
    const block = blocks[index];
    if (block === undefined) {
      problems.push({ path: BLOCKS_PATH, message: `required gate "${gateId}" is missing` });
    } else if (block.kind !== 'condition') {
      problems.push({ path: indexPath(BLOCKS_PATH, index), message: `required gate "${gateId}" must be a Condition` });
    } else if (!block.enabled) {
      problems.push({ path: indexPath(BLOCKS_PATH, index), message: `required gate "${gateId}" is disabled` });
    }
  }
}

/** The required-block problems of the pipeline and of each enabled child flow. */
export function requiredProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  endpointProblems(BLOCKS_PATH, 'the pipeline', config.pipeline.blocks, problems);
  gateProblems(config.pipeline.blocks, problems);
  for (const { path, flow } of flowsOf(config)) {
    if (!flow.enabled) continue;
    endpointProblems(childPath(path, 'blocks'), `flow "${flow.id}"`, flow.blocks, problems);
  }
  return problems;
}

/** The check problems of one enabled Condition: a fixed check type, and a threshold only for diff-size. */
function conditionCheckProblems(path: string, block: ConditionBlock, problems: PipelineProblem[]): void {
  const checkType: unknown = block.checkType;
  if (!isCheckType(checkType)) {
    problems.push({
      path,
      message: `Condition "${block.id}" has a check type outside ${CHECK_TYPES.join(', ')}`,
    });
    return;
  }
  const threshold: unknown = 'threshold' in block ? block.threshold : undefined;
  if (checkType !== 'diff-size') {
    if (threshold !== undefined) {
      problems.push({ path, message: `Condition "${block.id}" is ${checkType} and has a threshold; only diff-size takes one` });
    }
    return;
  }
  if (threshold === undefined) {
    problems.push({ path, message: `Condition "${block.id}" is diff-size and has no threshold; it must be a whole number of at least 1` });
  } else if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 1) {
    problems.push({ path, message: `Condition "${block.id}" threshold must be a whole number of at least 1` });
  }
}

function isCheckType(value: unknown): value is CheckType {
  return typeof value === 'string' && CHECK_TYPES.includes(value);
}

/**
 * The rule tags of the enabled flows and Agent blocks that name no entry of `ProjectConfig.rules` (F-03 AC-029). Each such
 * tag is refused at its own path, so every unknown tag is listed. A disabled flow or block is left out (AC-014).
 */
export function ruleTagProblems(config: ProjectConfig): PipelineProblem[] {
  const ruleIds = new Set(config.rules.map((rule) => rule.id));
  const problems: PipelineProblem[] = [];
  for (const { path, flow } of flowsOf(config)) {
    unknownTagProblems(flow.ruleTags, path, ruleIds, problems);
    for (const { path: childAt, block } of childrenOf(path, flow.blocks)) {
      if (block.kind === 'agent') unknownTagProblems(block.ruleTags, childAt, ruleIds, problems);
    }
  }
  return problems;
}

/** The tags of one block at `path` that are not in `ruleIds`, each refused at its own item path. */
function unknownTagProblems(
  tags: readonly string[] | undefined,
  path: string,
  ruleIds: ReadonlySet<string>,
  problems: PipelineProblem[],
): void {
  (tags ?? []).forEach((tag, index) => {
    if (ruleIds.has(tag)) return;
    problems.push({
      path: indexPath(childPath(path, 'ruleTags'), index),
      message: `"${tag}" names no rule; every ruleTags entry must be the id of a project rule`,
    });
  });
}

/** The check problems of the enabled Conditions: the pipeline's gates and the Conditions of each enabled child flow. */
export function checkProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  config.pipeline.blocks.forEach((block, index) => {
    if (block.kind === 'condition' && block.enabled) {
      conditionCheckProblems(indexPath(BLOCKS_PATH, index), block, problems);
    }
  });
  for (const { path, flow } of flowsOf(config)) {
    for (const { path: childAt, block } of childrenOf(path, flow.blocks)) {
      if (block.kind === 'condition') conditionCheckProblems(childAt, block, problems);
    }
  }
  return problems;
}
