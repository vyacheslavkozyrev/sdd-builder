// Domain shapes of the project configuration (pipeline-schema.md §2, schemaVersion 2).
// Other packages import these types; they do not redeclare them.

export type Model = 'haiku' | 'sonnet' | 'opus' | 'inherit';

export interface Problem {
  readonly path: string;
  readonly message: string;
}

export interface Stack {
  readonly language?: string;
  readonly framework?: string;
  readonly platform?: string;
  readonly buildTool?: string;
  readonly testFramework?: string;
}

export interface Rule {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export interface Argument {
  readonly id: string;
  readonly required: boolean;
  readonly hint: string;
}

export interface Artifact {
  readonly label: string;
  readonly template: string;
}

export interface StartBlock {
  readonly id: string;
  readonly kind: 'start';
  readonly next: string;
}

export interface AgentBlock {
  readonly id: string;
  readonly kind: 'agent';
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly Argument[];
  readonly model?: Model;
  readonly tools?: readonly string[];
  readonly reads?: readonly string[];
  readonly writes?: readonly string[];
  readonly ruleTags?: readonly string[];
  readonly body?: string;
  readonly next: string;
}

export type Route =
  | { readonly to: string }
  | { readonly to: string; readonly roundLimit: number }
  | { readonly stop: true };

export interface ConditionBlock {
  readonly id: string;
  readonly kind: 'condition';
  readonly description: string;
  readonly true: Route;
  readonly false: Route;
}

export interface EndBlock {
  readonly id: string;
  readonly kind: 'end';
  readonly outcome: 'done' | 'stopped';
  readonly producedArtifact: string;
}

export type Block = StartBlock | AgentBlock | ConditionBlock | EndBlock;

export interface Flow {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly arguments: readonly Argument[];
  readonly model?: Model;
  readonly ruleTags?: readonly string[];
  readonly body: string;
  readonly artifacts: readonly Artifact[];
  readonly approval: boolean;
  readonly next?: string;
  readonly blocks: readonly Block[];
}

export interface Pipeline {
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly Argument[];
  readonly model?: Model;
  readonly tools?: readonly string[];
  readonly ruleTags?: readonly string[];
  readonly body?: string;
  readonly flows: readonly Flow[];
}

export interface ProjectConfig {
  readonly schemaVersion: 2;
  readonly name?: string;
  readonly idea?: string;
  readonly architecture?: string;
  readonly stack?: Stack;
  readonly rules: readonly Rule[];
  readonly pipeline: Pipeline;
}
