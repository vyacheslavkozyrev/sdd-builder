import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import type { AgentBlock, Block, Flow, Pipeline } from '../../src/pipeline/model.js';
import { checkBlockLinks } from '../../src/pipeline/check/block-links.js';
import { checkEndArtifacts } from '../../src/pipeline/check/end-artifact.js';
import { checkFlowLinks, checkFlowNames } from '../../src/pipeline/check/flow-links.js';
import { checkIdsUnique } from '../../src/pipeline/check/ids.js';
import { checkRuleTags } from '../../src/pipeline/check/rule-tags.js';
import { problemsOf } from './problems-of.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';

// The default pipeline is read through the parser, so the structure tests work on typed values.
function readDefault(): { pipeline: Pipeline; problems: readonly { path: string; message: string }[] } {
  const problems = createProblemCollector();
  const pipeline = readPipeline(defaultPipeline, 'pipeline', problems);
  if (pipeline === undefined) throw new Error('the default pipeline did not parse');
  return { pipeline, problems: problems.list() };
}

function blocksOf(flow: Flow, kind: Block['kind']): Block[] {
  return flow.blocks.filter((block) => block.kind === kind);
}

// The one block of a kind in a flow; a flow with another number of them fails the test at once.
function onlyBlock<K extends Block['kind']>(flow: Flow, kind: K): Extract<Block, { kind: K }> {
  const found = flow.blocks.filter((block): block is Extract<Block, { kind: K }> => block.kind === kind);
  const [only] = found;
  if (only === undefined || found.length !== 1) throw new Error(`${flow.id} has ${found.length} ${kind} blocks`);
  return only;
}

function agentsOf(flow: Flow): AgentBlock[] {
  return flow.blocks.filter((block): block is AgentBlock => block.kind === 'agent');
}

function flowById(pipeline: Pipeline, id: string): Flow {
  const flow = pipeline.flows.find((candidate) => candidate.id === id);
  if (flow === undefined) throw new Error(`no flow ${id}`);
  return flow;
}

const FLOW_ORDER = ['specify', 'ux', 'plan', 'build', 'verify', 'complete'];

describe('F-02 AC-077 the default pipeline parses with no problems in a schemaVersion 2 config', () => {
  it('parses the default pipeline placed in a config with an empty rules list', () => {
    const config = { schemaVersion: 2, rules: [], pipeline: defaultPipeline };
    expect(problemsOf(config)).toEqual([]);
  });

  it('reads the default pipeline through the pipeline reader with no problems', () => {
    expect(readDefault().problems).toEqual([]);
  });

  it('passes every cross-project check (ids unique, links, end artifacts, rule tags) with no problems', () => {
    const { pipeline } = readDefault();
    const config = { rules: [], pipeline };
    expect(checkIdsUnique(config)).toEqual([]);
    expect(checkFlowNames(config)).toEqual([]);
    expect(checkFlowLinks(config)).toEqual([]);
    expect(checkBlockLinks(config)).toEqual([]);
    expect(checkEndArtifacts(config)).toEqual([]);
    expect(checkRuleTags(config)).toEqual([]);
  });

  it('refuses a clashing block id in a copy of the default, so the id check is live on it', () => {
    const { pipeline } = readDefault();
    // The Start of verify takes the id of the Start of specify.
    const flows = pipeline.flows.map((flow) =>
      flow.id === 'verify'
        ? { ...flow, blocks: flow.blocks.map((block, at) => (at === 0 ? { ...block, id: 'specify-start' } : block)) }
        : flow,
    );
    expect(checkIdsUnique({ rules: [], pipeline: { ...pipeline, flows } }).length).toBeGreaterThan(0);
  });
});

describe('F-02 AC-078 the default pipeline has six linked flows in order', () => {
  it('has the flows specify, ux, plan, build, verify and complete, in this order', () => {
    const { pipeline } = readDefault();
    expect(pipeline.flows.map((flow) => flow.id)).toEqual(FLOW_ORDER);
  });

  it('starts at specify, which no next link names: the links name exactly the five flows after it', () => {
    const { pipeline } = readDefault();
    const named = pipeline.flows.map((flow) => flow.next).filter((next) => next !== undefined);
    expect(named).toEqual(FLOW_ORDER.slice(1));
  });

  it('gives each flow a next that names the following flow, and complete no next', () => {
    const { pipeline } = readDefault();
    FLOW_ORDER.slice(0, -1).forEach((id, position) => {
      expect(flowById(pipeline, id).next).toBe(FLOW_ORDER[position + 1]);
    });
    expect(flowById(pipeline, 'complete').next).toBeUndefined();
  });
});

describe('F-02 AC-079 each default flow has one Start, one End and at least one Agent', () => {
  it('gives every flow exactly one Start, exactly one End and at least one Agent', () => {
    const { pipeline } = readDefault();
    for (const flow of pipeline.flows) {
      expect(blocksOf(flow, 'start'), flow.id).toHaveLength(1);
      expect(blocksOf(flow, 'end'), flow.id).toHaveLength(1);
      expect(agentsOf(flow).length, flow.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('gives the agents of the default pipeline unique names', () => {
    const { pipeline } = readDefault();
    const names = pipeline.flows.flatMap((flow) => agentsOf(flow).map((agent) => agent.name));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('F-02 AC-080 the build flow has one check after its last work agent, before the commit agent and its end', () => {
  const CHECK_TEXT = 'the build shows 0 errors, 0 warnings, 0 lint errors and all tests pass';

  // The commit agent is the one named commit; every other agent of the build flow is a work agent.
  function commitAgentOf(build: Flow): AgentBlock {
    const [commit] = agentsOf(build).filter((agent) => agent.name === 'commit');
    if (commit === undefined) throw new Error('build has no commit agent');
    return commit;
  }

  it('has exactly one condition, placed after its last work agent, before the commit agent and before its end', () => {
    const build = flowById(readDefault().pipeline, 'build');
    const condition = onlyBlock(build, 'condition');
    const conditionAt = build.blocks.indexOf(condition);
    const lastWorkAgentAt = Math.max(
      ...build.blocks.map((block, at) => (block.kind === 'agent' && block.name !== 'commit' ? at : -1)),
    );
    const commitAt = build.blocks.indexOf(commitAgentOf(build));
    const endAt = build.blocks.findIndex((block) => block.kind === 'end');
    expect(conditionAt).toBeGreaterThan(lastWorkAgentAt);
    expect(conditionAt).toBeLessThan(commitAt);
    expect(conditionAt).toBeLessThan(endAt);
  });

  it('keeps the build blocks in the order implement, review, test, condition, commit, end', () => {
    const build = flowById(readDefault().pipeline, 'build');
    const order = build.blocks.map((block) => (block.kind === 'agent' ? `agent ${block.name}` : block.kind));
    expect(order).toEqual(['start', 'agent implement', 'agent review', 'agent test', 'condition', 'agent commit', 'end']);
  });

  it('has the required description, a true route to the commit agent and a false route that stops the flow', () => {
    const build = flowById(readDefault().pipeline, 'build');
    const condition = onlyBlock(build, 'condition');
    expect(condition.description).toBe(CHECK_TEXT);
    expect(condition.true).toEqual({ to: commitAgentOf(build).id });
    expect(condition.false).toEqual({ stop: true });
  });

  it('links the commit agent to the end, which follows the check', () => {
    const build = flowById(readDefault().pipeline, 'build');
    expect(commitAgentOf(build).next).toBe(onlyBlock(build, 'end').id);
  });
});

describe('F-02 AC-081 approval is on for specify, ux, plan and verify only', () => {
  it('sets approval true for specify, ux, plan and verify, and false for build and complete', () => {
    const { pipeline } = readDefault();
    const approvals = Object.fromEntries(pipeline.flows.map((flow) => [flow.id, flow.approval]));
    expect(approvals).toEqual({
      specify: true,
      ux: true,
      plan: true,
      build: false,
      verify: true,
      complete: false,
    });
  });
});

describe('F-02 AC-082 each End names an artifact of its flow, and every artifact has a label', () => {
  it('names in each End the label of one of the flow artifacts', () => {
    const { pipeline } = readDefault();
    for (const flow of pipeline.flows) {
      const end = onlyBlock(flow, 'end');
      const labels = flow.artifacts.map((artifact) => artifact.label);
      expect(labels, flow.id).toContain(end.producedArtifact);
    }
  });

  it('gives every artifact of the default flows a non-blank label', () => {
    const { pipeline } = readDefault();
    const labels = pipeline.flows.flatMap((flow) => flow.artifacts.map((artifact) => artifact.label));
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.trim()).not.toBe('');
    }
  });
});

describe('F-02 AC-083 the default pipeline has name, description and a required feature-id argument', () => {
  it('has a name, a description and arguments', () => {
    const { pipeline } = readDefault();
    expect(pipeline.name.trim()).not.toBe('');
    expect(pipeline.description.trim()).not.toBe('');
    expect(pipeline.arguments.length).toBeGreaterThan(0);
  });

  it('includes the argument feature-id, which is required', () => {
    const { pipeline } = readDefault();
    const featureId = pipeline.arguments.find((row) => row.id === 'feature-id');
    expect(featureId).toBeDefined();
    expect(featureId?.required).toBe(true);
  });
});
