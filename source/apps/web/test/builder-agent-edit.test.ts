import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addBlock } from '../src/builder/block-edit.js';
import type { BlockEdit } from '../src/builder/block-edit.js';
import { agentFilePath, agentIterationWarning, editAgent } from '../src/builder/agent-edit.js';
import type { AgentChange } from '../src/builder/agent-edit.js';
import { AGENT_BODY_CAP } from '../src/builder/entry-checks.js';

type ProjectConfig = pipeline.ProjectConfig;
type AgentBlock = pipeline.AgentBlock;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: BlockEdit): Extract<BlockEdit, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result;
}

/** The refusal message of an edit that must be refused; fails the test when it applies. */
function refusal(result: BlockEdit): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused, but it applied');
  }
  return result.message;
}

/** The Agent block with this id, read from the configuration. */
function agentOf(config: ProjectConfig, flowId: string, agentId: string): AgentBlock {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  const child = flow?.kind === 'flow' ? flow.blocks.find((block) => block.id === agentId) : undefined;
  if (child?.kind !== 'agent') throw new Error(`no agent ${agentId} in ${flowId}`);
  return child;
}

/** A configuration with one custom agent added to the flow `build`; returns the configuration and the agent's id. */
function withBuildAgent(): { config: ProjectConfig; agentId: string } {
  const result = applied(addBlock(structuredClone(pipeline.defaultProjectConfig), 'build', 'agent', null));
  return { config: result.config, agentId: result.id };
}

/** Applies one agent change and returns the configuration, failing the test on a refusal. */
function change(config: ProjectConfig, flowId: string, agentId: string, next: AgentChange): ProjectConfig {
  return applied(editAgent(config, flowId, agentId, next)).config;
}

describe('F-06 AC-024 the agent file path', () => {
  it('F-06 AC-024 names the file .claude/agents/<name>.md for an agent', () => {
    expect(agentFilePath('security-check')).toBe('.claude/agents/security-check.md');
  });
});

describe('F-06 AC-026 agent name and description', () => {
  it.each(['', 'Security Check!', '1agent', 'a b', 'check/agent', 'Agent'])(
    'F-06 AC-026 refuses the name "%s" at entry and keeps the previous one',
    (name) => {
      const { config, agentId } = withBuildAgent();
      const message = refusal(editAgent(config, 'build', agentId, { field: 'name', value: name }));
      expect(message).toContain('Name:');
      expect(message).toContain(`The agent keeps "${agentOf(config, 'build', agentId).name}".`);
    },
  );

  it('F-06 AC-026 accepts a file-safe name and stores it as typed', () => {
    const { config, agentId } = withBuildAgent();
    const next = change(config, 'build', agentId, { field: 'name', value: 'security-check' });
    expect(agentOf(next, 'build', agentId).name).toBe('security-check');
  });

  it.each(['', '   '])('F-06 AC-026 refuses a blank description "%j" and keeps the previous one', (text) => {
    const { config, agentId } = withBuildAgent();
    const set = change(config, 'build', agentId, { field: 'description', value: 'Checks the work.' });
    const message = refusal(editAgent(set, 'build', agentId, { field: 'description', value: text }));
    expect(message).toContain('Description: required.');
    expect(message).toContain('The agent keeps its description.');
    expect(agentOf(set, 'build', agentId).description).toBe('Checks the work.');
  });

  it('F-06 AC-026 stores the description trimmed', () => {
    const { config, agentId } = withBuildAgent();
    const next = change(config, 'build', agentId, { field: 'description', value: '  Checks the work.  ' });
    expect(agentOf(next, 'build', agentId).description).toBe('Checks the work.');
  });

  it('F-06 AC-026 a refused description leaves the configuration as it was', () => {
    const { config, agentId } = withBuildAgent();
    const before = structuredClone(config);
    refusal(editAgent(config, 'build', agentId, { field: 'description', value: ' ' }));
    expect(config).toEqual(before);
  });
});

describe('F-06 AC-026 agent scope, model and tools', () => {
  it.each(['project', 'feature', 'task'] as const)('F-06 AC-026 accepts the scope "%s"', (scope) => {
    const { config, agentId } = withBuildAgent();
    const next = change(config, 'build', agentId, { field: 'scope', value: scope });
    expect(agentOf(next, 'build', agentId).scope).toBe(scope);
  });

  it.each(['haiku', 'sonnet', 'opus', 'inherit'] as const)('F-06 AC-026 accepts the model "%s"', (model) => {
    const { config, agentId } = withBuildAgent();
    const next = change(config, 'build', agentId, { field: 'model', value: model });
    expect(agentOf(next, 'build', agentId).model).toBe(model);
  });

  it('F-06 AC-026 clears the model when it is set to none, and the key is absent', () => {
    const { config, agentId } = withBuildAgent();
    const set = change(config, 'build', agentId, { field: 'model', value: 'opus' });
    const cleared = change(set, 'build', agentId, { field: 'model', value: undefined });
    expect(agentOf(cleared, 'build', agentId)).not.toHaveProperty('model');
  });

  it('F-06 AC-026 keeps the tool list in the order given', () => {
    const { config, agentId } = withBuildAgent();
    const next = change(config, 'build', agentId, { field: 'tools', value: ['Read', 'Write', 'Bash'] });
    expect(agentOf(next, 'build', agentId).tools).toEqual(['Read', 'Write', 'Bash']);
  });

  it('F-06 AC-026 trims a tool name before it is stored', () => {
    const { config, agentId } = withBuildAgent();
    const next = change(config, 'build', agentId, { field: 'tools', value: [' Read '] });
    expect(agentOf(next, 'build', agentId).tools).toEqual(['Read']);
  });

  it('F-06 AC-026 an empty tool list clears the tools, as the generator writes only what is set', () => {
    const { config, agentId } = withBuildAgent();
    const set = change(config, 'build', agentId, { field: 'tools', value: ['Read'] });
    const cleared = change(set, 'build', agentId, { field: 'tools', value: [] });
    expect(agentOf(cleared, 'build', agentId)).not.toHaveProperty('tools');
  });

  it.each([['Read Write'], ['Read,Write'], ['Read\nWrite'], ['   '], ['']])(
    'F-06 AC-026 refuses the tool name "%j" and keeps the tools',
    (tool) => {
      const { config, agentId } = withBuildAgent();
      const set = change(config, 'build', agentId, { field: 'tools', value: ['Read'] });
      const message = refusal(editAgent(set, 'build', agentId, { field: 'tools', value: ['Edit', tool] }));
      expect(message).toContain('The agent keeps its tools.');
      expect(agentOf(set, 'build', agentId).tools).toEqual(['Read']);
    },
  );
});

describe('F-06 AC-027 agent name is file-safe and unique among Agent blocks', () => {
  it('F-06 AC-027 refuses a name another Agent block in the same flow already uses', () => {
    const { config, agentId } = withBuildAgent();
    const named = change(config, 'build', agentId, { field: 'name', value: 'security-check' });
    const other = applied(addBlock(named, 'build', 'agent', null));
    const message = refusal(editAgent(other.config, 'build', other.id, { field: 'name', value: 'security-check' }));
    expect(message).toContain('already used by another agent in the project');
    const defaultUse = refusal(editAgent(named, 'build', agentId, { field: 'name', value: 'implement' }));
    expect(defaultUse).toContain('already used by another agent in the project');
  });

  it('F-06 AC-027 refuses a name another Agent block in a different flow already uses', () => {
    const { config, agentId } = withBuildAgent();
    const specify = applied(addBlock(config, 'specify', 'agent', null));
    const named = change(specify.config, 'specify', specify.id, { field: 'name', value: 'security-check' });
    const message = refusal(editAgent(named, 'build', agentId, { field: 'name', value: 'security-check' }));
    expect(message).toContain('already used by another agent in the project');
    expect(agentOf(named, 'build', agentId).name).not.toBe('security-check');
  });

  it('F-06 AC-027 keeps the agent its own name when it sets the same name again', () => {
    const { config, agentId } = withBuildAgent();
    const named = change(config, 'build', agentId, { field: 'name', value: 'security-check' });
    const again = applied(editAgent(named, 'build', agentId, { field: 'name', value: 'security-check' }));
    expect(agentOf(again.config, 'build', agentId).name).toBe('security-check');
  });

  it('F-06 AC-027 names a new agent after its id when no Agent block has that name', () => {
    const { config, agentId } = withBuildAgent();
    expect(agentOf(config, 'build', agentId).name).toBe(agentId);
  });

  it('F-06 AC-027 gives a new agent a free name when another Agent block already uses its id as name', () => {
    const renamed = change(structuredClone(pipeline.defaultProjectConfig), 'specify', 'specify-agent', {
      field: 'name',
      value: 'build-agent',
    });
    const added = applied(addBlock(renamed, 'build', 'agent', null));
    expect(added.id).toBe('build-agent');
    expect(agentOf(added.config, 'build', added.id).name).toBe('build-agent-2');
    expect(pipeline.parsePipelineConfig(added.config).ok).toBe(true);
    const message = refusal(editAgent(added.config, 'build', added.id, { field: 'name', value: 'build-agent' }));
    expect(message).toContain('already used by another agent in the project');
  });

  it('F-06 AC-027 gives two agents added to one flow different names', () => {
    const first = applied(addBlock(structuredClone(pipeline.defaultProjectConfig), 'build', 'agent', null));
    const second = applied(addBlock(first.config, 'build', 'agent', null));
    const names = [first.id, second.id].map((id) => agentOf(second.config, 'build', id).name);
    expect(new Set(names).size).toBe(2);
  });

  it('F-06 AC-027 a refused name leaves the configuration as it was', () => {
    const { config, agentId } = withBuildAgent();
    const before = structuredClone(config);
    refusal(editAgent(config, 'build', agentId, { field: 'name', value: 'Security Check!' }));
    expect(config).toEqual(before);
  });
});

describe('F-06 AC-028 an iteration source for feature and task scopes', () => {
  /** A configuration whose first flow `specify` holds one agent and declares no pipeline argument. */
  function firstFlowAgent(declaresArgument: boolean): { config: ProjectConfig; agentId: string } {
    const config = structuredClone(pipeline.defaultProjectConfig);
    const start = config.pipeline.blocks.find((block) => block.kind === 'start');
    if (start?.kind !== 'start') throw new Error('no pipeline start');
    start.arguments = declaresArgument ? [{ name: 'feature', required: true, hint: 'the feature' }] : [];
    const withAgent = applied(addBlock(config, 'specify', 'agent', null));
    return { config: withAgent.config, agentId: withAgent.id };
  }

  it('F-06 AC-028 warns a feature-scope agent with no iteration source in the first flow', () => {
    const { config, agentId } = firstFlowAgent(false);
    const scoped = change(config, 'specify', agentId, { field: 'scope', value: 'feature' });
    expect(agentIterationWarning(scoped, 'specify', agentId)).toContain(`agent "${agentId}" has no iteration source`);
  });

  it('F-06 AC-028 warns a task-scope agent with no iteration source', () => {
    const { config, agentId } = firstFlowAgent(false);
    const scoped = change(config, 'specify', agentId, { field: 'scope', value: 'task' });
    expect(agentIterationWarning(scoped, 'specify', agentId)).not.toBeNull();
  });

  it('F-06 AC-028 gives no warning when the first flow declares a pipeline argument', () => {
    const { config, agentId } = firstFlowAgent(true);
    const scoped = change(config, 'specify', agentId, { field: 'scope', value: 'feature' });
    expect(agentIterationWarning(scoped, 'specify', agentId)).toBeNull();
  });

  it('F-06 AC-028 gives no warning for a project-scope agent, and the warning is not a refusal', () => {
    const { config, agentId } = firstFlowAgent(false);
    expect(agentIterationWarning(config, 'specify', agentId)).toBeNull();
    const scoped = change(config, 'specify', agentId, { field: 'scope', value: 'feature' });
    expect(agentOf(scoped, 'specify', agentId).scope).toBe('feature');
  });

  it('F-06 AC-028 the default pipeline has no agent without an iteration source', () => {
    const config = pipeline.defaultProjectConfig;
    const agents = config.pipeline.blocks.flatMap((block) =>
      block.kind === 'flow'
        ? block.blocks.filter((child): child is AgentBlock => child.kind === 'agent').map((child) => [block.id, child.id] as const)
        : [],
    );
    expect(agents.length).toBeGreaterThan(0);
    for (const [flowId, agentId] of agents) {
      expect(agentIterationWarning(config, flowId, agentId)).toBeNull();
    }
  });
});

describe('F-06 AC-029 a custom agent from the flow toolbox', () => {
  it('F-06 AC-029 adds an Agent block to a flow with the properties of an Agent block', () => {
    const { config, agentId } = withBuildAgent();
    const agent = agentOf(config, 'build', agentId);
    expect(agent).toMatchObject({ kind: 'agent', enabled: true, scope: 'project' });
    expect(agent.description.length).toBeGreaterThan(0);
  });

  it('F-06 AC-029 a configuration with a custom agent is a valid pipeline after its settings are set', () => {
    const { config, agentId } = withBuildAgent();
    let next = change(config, 'build', agentId, { field: 'name', value: 'security-check' });
    next = change(next, 'build', agentId, { field: 'description', value: 'Checks the security of the change.' });
    next = change(next, 'build', agentId, { field: 'scope', value: 'task' });
    expect(pipeline.parsePipelineConfig(next).ok).toBe(true);
  });

  it('F-06 AC-029 a flow may have no custom agent: the default pipeline parses without one', () => {
    expect(pipeline.parsePipelineConfig(pipeline.defaultProjectConfig).ok).toBe(true);
  });
});

describe('F-06 AC-030 agent body cap', () => {
  it('F-06 AC-030 accepts a body of exactly 4,000 characters', () => {
    const { config, agentId } = withBuildAgent();
    const body = 'x'.repeat(AGENT_BODY_CAP);
    const next = change(config, 'build', agentId, { field: 'body', value: body });
    expect(agentOf(next, 'build', agentId).body).toBe(body);
  });

  it('F-06 AC-030 refuses a body of 4,001 characters with the count and the cut', () => {
    const { config, agentId } = withBuildAgent();
    const message = refusal(editAgent(config, 'build', agentId, { field: 'body', value: 'x'.repeat(AGENT_BODY_CAP + 1) }));
    expect(message).toContain(`Body: 4001 / ${AGENT_BODY_CAP}. Cut 1 characters.`);
    expect(message).toContain('The agent keeps its body.');
  });

  it('F-06 AC-030 a refused body leaves the previous body in place', () => {
    const { config, agentId } = withBuildAgent();
    const set = change(config, 'build', agentId, { field: 'body', value: 'Keep this.' });
    refusal(editAgent(set, 'build', agentId, { field: 'body', value: 'x'.repeat(AGENT_BODY_CAP + 1) }));
    expect(agentOf(set, 'build', agentId).body).toBe('Keep this.');
  });
});

describe('F-06 AC-031 a custom agent keeps the properties the generator needs', () => {
  it('F-06 AC-031 keeps name, description, model, tools and body together, and the result parses', () => {
    const { config, agentId } = withBuildAgent();
    let next = change(config, 'build', agentId, { field: 'name', value: 'security-check' });
    next = change(next, 'build', agentId, { field: 'description', value: 'Checks the security of the change.' });
    next = change(next, 'build', agentId, { field: 'model', value: 'haiku' });
    next = change(next, 'build', agentId, { field: 'tools', value: ['Read', 'Bash'] });
    next = change(next, 'build', agentId, { field: 'body', value: 'Review the change for secrets.' });
    const agent = agentOf(next, 'build', agentId);
    expect(agent).toMatchObject({
      name: 'security-check',
      description: 'Checks the security of the change.',
      model: 'haiku',
      tools: ['Read', 'Bash'],
      body: 'Review the change for secrets.',
    });
    expect(agentFilePath(agent.name)).toBe('.claude/agents/security-check.md');
    expect(pipeline.parsePipelineConfig(next).ok).toBe(true);
  });

  it('F-06 AC-031 an unset model, tools and body are absent, so the generator writes no line for them', () => {
    const { config, agentId } = withBuildAgent();
    const agent = agentOf(config, 'build', agentId);
    expect(agent).not.toHaveProperty('model');
    expect(agent).not.toHaveProperty('tools');
    expect(agent).not.toHaveProperty('body');
  });

  it('F-06 AC-031 an unknown agent id throws, as a programmer error', () => {
    const { config } = withBuildAgent();
    expect(() => editAgent(config, 'build', 'no-such-agent', { field: 'body', value: 'x' })).toThrow(
      'Block no-such-agent is not an Agent block of flow build',
    );
  });
});
