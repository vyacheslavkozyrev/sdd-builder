import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { checkRuleTags } from '../../src/pipeline/check/rule-tags.js';
import { readRuleTags } from '../../src/pipeline/parse/lists.js';
import type { AgentBlock, Block, Flow, ProjectConfig, Rule, RuleTag } from '../../src/pipeline/model.js';

// The items of a fixture are numbered by position, as a parsed document numbers them (model `index`).
function numbered<T extends { readonly index: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, index }));
}

// Rule tags as a list read from the document: each tag keeps its position.
function tags(...ruleIds: string[]): RuleTag[] {
  return ruleIds.map((ruleId, index) => ({ ruleId, index }));
}

function rule(id: string): Rule {
  return { index: 0, id, title: 'Title', text: 'Text' };
}

function agent(id: string, ruleTags?: readonly string[]): AgentBlock {
  return {
    index: 0,
    id,
    kind: 'agent',
    name: id,
    description: 'Description',
    arguments: [],
    next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
    ...(ruleTags === undefined ? {} : { ruleTags: tags(...ruleTags) }),
  };
}

function flow(id: string, options: { ruleTags?: readonly string[]; blocks?: readonly Block[] } = {}): Flow {
  return {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Body',
    artifacts: [],
    approval: false,
    blocks: numbered(options.blocks ?? []),
    ...(options.ruleTags === undefined ? {} : { ruleTags: tags(...options.ruleTags) }),
  };
}

function config(
  rules: readonly Rule[],
  options: { pipelineTags?: readonly string[]; flows?: readonly Flow[] } = {},
): Pick<ProjectConfig, 'rules' | 'pipeline'> {
  return {
    rules: numbered(rules),
    pipeline: {
      name: 'Pipeline',
      description: 'Desc',
      arguments: [],
      flows: numbered(options.flows ?? []),
      ...(options.pipelineTags === undefined ? {} : { ruleTags: tags(...options.pipelineTags) }),
    },
  };
}

describe('F-02 AC-070 a rule tag on the pipeline names a rule of the project', () => {
  it('accepts a pipeline tag that names a rule', () => {
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { pipelineTags: ['8f99cc27-78ab-5895-8637-5c13d7429593'] }))).toEqual([]);
  });

  it('refuses a pipeline tag that names no rule, at the path of the tag', () => {
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { pipelineTags: ['8f99cc27-78ab-5895-8637-5c13d7429593', '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e'] }))).toEqual([
      { path: 'pipeline.ruleTags.1', message: 'must name a rule of this project, got 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
    ]);
  });

  it('refuses any pipeline tag when the project has no rules', () => {
    expect(checkRuleTags(config([], { pipelineTags: ['8f99cc27-78ab-5895-8637-5c13d7429593'] }))).toEqual([
      { path: 'pipeline.ruleTags.0', message: 'must name a rule of this project, got 8f99cc27-78ab-5895-8637-5c13d7429593' },
    ]);
  });
});

describe('F-02 AC-070 a rule tag on a flow names a rule of the project', () => {
  it('accepts a flow tag that names a rule', () => {
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', { ruleTags: ['8f99cc27-78ab-5895-8637-5c13d7429593'] })] }))).toEqual([]);
  });

  it('refuses a flow tag that names no rule, at the path of the tag in that flow', () => {
    const flows = [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92'), flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', { ruleTags: ['71b2ecbc-b1ec-5b8f-b792-a30a35989a2e'] })];
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { flows }))).toEqual([
      { path: 'pipeline.flows.1.ruleTags.0', message: 'must name a rule of this project, got 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
    ]);
  });
});

describe('F-02 AC-052 AC-070 a rule tag on an agent names a rule of the project', () => {
  it('accepts an agent tag that names a rule', () => {
    const flows = [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', { blocks: [agent('82c969a4-365a-5525-8168-6ae1093b1867', ['8f99cc27-78ab-5895-8637-5c13d7429593'])] })];
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { flows }))).toEqual([]);
  });

  it('refuses an agent tag that names no rule, at the path of the tag in that block', () => {
    const flows = [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', { blocks: [agent('97c251f5-ea52-5723-9ca7-d23fd6b46650'), agent('82c969a4-365a-5525-8168-6ae1093b1867', ['8f99cc27-78ab-5895-8637-5c13d7429593', '4eb0807b-84e6-54ea-b7f4-e73845fddbfa'])] })];
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { flows }))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.ruleTags.1',
        message: 'must name a rule of this project, got 4eb0807b-84e6-54ea-b7f4-e73845fddbfa',
      },
    ]);
  });
});

describe('F-02 AC-070 rule tags are checked by the exact rule id', () => {
  it('refuses a tag that differs from a rule id only in case', () => {
    expect(checkRuleTags(config([rule('8f99cc27-78ab-5895-8637-5c13d7429593')], { pipelineTags: ['Style'] }))).toEqual([
      { path: 'pipeline.ruleTags.0', message: 'must name a rule of this project, got Style' },
    ]);
  });
});

describe('F-02 AC-070 problems come in document order', () => {
  it('lists the pipeline tag first, then flow tags, then agent tags', () => {
    const flows = [
      flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', { ruleTags: ['fdac7165-b540-5201-bca7-029a056ea40e'], blocks: [agent('82c969a4-365a-5525-8168-6ae1093b1867', ['b'])] }),
      flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', { ruleTags: ['c3250c18-d047-5f77-9456-b24446aad79a'] }),
    ];
    const problems = checkRuleTags(config([], { pipelineTags: ['z'], flows }));
    expect(problems.map((problem) => problem.path)).toEqual([
      'pipeline.ruleTags.0',
      'pipeline.flows.0.ruleTags.0',
      'pipeline.flows.0.blocks.0.ruleTags.0',
      'pipeline.flows.1.ruleTags.0',
    ]);
  });
});

describe('F-02 AC-069 AC-073 a pipeline with no rules and no rule tags is accepted', () => {
  it('accepts a pipeline without tags, and tags that are absent or empty lists', () => {
    expect(checkRuleTags(config([], { pipelineTags: [], flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', { ruleTags: [] })] }))).toEqual([]);
    expect(checkRuleTags(config([], { flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92')] }))).toEqual([]);
  });
});

describe('F-02 AC-019 AC-070 a rule tag keeps its document index after a refused tag', () => {
  it('reports the unknown rule of ["Bad Id", "missing"] at pipeline.ruleTags.1', () => {
    const problems = createProblemCollector();
    const read = readRuleTags(['Bad Id', '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e'], 'pipeline.ruleTags', problems);
    expect(problems.list()).toEqual([
      { path: 'pipeline.ruleTags.0', message: expect.stringContaining('must be a GUID') },
    ]);
    const pipelineTags = read ?? [];
    expect(checkRuleTags({ rules: [], pipeline: { ...config([]).pipeline, ruleTags: pipelineTags } })).toEqual([
      { path: 'pipeline.ruleTags.1', message: 'must name a rule of this project, got 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
    ]);
  });
});
