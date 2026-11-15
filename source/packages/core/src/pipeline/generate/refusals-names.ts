// Refusals of names and Condition checks (F-02 AC-008, AC-009, AC-011, AC-013), and of the descriptions of the pipeline's
// Agent blocks (F-02 AC-029). The parser refuses the same cases for a config read from JSON; these checks keep generate
// refusing them for a config built in code.
//
// Names: every block and flow id, and every argument name, is file-safe and unique across the pipeline. An Agent block is
// a custom block (architecture.md decision 8) when it is not part of the default pipeline; its id clashes are refused by the
// same rule, and every clashing path is named. Agent names are file-safe and unique among agents.
//
// Disabled blocks and flows are not checked at all, ids and names included (AC-014), and advice (a retry with no round limit, an input with
// no upstream producer) never refuses (AC-013).
import { ID_MESSAGE, isValidId } from '../ids.js';
import type { ChildBlock, CheckType, ConditionBlock, FlowBlock, ProjectConfig } from '../model.js';
import { childPath, indexPath, type PipelineProblem } from '../parse-util.js';

/** A named value and the dotted path where it is written, for the clash messages. */
interface Named {
  readonly path: string;
  readonly value: string;
}

const BLOCKS_PATH = childPath('pipeline', 'blocks');
const CHECK_TYPES: readonly string[] = ['approval', 'checks', 'review', 'diff-size'];

/** The description problems of the enabled Agent blocks of the pipeline's enabled child flows. */
export function descriptionProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  config.pipeline.blocks.forEach((block, index) => {
    if (block.kind !== 'flow' || !block.enabled) return;
    const flowPath = indexPath(BLOCKS_PATH, index);
    block.blocks.forEach((child, childIndex) => {
      if (child.kind !== 'agent' || !child.enabled) return;
      if (typeof child.description !== 'string' || child.description.trim() === '') {
        problems.push({
          path: indexPath(childPath(flowPath, 'blocks'), childIndex),
          message: `Agent block "${child.id}" has no description; its stub text would be empty`,
        });
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
