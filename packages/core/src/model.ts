// Domain model shared by the configurator (apps/web), the API (apps/api)
// and the generator (this package). Pure types, no runtime code.

/** Output formats the generator can emit. Claude is the reference target. */
export type TargetTool = 'claude' | 'cursor' | 'copilot';

/** Where a block's work happens: once per project, once per feature, or once per task. */
export type BlockScope = 'project' | 'feature' | 'task';

/**
 * One SDLC phase, as defined in the block catalog (catalog.ts).
 * A block emits a command, an optional agent and the rules it needs.
 */
export interface BlockDefinition {
  id: string;
  name: string;
  summary: string;
  /** Position in the default lifecycle. The constructor may reorder blocks. */
  defaultOrder: number;
  scope: BlockScope;
  /** Required blocks cannot be disabled (e.g. commit, the step that makes work durable). */
  required: boolean;
  /** Slash-command name emitted for this block, e.g. "implement". */
  commandName: string;
  /** Agent name emitted for this block, or null when the block runs in the main session. */
  agentName: string | null;
  /** Block ids whose artifacts this block reads. Used to check ordering. */
  consumes: string[];
  /** Artifacts this block writes, e.g. "stories.md", "plan.md". */
  produces: string[];
}

/**
 * A block written by the user. It has the same shape as a catalog block, plus
 * the text the generator writes into the command and agent files.
 * Custom blocks are always optional: the framework's own checks never depend on them.
 */
export interface CustomBlockDefinition extends Omit<BlockDefinition, 'required'> {
  origin: 'custom';
  required: false;
  body: CustomBlockBody;
}

export interface CustomBlockBody {
  /** Markdown for `.claude/commands/<commandName>.md`. May use the placeholders in templates/README.md. */
  command: string;
  /** Markdown for `.claude/agents/<agentName>.md`, or null when the block runs in the main session. */
  agent: string | null;
}

/** A block as placed in one project's lifecycle. */
export interface BlockInstance {
  blockId: string;
  enabled: boolean;
  order: number;
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

/** Everything the user enters in the configurator. Serialised to JSON for save and load. */
export interface ProjectConfig {
  /** Schema version of this document, so saved configurations stay readable. */
  schemaVersion: 1;
  name: string;
  /** Free-text description of the product idea. */
  idea: string;
  stack: TechStack;
  architecture: ArchitectureSpec;
  codeRules: string[];
  testRules: string[];
  /** Blocks written by the user. Ids must not clash with catalog ids. */
  customBlocks: CustomBlockDefinition[];
  blocks: BlockInstance[];
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
  suggestedBlocks: BlockInstance[];
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
