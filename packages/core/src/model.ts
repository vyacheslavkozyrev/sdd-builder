// Domain model shared by the builder (apps/web), the API (apps/api) and the
// generator (this package). Pure types, no runtime code.
// Source of truth: spec/documents/building-blocks.md.

/** Output formats the generator can emit. Claude Code is the only MVP target. */
export type TargetTool = 'claude' | 'cursor' | 'copilot';

/** What a workflow repeats over. The iteration source is the artifact it reads. */
export type Scope = 'project' | 'feature' | 'task';

/** The fixed set of gate types. User-written check commands are not allowed. */
export type GateType = 'approval' | 'checks' | 'review' | 'diff-size';

/** How a step runs in the generated project. */
export type StepKind = 'command' | 'agent' | 'skill' | 'script';

/** A step definition: from the catalog, or written by the user (custom). */
export interface StepDefinition {
  id: string;
  name: string;
  summary: string;
  kind: StepKind;
  origin: 'catalog' | 'custom';
  /** Catalog steps may be required. Custom steps are never required. */
  required: boolean;
  /** Artifacts or steps the step reads. Used for structural checks. */
  consumes: string[];
  /** Files the step writes, e.g. "stories.md". */
  produces: string[];
  /** Rule-set files attached to the step as context, e.g. "code.md". */
  ruleTags: string[];
  /** Body text, required for custom steps; catalog steps use templates instead. */
  body?: string;
  /** The user's high-level description of what the step should do. Unset uses the summary. */
  description?: string;
}

/** A gate: a fixed-type check. `threshold` applies to diff-size only (lines). */
export interface Gate {
  id: string;
  type: GateType;
  threshold?: number;
  /** Catalog gates may be required; custom gates are never required. */
  required: boolean;
}

/**
 * Where a route goes. `next` is the following step in the workflow's order;
 * `step` is a named step in the same workflow; `stop` ends the process.
 */
export type RouteTarget =
  | { kind: 'next' }
  | { kind: 'step'; stepId: string }
  | { kind: 'stop' };

/**
 * A condition placed after a step. Its pass and fail outputs are routed.
 * A quality gate is a condition whose fail output is `stop`.
 * A branch is a condition whose fail output goes back to an earlier step.
 */
export interface Condition {
  id: string;
  /** The step this condition follows. */
  afterStepId: string;
  gate: Gate;
  pass: RouteTarget;
  /** Undefined means the output is not wired; that is a structural error. */
  fail: RouteTarget | undefined;
  /** Optional round limit for a backward fail route. The user sets it; no default. */
  roundLimit?: number;
}

/** A step placed in one workflow's ordered list. Tab order is list order. */
export interface WorkflowStep {
  stepId: string;
  enabled: boolean;
}

/** One workflow: one diagram on its own tab. Workflows do not nest. */
export interface Workflow {
  id: string;
  name: string;
  scope: Scope;
  /** The artifact the workflow iterates over, e.g. "features.md" or "plan.md"; "project" for once. */
  iterationSource: string;
  enabled: boolean;
  steps: WorkflowStep[];
  conditions: Condition[];
  /** The user's high-level description of what the workflow does. Unset means none. */
  description?: string;
}

/** A connection on the global map: `to` runs after `from`. */
export interface MapConnection {
  id: string;
  from: string;
  to: string;
  /** Artifact handed over, e.g. "plan.md". Optional. */
  artifact?: string;
  /** Gate that holds `to` until it passes. Optional. */
  gate?: Gate;
}

export interface TechStack {
  language: string;
  framework?: string;
  platform?: string;
  buildTool?: string;
  testFramework?: string;
}

export interface ModuleSpec {
  name: string;
  /** Layer in the dependency graph. Lower layers must not depend on higher ones. */
  layer: number;
  responsibility: string;
  dependsOn: string[];
}

export interface ArchitectureSpec {
  style: string;
  modules: ModuleSpec[];
  notes?: string;
}

/** Everything the user enters in the builder. Serialised to JSON when saved (post-MVP). */
export interface ProjectConfig {
  /** Schema version of this document. */
  schemaVersion: 1;
  name: string;
  /** Free-text description of the product idea. */
  idea: string;
  stack: TechStack;
  architecture: ArchitectureSpec;
  codeRules: string[];
  testRules: string[];
  /** Steps written by the user. Ids must not clash with catalog ids. */
  customSteps: StepDefinition[];
  workflows: Workflow[];
  connections: MapConnection[];
  targets: TargetTool[];
}

/** A finding from the analyzer: a gap, a conflict or a suggestion the user should see. */
export interface AnalysisFinding {
  severity: 'info' | 'warning' | 'blocker';
  subject: string;
  message: string;
}

export interface AnalysisResult {
  findings: AnalysisFinding[];
}

export interface GeneratedFile {
  /** Path relative to the project root, forward slashes, no leading slash. */
  path: string;
  content: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  warnings: string[];
}
