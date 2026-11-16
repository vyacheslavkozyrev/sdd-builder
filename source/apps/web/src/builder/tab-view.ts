// Flow tab read model: the blocks of one flow in order with their numbers, the Connections drawn as arrows between them,
// the flow toolbox, and the property panel of the selected block or of the flow (F-06 AC-017, AC-018, AC-023, AC-024).
// Pure: no DOM, no storage, no network. The numbers count the blocks drawn as boxes; a Connection is an arrow and gets no
// number. A panel lists the properties building-blocks §3 gives for its kind, the file it generates and its rule tags.
// An unknown flow id or selected id is a programmer error and throws.
import { pipeline } from '@sddbuilder/core';
import { agentFilePath } from './agent-edit.js';
import { mapTabView, type FlowScope } from './map-tab-view.js';

type ProjectConfig = pipeline.ProjectConfig;
type FlowBlock = pipeline.FlowBlock;
type ChildBlock = pipeline.ChildBlock;
type ConnectionBlock = pipeline.ConnectionBlock;
type Route = pipeline.Route;
type AgentModel = pipeline.AgentModel;
type Scope = pipeline.Scope;
type CheckType = pipeline.CheckType;
type DecidedBy = pipeline.DecidedBy;
type EndOutcome = pipeline.EndOutcome;

/** The blocks drawn as numbered boxes in a flow: every block kind but Connection. */
type BoxedBlock = Exclude<ChildBlock, ConnectionBlock>;

/** The kinds drawn as numbered boxes in a flow. */
export type BoxKind = BoxedBlock['kind'];

/** One numbered block of a flow. `number` is its order among the boxes, starting at 1. */
export interface FlowBox {
  id: string;
  number: number;
  kind: BoxKind;
  title: string;
  subtitle: string;
  enabled: boolean;
}

/** A Connection drawn as an arrow between two boxes. `label` is the artifact; null when it is blank. */
export interface FlowArrow {
  id: string;
  from: string;
  to: string;
  fromNumber: number | null;
  toNumber: number | null;
  label: string | null;
  enabled: boolean;
}

/** The kinds the flow toolbox adds. */
export type ToolboxKind = 'start' | 'agent' | 'condition' | 'connection' | 'end';

/** One item of the flow toolbox. A disabled item says why in `reason`. */
export interface FlowToolboxItem {
  kind: ToolboxKind;
  label: string;
  hint: string;
  disabled: boolean;
  reason: string | null;
}

/** The property panel of the selected block, or of the flow when none is selected. */
export type BlockPanel =
  | { kind: 'start'; id: string; enabled: boolean; generatedFile: string }
  | {
      kind: 'agent';
      id: string;
      enabled: boolean;
      name: string;
      description: string;
      scope: Scope;
      model: AgentModel | null;
      tools: string[];
      body: string;
      ruleTags: string[];
      generatedFile: string;
    }
  | {
      kind: 'condition';
      id: string;
      enabled: boolean;
      checkType: CheckType;
      decidedBy: DecidedBy;
      description: string;
      threshold: number | null;
      passRoute: string;
      failRoute: string;
      roundLimit: number | null;
      generatedFile: string;
    }
  | {
      kind: 'connection';
      id: string;
      enabled: boolean;
      from: string;
      to: string;
      artifact: string;
      generatedFile: string;
    }
  | {
      kind: 'end';
      id: string;
      enabled: boolean;
      outcome: EndOutcome;
      produced: string | null;
      generatedFile: string;
    }
  | {
      kind: 'flow';
      id: string;
      name: string;
      description: string;
      enabled: boolean;
      scope: FlowScope;
      blockCount: number;
      ruleTags: string[];
      generatedFile: string;
    };

/** Everything the flow tab draws. `selected` is the id of the item the panel shows: a block, or the flow itself. */
export interface FlowTabView {
  flowId: string;
  name: string;
  boxes: FlowBox[];
  arrows: FlowArrow[];
  toolbox: FlowToolboxItem[];
  selected: string;
  panel: BlockPanel;
}

const START_TAKEN = 'A flow has one Start; this flow already has one.';

/** The flow tab read model for one flow, with the block or the flow selected (`null` selects the flow). */
export function flowTabView(config: ProjectConfig, flowId: string, selectedId: string | null = null): FlowTabView {
  const flow = requireFlow(config, flowId);
  const boxed = flow.blocks.filter(isBoxed);
  const boxes: FlowBox[] = boxed.map((block, index) => ({
    id: block.id,
    number: index + 1,
    kind: block.kind,
    title: titleOf(block),
    subtitle: subtitleOf(block),
    enabled: block.enabled,
  }));
  const numbers = new Map(boxes.map((box) => [box.id, box.number]));
  const titles = routeTargetNames(boxed);
  const arrows: FlowArrow[] = flow.blocks.filter(isConnection).map((block) => {
    const label = block.artifact.trim();
    return {
      id: block.id,
      from: block.from,
      to: block.to,
      fromNumber: numbers.get(block.from) ?? null,
      toNumber: numbers.get(block.to) ?? null,
      label: label === '' ? null : label,
      enabled: block.enabled,
    };
  });
  return {
    flowId: flow.id,
    name: flow.name,
    boxes,
    arrows,
    toolbox: toolbox(flow),
    selected: selectedId ?? flow.id,
    panel: selectedId === null ? flowPanel(config, flow) : blockPanel(flow, requireBlock(flow, selectedId), titles),
  };
}

/**
 * The name a back route gives its target: the box title, with the box number added when another box has the same title
 * (two `checks` Conditions in one flow would otherwise read the same).
 */
function routeTargetNames(boxed: readonly BoxedBlock[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const block of boxed) {
    counts.set(titleOf(block), (counts.get(titleOf(block)) ?? 0) + 1);
  }
  return new Map(
    boxed.map((block, index) => {
      const title = titleOf(block);
      return [block.id, (counts.get(title) ?? 0) > 1 ? `${title} (${index + 1})` : title];
    }),
  );
}

function isBoxed(block: ChildBlock): block is BoxedBlock {
  return block.kind !== 'connection';
}

function isConnection(block: ChildBlock): block is ConnectionBlock {
  return block.kind === 'connection';
}

/** The file a flow's command holds, where its Start, Condition, Connection and End blocks are written (F-06 AC-024). */
function flowCommandFile(flowId: string): string {
  return `.claude/commands/${flowId}.md`;
}

/** The toolbox of a flow: Start, Agent, Condition, Connection and End. A second Start is refused (F-06 AC-018). */
function toolbox(flow: FlowBlock): FlowToolboxItem[] {
  const hasStart = flow.blocks.some((block) => block.kind === 'start');
  return [
    { kind: 'start', label: 'Start', hint: 'entry of the flow', disabled: hasStart, reason: hasStart ? START_TAKEN : null },
    { kind: 'agent', label: 'Agent', hint: 'runs an agent', disabled: false, reason: null },
    { kind: 'condition', label: 'Condition', hint: 'check with pass and fail', disabled: false, reason: null },
    { kind: 'connection', label: 'Connection', hint: 'artifact handed over', disabled: false, reason: null },
    { kind: 'end', label: 'End', hint: 'done or stopped', disabled: false, reason: null },
  ];
}

/** The panel of the flow: its name, description, scope, block count, rule tags and generated command file (F-06 AC-024). */
function flowPanel(config: ProjectConfig, flow: FlowBlock): BlockPanel {
  const node = mapTabView(config).nodes.find((item) => item.id === flow.id);
  if (node === undefined) {
    throw new Error(`Unknown flow id ${flow.id}`);
  }
  return {
    kind: 'flow',
    id: flow.id,
    name: flow.name,
    description: flow.description,
    enabled: flow.enabled,
    scope: node.scope,
    blockCount: node.blockCount,
    ruleTags: [...(flow.ruleTags ?? [])],
    generatedFile: flowCommandFile(flow.id),
  };
}

/** The panel of one block: the properties of its kind, the file it generates and its rule tags where it has them. */
function blockPanel(flow: FlowBlock, block: ChildBlock, titles: ReadonlyMap<string, string>): BlockPanel {
  const commandFile = flowCommandFile(flow.id);
  switch (block.kind) {
    case 'start':
      return { kind: 'start', id: block.id, enabled: block.enabled, generatedFile: commandFile };
    case 'agent':
      return {
        kind: 'agent',
        id: block.id,
        enabled: block.enabled,
        name: block.name,
        description: block.description,
        scope: block.scope,
        model: block.model ?? null,
        tools: [...(block.tools ?? [])],
        body: block.body ?? '',
        ruleTags: [...(block.ruleTags ?? [])],
        generatedFile: agentFilePath(block.name),
      };
    case 'condition':
      return {
        kind: 'condition',
        id: block.id,
        enabled: block.enabled,
        checkType: block.checkType,
        decidedBy: block.decidedBy,
        description: block.description,
        threshold: block.checkType === 'diff-size' ? block.threshold : null,
        passRoute: routeText(block.passRoute, titles),
        failRoute: routeText(block.failRoute, titles),
        roundLimit: block.roundLimit ?? null,
        generatedFile: commandFile,
      };
    case 'connection':
      return {
        kind: 'connection',
        id: block.id,
        enabled: block.enabled,
        from: block.from,
        to: block.to,
        artifact: block.artifact,
        generatedFile: commandFile,
      };
    case 'end':
      return {
        kind: 'end',
        id: block.id,
        enabled: block.enabled,
        outcome: block.outcome,
        produced: block.produced ?? null,
        generatedFile: commandFile,
      };
  }
}

/** The title of a box: an Agent by its name, a Condition by its check type. */
function titleOf(block: BoxedBlock): string {
  switch (block.kind) {
    case 'start':
      return 'Start';
    case 'agent':
      return block.name;
    case 'condition':
      return block.checkType;
    case 'end':
      return 'End';
  }
}

/** The second line of a box: the scope of an Agent, who decides a Condition, the outcome of an End. */
function subtitleOf(block: BoxedBlock): string {
  switch (block.kind) {
    case 'start':
      return 'entry of the flow';
    case 'agent':
      return `agent · ${block.scope}`;
    case 'condition':
      return block.decidedBy;
    case 'end':
      return block.outcome;
  }
}

/** Where a route goes, in words. A back route names the block it returns to. */
function routeText(route: Route, titles: ReadonlyMap<string, string>): string {
  switch (route.kind) {
    case 'next':
      return 'next';
    case 'stop':
      return 'stop';
    case 'back':
      return `back to ${titles.get(route.blockId) ?? route.blockId}`;
  }
}

function requireFlow(config: ProjectConfig, flowId: string): FlowBlock {
  const flow = config.pipeline.blocks.find(
    (block): block is FlowBlock => block.kind === 'flow' && block.id === flowId,
  );
  if (flow === undefined) {
    throw new Error(`Unknown flow id ${flowId}`);
  }
  return flow;
}

function requireBlock(flow: FlowBlock, blockId: string): ChildBlock {
  const block = flow.blocks.find((item) => item.id === blockId);
  if (block === undefined) {
    throw new Error(`Unknown block id ${blockId} in flow ${flow.id}`);
  }
  return block;
}
