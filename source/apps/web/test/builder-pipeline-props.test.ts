import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pipeline, templateSourceFromRecord } from '@sddbuilder/core';
import {
  addArgument,
  editArgument,
  editPipeline,
  PIPELINE_COMMAND_FILE,
  removeArgument,
  setRuleTags,
} from '../src/builder/pipeline-edit.js';
import type { ConfigEdit } from '../src/builder/flow-edit.js';
import { addBlock } from '../src/builder/block-edit.js';
import { AGENT_BODY_CAP } from '../src/builder/entry-checks.js';

/** The template folder of the repository, `source/templates`. */
const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', '..', 'templates');

type ProjectConfig = pipeline.ProjectConfig;
type PipelineStartBlock = pipeline.PipelineStartBlock;
type AgentBlock = pipeline.AgentBlock;
type FlowBlock = pipeline.FlowBlock;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: ConfigEdit): ProjectConfig {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result.config;
}

/** The refusal message of an edit that must be refused; fails the test when it applies. */
function refusal(result: ConfigEdit): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused, but it applied');
  }
  return result.message;
}

/** A fresh copy of the default pipeline, so that no test changes the shared default. */
function fresh(): ProjectConfig {
  return structuredClone(pipeline.defaultProjectConfig);
}

/** The pipeline's Start block. */
function startOf(config: ProjectConfig): PipelineStartBlock {
  const start = config.pipeline.blocks.find((block): block is PipelineStartBlock => block.kind === 'start');
  if (start === undefined) throw new Error('no pipeline start');
  return start;
}

/** A configuration whose pipeline Start takes exactly these argument names, all optional with the hint "h". */
function withArgumentNames(names: string[]): ProjectConfig {
  const config = fresh();
  const start = startOf(config);
  start.arguments = names.map((name) => ({ name, required: false, hint: 'h' }));
  return config;
}

/** A configuration with one custom agent in the flow `build`; returns the configuration and the agent's id. */
function withBuildAgent(): { config: ProjectConfig; agentId: string } {
  const result = addBlock(fresh(), 'build', 'agent', null);
  if (!result.ok) throw new Error(result.message);
  return { config: result.config, agentId: result.id };
}

/** The Agent block with this id in the flow. */
function agentOf(config: ProjectConfig, flowId: string, agentId: string): AgentBlock {
  const flow = config.pipeline.blocks.find((block): block is FlowBlock => block.kind === 'flow' && block.id === flowId);
  const child = flow?.blocks.find((block) => block.id === agentId);
  if (child?.kind !== 'agent') throw new Error(`no agent ${agentId} in ${flowId}`);
  return child;
}

/** The flow `build`. */
function buildFlowOf(config: ProjectConfig): FlowBlock {
  const flow = config.pipeline.blocks.find((block): block is FlowBlock => block.kind === 'flow' && block.id === 'build');
  if (flow === undefined) throw new Error('no build flow');
  return flow;
}

/** Every file under source/templates, keyed by its path relative to that folder (read once, no network). */
function realTemplates(dir: string, current = dir, files: Record<string, string> = {}): Record<string, string> {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const full = join(current, entry.name);
    if (entry.isDirectory()) {
      realTemplates(dir, full, files);
    } else {
      files[relative(dir, full).split(sep).join('/')] = readFileSync(full, 'utf8');
    }
  }
  return files;
}

describe('F-06 AC-024 the pipeline panel file', () => {
  it('F-06 AC-024 the pipeline panel generates .claude/commands/pipeline.md', () => {
    expect(PIPELINE_COMMAND_FILE).toBe('.claude/commands/pipeline.md');
  });

  it('F-06 AC-024 the panel file is the pipeline command path that core plans for the default pipeline', () => {
    const templates = templateSourceFromRecord(realTemplates(TEMPLATES_DIR));
    const planned = pipeline.planGeneration(pipeline.defaultProjectConfig, templates).map((entry) => entry.path);
    expect(planned).toContain(PIPELINE_COMMAND_FILE);
  });
});

describe('F-06 AC-025 rule tags on Agent blocks, flows and the pipeline', () => {
  it('F-06 AC-025 accepts a file-safe rule name on an agent, a flow and the pipeline', () => {
    const { config, agentId } = withBuildAgent();
    const tags = ['typescript', 'qa-rules'];
    const onAgent = applied(setRuleTags(config, { kind: 'agent', flowId: 'build', agentId }, tags));
    expect(agentOf(onAgent, 'build', agentId).ruleTags).toEqual(tags);
    const onFlow = applied(setRuleTags(config, { kind: 'flow', flowId: 'build' }, tags));
    expect(buildFlowOf(onFlow).ruleTags).toEqual(tags);
    const onPipeline = applied(setRuleTags(config, { kind: 'pipeline' }, tags));
    expect(onPipeline.pipeline.ruleTags).toEqual(tags);
  });

  it('F-06 AC-025 trims a tag before it is stored', () => {
    const next = applied(setRuleTags(fresh(), { kind: 'flow', flowId: 'build' }, ['  general  ']));
    expect(buildFlowOf(next).ruleTags).toEqual(['general']);
  });

  it.each([
    ['a folder', 'rules/typescript'],
    ['a path with a dot', '../secrets'],
    ['an upper-case letter', 'TypeScript'],
    ['a space', 'type script'],
    ['a leading digit', '1rule'],
    ['an empty tag', ''],
    ['a blank tag', '   '],
  ])('F-06 AC-025 refuses a rule tag with %s', (_label, tag) => {
    const config = fresh();
    const message = refusal(setRuleTags(config, { kind: 'flow', flowId: 'build' }, [tag]));
    expect(message).toContain('without the folder');
    expect(message).toContain('The flow keeps its rule tags.');
  });

  it('F-06 AC-025 refuses a repeated tag on the same block and keeps the previous tags', () => {
    const config = applied(setRuleTags(fresh(), { kind: 'flow', flowId: 'build' }, ['general']));
    const message = refusal(setRuleTags(config, { kind: 'flow', flowId: 'build' }, ['general', 'general']));
    expect(message).toContain('"general" is already on this flow');
    expect(buildFlowOf(config).ruleTags).toEqual(['general']);
  });

  it('F-06 AC-025 refuses a repeat written with different spaces around it', () => {
    const message = refusal(setRuleTags(fresh(), { kind: 'pipeline' }, ['general', ' general ']));
    expect(message).toContain('already on this pipeline');
  });

  it('F-06 AC-025 accepts the same tag on two different blocks', () => {
    const { config, agentId } = withBuildAgent();
    const withFlow = applied(setRuleTags(config, { kind: 'flow', flowId: 'build' }, ['general']));
    const withAgent = applied(setRuleTags(withFlow, { kind: 'agent', flowId: 'build', agentId }, ['general']));
    expect(buildFlowOf(withAgent).ruleTags).toEqual(['general']);
    expect(agentOf(withAgent, 'build', agentId).ruleTags).toEqual(['general']);
  });

  it('F-06 AC-025 clears the tags when the list is empty', () => {
    const tagged = applied(setRuleTags(fresh(), { kind: 'pipeline' }, ['general']));
    const cleared = applied(setRuleTags(tagged, { kind: 'pipeline' }, []));
    expect(cleared.pipeline).not.toHaveProperty('ruleTags');
  });

  it('F-06 AC-025 keeps the owner unchanged when one tag of the list is refused', () => {
    const config = applied(setRuleTags(fresh(), { kind: 'flow', flowId: 'build' }, ['general']));
    const before = structuredClone(config);
    refusal(setRuleTags(config, { kind: 'flow', flowId: 'build' }, ['general', 'bad/tag']));
    expect(config).toEqual(before);
  });

  it('F-06 AC-025 throws for an agent id that is not an Agent block of the flow', () => {
    expect(() => setRuleTags(fresh(), { kind: 'agent', flowId: 'build', agentId: 'no-such-agent' }, ['general'])).toThrow(
      /not an Agent block/,
    );
  });

  it('F-06 AC-025 throws for an unknown flow id', () => {
    expect(() => setRuleTags(fresh(), { kind: 'flow', flowId: 'no-such-flow' }, ['general'])).toThrow(/Unknown flow id/);
  });
});

describe('F-06 AC-042 pipeline properties', () => {
  it('F-06 AC-042 sets the name, trimmed, and the description', () => {
    const named = applied(editPipeline(fresh(), { field: 'name', value: '  Delivery  ' }));
    expect(named.pipeline.name).toBe('Delivery');
    const described = applied(editPipeline(named, { field: 'description', value: ' Ships a feature. ' }));
    expect(described.pipeline.description).toBe('Ships a feature.');
  });

  it('F-06 AC-042 clears the description when it is left blank', () => {
    const described = applied(editPipeline(fresh(), { field: 'description', value: 'Ships a feature.' }));
    const cleared = applied(editPipeline(described, { field: 'description', value: '   ' }));
    expect(cleared.pipeline).not.toHaveProperty('description');
  });

  it('F-06 AC-042 sets and clears the model', () => {
    const set = applied(editPipeline(fresh(), { field: 'model', value: 'opus' }));
    expect(set.pipeline.model).toBe('opus');
    const cleared = applied(editPipeline(set, { field: 'model', value: undefined }));
    expect(cleared.pipeline).not.toHaveProperty('model');
  });

  it('F-06 AC-042 sets the tool list and clears it when empty', () => {
    const set = applied(editPipeline(fresh(), { field: 'tools', value: [' Read ', 'Bash(git:*)'] }));
    expect(set.pipeline.tools).toEqual(['Read', 'Bash(git:*)']);
    const cleared = applied(editPipeline(set, { field: 'tools', value: [] }));
    expect(cleared.pipeline).not.toHaveProperty('tools');
  });

  it.each([
    ['a blank tool', ['Read', '  ']],
    ['a tool with a space', ['Read Write']],
    ['a tool with a comma', ['Read,Write']],
  ])('F-06 AC-042 refuses %s and keeps the tools', (_label, tools) => {
    const set = applied(editPipeline(fresh(), { field: 'tools', value: ['Read'] }));
    const message = refusal(editPipeline(set, { field: 'tools', value: tools }));
    expect(message).toContain('The pipeline keeps its tools.');
    expect(set.pipeline.tools).toEqual(['Read']);
  });

  it('F-06 AC-042 sets the body as typed', () => {
    const body = 'Line one.\n\nLine two.';
    const next = applied(editPipeline(fresh(), { field: 'body', value: body }));
    expect(next.pipeline.body).toBe(body);
  });

  it('F-06 AC-042 refuses a blank name and keeps the name', () => {
    const config = fresh();
    const message = refusal(editPipeline(config, { field: 'name', value: '   ' }));
    expect(message).toBe('The pipeline needs a name. The pipeline keeps its name.');
    expect(config.pipeline.name).toBe(pipeline.defaultProjectConfig.pipeline.name);
  });

  it('F-06 AC-042 accepts a body of exactly the cap, and refuses one character more, keeping the body', () => {
    const atCap = 'x'.repeat(AGENT_BODY_CAP);
    const kept = applied(editPipeline(fresh(), { field: 'body', value: atCap }));
    expect(kept.pipeline.body).toBe(atCap);
    const over = 'x'.repeat(AGENT_BODY_CAP + 1);
    const message = refusal(editPipeline(kept, { field: 'body', value: over }));
    expect(message).toContain('The pipeline keeps its body.');
    expect(kept.pipeline.body).toBe(atCap);
  });

  it('F-06 AC-042 leaves the flows and the Start of the pipeline unchanged', () => {
    const config = fresh();
    const next = applied(editPipeline(config, { field: 'name', value: 'Other' }));
    expect(next.pipeline.blocks).toEqual(config.pipeline.blocks);
  });
});

describe('F-06 AC-042 pipeline arguments', () => {
  it('F-06 AC-042 adds an argument with a name no other argument uses, optional, with an empty hint', () => {
    const next = applied(addArgument(withArgumentNames([])));
    expect(startOf(next).arguments).toEqual([{ name: 'argument', required: false, hint: '' }]);
  });

  it('F-06 AC-042 gives each new argument a name that is still unique', () => {
    const config = withArgumentNames(['argument', 'argument-2']);
    const next = applied(addArgument(config));
    expect(startOf(next).arguments.map((arg) => arg.name)).toEqual(['argument', 'argument-2', 'argument-3']);
  });

  it('F-06 AC-042 refuses a name another row already uses, names the row and keeps its name', () => {
    const config = withArgumentNames(['feature-id', 'task']);
    const message = refusal(editArgument(config, 1, { field: 'name', value: 'feature-id' }));
    expect(message).toBe('Row 2: name already used. Rename it. The row keeps "task".');
    expect(startOf(config).arguments.map((arg) => arg.name)).toEqual(['feature-id', 'task']);
  });

  it('F-06 AC-042 accepts a name equal to its own current name', () => {
    const config = withArgumentNames(['feature-id']);
    const next = applied(editArgument(config, 0, { field: 'name', value: 'feature-id' }));
    expect(startOf(next).arguments[0]?.name).toBe('feature-id');
  });

  it.each([
    ['an upper-case letter', 'Feature'],
    ['a space', 'feature id'],
    ['an empty name', ''],
  ])('F-06 AC-042 refuses a name with %s, naming the row', (_label, name) => {
    const config = withArgumentNames(['feature-id']);
    const message = refusal(editArgument(config, 0, { field: 'name', value: name }));
    expect(message).toMatch(/^Row 1: name must be lowercase letters, digits and hyphens/);
    expect(startOf(config).arguments[0]?.name).toBe('feature-id');
  });

  it('F-06 AC-042 sets the required flag and the hint of a row', () => {
    const config = withArgumentNames(['feature-id']);
    const required = applied(editArgument(config, 0, { field: 'required', value: true }));
    const hinted = applied(editArgument(required, 0, { field: 'hint', value: '  F-XX  ' }));
    expect(startOf(hinted).arguments[0]).toEqual({ name: 'feature-id', required: true, hint: 'F-XX' });
  });

  it('F-06 AC-042 removes a row and keeps the order of the others', () => {
    const config = withArgumentNames(['a-one', 'b-two', 'c-three']);
    const next = applied(removeArgument(config, 1));
    expect(startOf(next).arguments.map((arg) => arg.name)).toEqual(['a-one', 'c-three']);
  });

  it('F-06 AC-042 throws for a row that does not exist', () => {
    const config = withArgumentNames(['feature-id']);
    expect(() => editArgument(config, 3, { field: 'hint', value: 'x' })).toThrow(/No argument in row 4/);
    expect(() => removeArgument(config, 3)).toThrow(/No argument in row 4/);
  });

  it('F-06 AC-042 does not change the configuration it is given', () => {
    const config = withArgumentNames(['feature-id']);
    const before = structuredClone(config);
    applied(addArgument(config));
    applied(editPipeline(config, { field: 'name', value: 'Other' }));
    expect(config).toEqual(before);
  });
});
