// Domain shapes of the project configuration (pipeline-schema.md §2, schemaVersion 2).
// Other packages import these types; they do not redeclare them.
//
// Every list item that the cross-checks read carries `index`: its position in the document list,
// counting the items refused before it (owner decision 2026-11-19). A check reports a problem at
// that index, so a path names the same place in the file whatever was refused.

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

export interface RuleTag {
  readonly ruleId: string;
  readonly index: number;
}

export interface Rule {
  readonly index: number;
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export interface Argument {
  readonly index: number;
  readonly id: string;
  readonly required: boolean;
  readonly hint: string;
}

export interface Artifact {
  readonly label: string;
  readonly template: string;
}

export interface StartBlock {
  readonly index: number;
  readonly id: string;
  readonly kind: 'start';
  readonly next: string;
}

export interface AgentBlock {
  readonly index: number;
  readonly id: string;
  readonly kind: 'agent';
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly Argument[];
  readonly model?: Model;
  readonly tools?: readonly string[];
  readonly ruleTags?: readonly RuleTag[];
  readonly body?: string;
  readonly next: string;
}

export type Route =
  | { readonly to: string }
  | { readonly to: string; readonly roundLimit: number }
  | { readonly stop: true };

export interface ConditionBlock {
  readonly index: number;
  readonly id: string;
  readonly kind: 'condition';
  readonly description: string;
  readonly true: Route;
  readonly false: Route;
}

export interface EndBlock {
  readonly index: number;
  readonly id: string;
  readonly kind: 'end';
  readonly outcome: 'done' | 'stopped';
  readonly producedArtifact: string;
}

export type Block = StartBlock | AgentBlock | ConditionBlock | EndBlock;

export interface Flow {
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly arguments: readonly Argument[];
  readonly model?: Model;
  readonly ruleTags?: readonly RuleTag[];
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
  readonly ruleTags?: readonly RuleTag[];
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
