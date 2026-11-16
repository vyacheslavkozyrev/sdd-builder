// Custom agent edits on a flow tab: the name, description, scope, model, tool list and body of an Agent block, the
// file each agent generates, and the iteration-source warning (F-06 AC-024, AC-026 to AC-031). Pure: no DOM, no storage,
// no network. Every edit returns a new configuration; a refused edit returns a message and leaves the caller's
// configuration as it was. An unknown flow or agent id is a programmer error and throws. A custom agent is added with
// `addBlock(config, flowId, 'agent', selectedId)` from block-edit: it is an Agent block with the same properties.
import { pipeline } from '@sddbuilder/core';
import type { BlockEdit } from './block-edit.js';
import { checkAgentBody, checkAgentDescription, checkAgentName, checkToolName } from './entry-checks.js';

type ProjectConfig = pipeline.ProjectConfig;
type AgentBlock = pipeline.AgentBlock;
type AgentModel = pipeline.AgentModel;
type ChildBlock = pipeline.ChildBlock;
type FlowBlock = pipeline.FlowBlock;
type PipelineBlock = pipeline.PipelineBlock;
type Scope = pipeline.Scope;

/** One setting of an Agent block that the panel changes. Each change is checked on its own and applied as made. */
export type AgentChange =
  | { field: 'name'; value: string }
  | { field: 'description'; value: string }
  | { field: 'scope'; value: Scope }
  | { field: 'model'; value: AgentModel | undefined }
  | { field: 'tools'; value: string[] }
  | { field: 'body'; value: string };

/** The file an agent generates: `.claude/agents/<name>.md` (F-06 AC-024, AC-031). */
export function agentFilePath(name: string): string {
  return `.claude/agents/${name}.md`;
}

/**
 * Changes one setting of a custom agent (F-06 AC-026 to AC-027, AC-030). A refused value is not applied: the agent keeps
 * its previous setting and the refusal names the fix. A name must follow the id rule and must not be used by another
 * Agent block in the project. A model or a tool list that is empty clears the setting, as the generator writes only the
 * settings that are set.
 */
export function editAgent(config: ProjectConfig, flowId: string, agentId: string, change: AgentChange): BlockEdit {
  const agent = requireAgent(config, flowId, agentId);
  const next: AgentBlock = { ...agent };
  switch (change.field) {
    case 'name': {
      const check = checkAgentName(change.value);
      if (!check.ok) return refuse(`${check.message} The agent keeps "${agent.name}".`);
      if (usedByAnotherAgent(config, agentId, check.value)) {
        return refuse(`Name: "${check.value}" is already used by another agent in the project. The agent keeps "${agent.name}".`);
      }
      next.name = check.value;
      break;
    }
    case 'description': {
      const check = checkAgentDescription(change.value);
      if (!check.ok) return refuse(`${check.message} The agent keeps its description.`);
      next.description = check.value;
      break;
    }
    case 'scope':
      next.scope = change.value;
      break;
    case 'model':
      if (change.value === undefined) {
        delete next.model;
      } else {
        next.model = change.value;
      }
      break;
    case 'tools': {
      const names: string[] = [];
      for (const tool of change.value) {
        const check = checkToolName(tool);
        if (!check.ok) return refuse(`${check.message} The agent keeps its tools.`);
        names.push(check.value);
      }
      if (names.length === 0) {
        delete next.tools;
      } else {
        next.tools = names;
      }
      break;
    }
    case 'body': {
      const check = checkAgentBody(change.value);
      if (!check.ok) return refuse(`${check.message} The agent keeps its body.`);
      next.body = check.value;
      break;
    }
  }
  return { ok: true, config: withAgent(config, flowId, next), id: agentId };
}

/**
 * The warning the panel shows for an agent whose scope is `feature` or `task` and that has no iteration source produced
 * by an upstream block (F-06 AC-028, building-blocks §7). It is the finding of the F-04 analyzer for this agent, so the
 * rule has one implementation. Null when the agent has a source, or its scope is `project`.
 */
export function agentIterationWarning(config: ProjectConfig, flowId: string, agentId: string): string | null {
  requireAgent(config, flowId, agentId);
  const prefix = `agent "${agentId}" has no iteration source`;
  const finding = pipeline.analyzeStructure(config).find((item) => item.message.startsWith(prefix));
  return finding?.message ?? null;
}

function refuse(message: string): BlockEdit {
  return { ok: false, message };
}

/** True when another Agent block in the project (in any flow, enabled or not) already has this name. */
function usedByAnotherAgent(config: ProjectConfig, agentId: string, name: string): boolean {
  return config.pipeline.blocks.some(
    (block) =>
      block.kind === 'flow' &&
      block.blocks.some((child) => child.kind === 'agent' && child.id !== agentId && child.name === name),
  );
}

function requireFlow(config: ProjectConfig, flowId: string): FlowBlock {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  if (flow?.kind !== 'flow') {
    throw new Error(`Unknown flow id: ${flowId}`);
  }
  return flow;
}

/** The Agent block with this id in the flow. An id that is not an Agent block of the flow is a programmer error and throws. */
function requireAgent(config: ProjectConfig, flowId: string, agentId: string): AgentBlock {
  const child: ChildBlock | undefined = requireFlow(config, flowId).blocks.find((block) => block.id === agentId);
  if (child?.kind !== 'agent') {
    throw new Error(`Block ${agentId} is not an Agent block of flow ${flowId}`);
  }
  return child;
}

function withAgent(config: ProjectConfig, flowId: string, agent: AgentBlock): ProjectConfig {
  const pipelineBlocks = config.pipeline.blocks.map((block): PipelineBlock => {
    if (block.kind !== 'flow' || block.id !== flowId) return block;
    return { ...block, blocks: block.blocks.map((child): ChildBlock => (child.id === agent.id ? agent : child)) };
  });
  return { ...config, pipeline: { ...config.pipeline, blocks: pipelineBlocks } };
}
