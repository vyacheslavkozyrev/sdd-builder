// The pipeline model (architecture.md §6 decision 33). Shapes only; the parser
// that builds these values from outside input is in ./parse/.

export const MODELS = ['haiku', 'sonnet', 'opus', 'inherit'] as const;
export type Model = (typeof MODELS)[number];

// A user-given identifier: lowercase letters, digits and hyphens, starting with a letter (decision 18).
export type Id = string;

export interface ProjectConfig {
  schemaVersion: 2;
  rules: Rule[];
  pipeline: Pipeline;
}

export interface Rule {
  id: Id;
  title: string;
  text: string;
}

export interface Pipeline {
  name: string;
  description: string;
  arguments: Argument[];
  model?: Model;
  tools?: string[];
  ruleTags?: Id[];
  body?: string;
  flows: Flow[];
}

export interface Argument {
  id: Id;
  required: boolean;
  hint: string;
}

export interface Flow {
  id: Id;
  name: string;
  description: string;
  arguments: string;
  model?: Model;
  ruleTags?: Id[];
  body?: string;
  blocks: Block[];
  connectedTo?: FlowLink;
}

export type Block = Start | Agent | Approval | Check | End;

export interface Start {
  id: Id;
  kind: 'start';
  connectedTo?: BlockLink;
}

export interface Agent {
  id: Id;
  kind: 'agent';
  name: Id;
  description: string;
  arguments: string;
  restrictions?: string;
  model?: Model;
  tools?: string[];
  reads?: string[];
  writes?: string[];
  ruleTags?: Id[];
  body?: string;
  connectedTo?: BlockLink;
}

export interface Approval {
  id: Id;
  kind: 'approval';
  description: string;
  connectedTo?: BlockLink;
}

export interface Check {
  id: Id;
  kind: 'check';
  description: string;
  type: 'checks' | 'diff size';
  threshold?: number;
  connectedTo: { true: Route; false: Route };
}

export interface End {
  id: Id;
  kind: 'end';
  outcome: 'done' | 'stopped';
  producedArtifact?: string;
}

export interface BlockLink {
  to: Id;
  label: string;
}

export interface FlowLink {
  to: Id;
  label: string;
  gate?: Gate;
}

export type Gate =
  | { kind: 'approval'; description: string }
  | { kind: 'check'; description: string; type: 'checks' | 'diff size'; threshold?: number };

export type Route = { to: Id; roundLimit?: number } | { stop: true };
