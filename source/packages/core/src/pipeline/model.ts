// Pipeline model: the process as data, and the project config that holds it.
// Pure types, no runtime code. Source of truth: spec/documents/building-blocks.md.
// Lives beside the flat model (packages/core/src/model.ts) until each consumer
// is rebuilt on it (architecture.md §5, decision 19).

/** The config document. The schema version is fixed at 2 (architecture.md §5, decision 16). */
export interface ProjectConfig {
  schemaVersion: 2;
  name: string;
  /** Free-text description of the product idea. */
  idea: string;
  stack: ProjectStack;
  /** The one pipeline of the project: its Start, its child flows, and the connections and gates between them. */
  pipeline: Pipeline;
  /** Project rules. Each entry becomes `.claude/rules/<id>.md` (architecture.md §6, decision 20). */
  rules: Rule[];
}

/** A project rule: its id is the file name, its title and text are the file's content. */
export interface Rule {
  id: string;
  title: string;
  text: string;
}

/** The technology the project is built with. Free text per field; only `language` is required. */
export interface ProjectStack {
  language: string;
  framework?: string;
  platform?: string;
  buildTool?: string;
  testFramework?: string;
}

/** What an Agent block repeats over. The iteration source is the artifact it reads. */
export type Scope = 'project' | 'feature' | 'task';

/** The fixed set of check types a Condition can take. User-written check commands are not allowed. */
export type CheckType = 'approval' | 'checks' | 'review' | 'diff-size';

/** Who decides the outcome of a Condition. */
export type DecidedBy = 'human' | 'agent';

/**
 * Where a Condition's pass or fail output goes. `back` returns to an earlier
 * block of the same flow (a retry); `stop` ends the process (a quality gate).
 */
export type Route =
  | { kind: 'next' }
  | { kind: 'stop' }
  | { kind: 'back'; blockId: string };

/** An input the pipeline takes from the user, e.g. the first feature name. */
export interface Argument {
  name: string;
  required: boolean;
  hint: string;
}

/** The first block of a child flow. Carries no arguments. */
export interface StartBlock {
  kind: 'start';
  id: string;
  enabled: boolean;
}

/** The first block of the pipeline. Carries the arguments the pipeline takes. */
export interface PipelineStartBlock {
  kind: 'start';
  id: string;
  enabled: boolean;
  arguments: Argument[];
}

/** Runs one agent (`.claude/agents/<name>.md`) with a scope. The description is the agent's job, its stub text. */
export interface AgentBlock {
  kind: 'agent';
  id: string;
  enabled: boolean;
  name: string;
  scope: Scope;
  description: string;
  /** Ids of the project rules this agent takes (`ProjectConfig.rules`). Absent in code means none; the parser sets `[]`. */
  ruleTags?: string[];
}

interface ConditionCommon {
  kind: 'condition';
  id: string;
  enabled: boolean;
  decidedBy: DecidedBy;
  passRoute: Route;
  failRoute: Route;
  /** Retry limit for a `back` route. Absent means no limit is set. */
  roundLimit?: number;
}

/** A fixed check with pass and fail routes. `threshold` (lines) applies to `diff-size` only. */
export type ConditionBlock = ConditionCommon &
  (
    | { checkType: 'diff-size'; threshold: number }
    | { checkType: 'approval' | 'checks' | 'review' }
  );

/** A runs-after link between two blocks of one flow, or between two flows of the pipeline. */
export interface ConnectionBlock {
  kind: 'connection';
  id: string;
  enabled: boolean;
  /** Id of the block (or flow, in the pipeline) that runs first. */
  from: string;
  /** Id of the block (or flow, in the pipeline) that runs after. */
  to: string;
  /** The artifact handed over, as a label. */
  artifact: string;
}

/** How a flow or the pipeline ends: `done` when its work is complete, `stopped` when a gate stopped it. */
export type EndOutcome = 'done' | 'stopped';

/** Exit of a flow, or of the pipeline. The produced artifact is optional. */
export interface EndBlock {
  kind: 'end';
  id: string;
  enabled: boolean;
  outcome: EndOutcome;
  produced?: string;
}

/** The blocks a child flow holds. A flow cannot hold another flow (one nesting level). */
export type ChildBlock = StartBlock | AgentBlock | ConditionBlock | ConnectionBlock | EndBlock;

/** A child flow: an ordered list of blocks. */
export interface Flow {
  id: string;
  name: string;
  /** What the flow does, as the command's text. Required on each enabled flow; a blank one is refused (F-03 AC-031). */
  description: string;
  enabled: boolean;
  blocks: ChildBlock[];
  /** Ids of the project rules this flow takes (`ProjectConfig.rules`). Absent in code means none; the parser sets `[]`. */
  ruleTags?: string[];
}

/** A child flow placed in the pipeline. Only the pipeline holds these. */
export interface FlowBlock extends Flow {
  kind: 'flow';
}

/** A gate or check between two flows. It sits on a pipeline Connection, so it names that connection. */
export type PipelineConditionBlock = ConditionBlock & {
  /** Id of the pipeline Connection this gate or check sits on. */
  onConnection: string;
};

/** The blocks the pipeline holds: its Start, its child flows, and the connections and gates between them. */
export type PipelineBlock =
  | PipelineStartBlock
  | PipelineConditionBlock
  | ConnectionBlock
  | EndBlock
  | FlowBlock;

/** The top-level flow. It contains child flows, connections and gates between them. */
export interface Pipeline {
  name: string;
  blocks: PipelineBlock[];
}
