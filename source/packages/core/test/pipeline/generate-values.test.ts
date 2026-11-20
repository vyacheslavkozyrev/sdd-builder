import { describe, expect, it } from 'vitest';
import type { AgentBlock, Argument, Flow, Pipeline, Rule } from '../../src/pipeline/model.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';
import { agentValues } from '../../src/pipeline/generate/values-agent.js';
import { pipelineValues } from '../../src/pipeline/generate/values-pipeline.js';
import { ruleValues } from '../../src/pipeline/generate/values-rule.js';
import { validConfig } from './analyze-fixture.js';

function argument(index: number, id: string, required: boolean, hint = ''): Argument {
  return { index, id, required, hint };
}

function agent(overrides: Partial<AgentBlock> = {}): AgentBlock {
  return {
    index: 1,
    id: 'draft',
    kind: 'agent',
    name: 'draft-agent',
    description: 'Drafts the text.',
    arguments: [],
    next: 'end',
    ...overrides,
  };
}

function flow(overrides: Partial<Flow> & Pick<Flow, 'id'>): Flow {
  return {
    index: 0,
    name: overrides.id,
    arguments: [],
    body: '',
    artifacts: [],
    approval: false,
    blocks: [],
    ...overrides,
  };
}

function pipelineWith(overrides: Partial<Pipeline>): Pipeline {
  const base = validConfig().pipeline;
  return { ...base, ...overrides };
}

const RULE: Rule = { index: 0, id: 'style', title: 'Plain style', text: 'Write short sentences.' };

describe('F-04 AC-017 the pipeline command values name the arguments and list the flows in order', () => {
  it('gives the pipeline name and description for inline placeholders', () => {
    const values = pipelineValues(validConfig().pipeline);
    expect(values['pipelineName']).toBe('Build pipeline');
    expect(values['pipelineDescription']).toBe('One flow that builds the project.');
  });

  it('gives one line per pipeline argument with its required mark and hint, empty when there are none', () => {
    const base = validConfig().pipeline;
    expect(pipelineValues(base)['pipelineArguments']).toBe('');
    const withArgs = pipelineWith({
      arguments: [argument(0, 'topic', true, 'the subject'), argument(1, 'scope', false)],
    });
    expect(pipelineValues(withArgs)['pipelineArguments']).toBe(
      '\n- `topic` (required, the subject)\n- `scope` (optional)',
    );
  });

  it('lists each flow once, in pipeline order, with its description and its approval', () => {
    const pipeline = pipelineWith({
      flows: [
        flow({ id: 'plan', description: 'Plans the work.', approval: true }),
        flow({ id: 'build' }),
      ],
    });
    expect(pipelineValues(pipeline)['pipelineFlows']).toBe(
      '\n1. Flow `plan`: Plans the work. The process stops for a person at the end of this flow.' +
        '\n2. Flow `build`. The process does not stop at the end of this flow.',
    );
  });

  it('leaves the description out of a flow line when the flow has none', () => {
    const pipeline = pipelineWith({ flows: [flow({ id: 'build' })] });
    expect(pipelineValues(pipeline)['pipelineFlows']).toBe(
      '\n1. Flow `build`. The process does not stop at the end of this flow.',
    );
  });

  it('gives an empty flow list when the pipeline has no flows', () => {
    expect(pipelineValues(pipelineWith({ flows: [] }))['pipelineFlows']).toBe('');
  });

  it('keeps the pipeline name, description and flow description on one line', () => {
    const pipeline = pipelineWith({
      name: 'Build\npipeline',
      description: 'One flow\n\nthat builds.',
      flows: [flow({ id: 'build', description: 'Builds\nit.' })],
    });
    const values = pipelineValues(pipeline);
    expect(values['pipelineName']).toBe('Build pipeline');
    expect(values['pipelineDescription']).toBe('One flow that builds.');
    expect(values['pipelineFlows']).toBe(
      '\n1. Flow `build`: Builds it. The process does not stop at the end of this flow.',
    );
  });

  it('F-04 AC-039 gives the model and tools frontmatter lines only when the pipeline sets them', () => {
    const bare = pipelineValues(validConfig().pipeline);
    expect(bare['pipelineModel']).toBe('');
    expect(bare['pipelineTools']).toBe('');

    const set = pipelineValues(pipelineWith({ model: 'sonnet', tools: ['Read', 'Edit'] }));
    expect(set['pipelineModel']).toBe('\nmodel: sonnet');
    expect(set['pipelineTools']).toBe('\ntools: Read, Edit');
  });

  it('F-04 AC-039 treats an empty tools list as no tools line', () => {
    expect(pipelineValues(pipelineWith({ tools: [] }))['pipelineTools']).toBe('');
  });

  it('F-04 AC-039 keeps a line break in a tool name from splitting the tools frontmatter line', () => {
    expect(pipelineValues(pipelineWith({ tools: ['Read', 'Edit\nBash'] }))['pipelineTools']).toBe(
      '\ntools: Read, Edit Bash',
    );
  });

  it('F-04 AC-003 keeps a line break in an agent tool name from splitting the agent tools frontmatter line', () => {
    expect(agentValues(agent({ tools: ['Read', 'Edit\nBash'] }))['agentTools']).toBe('\ntools: Read, Edit Bash');
  });

  it('F-04 AC-039 gives the body as a paragraph after a blank line, empty when the pipeline has no body', () => {
    expect(pipelineValues(validConfig().pipeline)['pipelineBody']).toBe('');
    expect(pipelineValues(pipelineWith({ body: '' }))['pipelineBody']).toBe('');
    expect(pipelineValues(pipelineWith({ body: 'Run the flows in order.' }))['pipelineBody']).toBe(
      '\n\nRun the flows in order.',
    );
  });

  it('F-04 AC-039 fills a frontmatter layout with the optional lines and leaves no blank line when they are empty', () => {
    const layout =
      '---\nname: {{pipelineName}}\ndescription: {{pipelineDescription}}{{pipelineModel}}{{pipelineTools}}\n---{{pipelineBody}}';
    expect(
      renderLayout(
        layout,
        pipelineValues(pipelineWith({ model: 'haiku', tools: ['Read'], body: 'Keep it short.' })),
        '.claude/commands/pipeline.md',
      ),
    ).toBe(
      '---\nname: Build pipeline\ndescription: One flow that builds the project.\nmodel: haiku\ntools: Read\n---\n\nKeep it short.',
    );
    expect(renderLayout(layout, pipelineValues(validConfig().pipeline), '.claude/commands/pipeline.md')).toBe(
      '---\nname: Build pipeline\ndescription: One flow that builds the project.\n---',
    );
  });

  it('fills a layout with the flow lines and leaves no blank line when a value is empty', () => {
    const pipeline = pipelineWith({ arguments: [] });
    const values = pipelineValues(pipeline);
    expect(
      renderLayout('Args:{{pipelineArguments}}\nFlows:{{pipelineFlows}}', values, '.claude/commands/pipeline.md'),
    ).toBe('Args:\nFlows:\n1. Flow `build`. The process does not stop at the end of this flow.');
  });
});

describe('F-04 AC-003 the agent values name the file and carry the optional lines only when present', () => {
  it('gives the name and the description of the Agent block', () => {
    const values = agentValues(agent());
    expect(values['agentName']).toBe('draft-agent');
    expect(values['agentDescription']).toBe('Drafts the text.');
  });

  it('gives the model and tools frontmatter lines only when the block sets them', () => {
    const bare = agentValues(agent());
    expect(bare['agentModel']).toBe('');
    expect(bare['agentTools']).toBe('');

    const set = agentValues(agent({ model: 'sonnet', tools: ['Read', 'Edit'] }));
    expect(set['agentModel']).toBe('\nmodel: sonnet');
    expect(set['agentTools']).toBe('\ntools: Read, Edit');
  });

  it('treats an empty tools list as no tools line', () => {
    expect(agentValues(agent({ tools: [] }))['agentTools']).toBe('');
  });

  it('gives the reads and writes lines with their paths, empty when the block names none', () => {
    const bare = agentValues(agent());
    expect(bare['agentReads']).toBe('');
    expect(bare['agentWrites']).toBe('');

    const set = agentValues(agent({ reads: ['spec/a.md'], writes: ['spec/b.md', 'spec/c.md'] }));
    expect(set['agentReads']).toBe('\nReads: `spec/a.md`');
    expect(set['agentWrites']).toBe('\nWrites: `spec/b.md`, `spec/c.md`');

    const emptyLists = agentValues(agent({ reads: [], writes: [] }));
    expect(emptyLists['agentReads']).toBe('');
    expect(emptyLists['agentWrites']).toBe('');
  });

  it('keeps the description on one line so a frontmatter layout cannot gain a line', () => {
    const values = agentValues(agent({ description: '\nDrafts\nthe text.\nmodel: opus\n' }));
    expect(values['agentDescription']).toBe('Drafts the text. model: opus');
    expect(values['agentDescription']).not.toContain('\n');
  });

  it('gives the body as a paragraph after a blank line, empty when the block has no body', () => {
    expect(agentValues(agent())['agentBody']).toBe('');
    expect(agentValues(agent({ body: 'Keep it short.' }))['agentBody']).toBe('\n\nKeep it short.');
  });

  it('gives one line per argument with its required mark and hint, empty when there are none', () => {
    expect(agentValues(agent())['agentArguments']).toBe('');
    const values = agentValues(agent({ arguments: [argument(0, 'topic', true, 'the subject')] }));
    expect(values['agentArguments']).toBe('\n- `topic` (required, the subject)');
  });

  it('fills a frontmatter layout so that the optional lines follow the description on their own lines', () => {
    const layout = '---\nname: {{agentName}}\ndescription: {{agentDescription}}{{agentModel}}{{agentTools}}\n---';
    expect(
      renderLayout(layout, agentValues(agent({ model: 'haiku', tools: ['Read'] })), '.claude/agents/draft-agent.md'),
    ).toBe('---\nname: draft-agent\ndescription: Drafts the text.\nmodel: haiku\ntools: Read\n---');
    expect(renderLayout(layout, agentValues(agent()), '.claude/agents/draft-agent.md')).toBe(
      '---\nname: draft-agent\ndescription: Drafts the text.\n---',
    );
  });
});

describe('F-04 AC-004 the rule values give the id, the title and the text', () => {
  it('gives the id and the title for inline placeholders and the text as a paragraph', () => {
    const values = ruleValues(RULE);
    expect(values['ruleId']).toBe('style');
    expect(values['ruleTitle']).toBe('Plain style');
    expect(values['ruleText']).toBe('\n\nWrite short sentences.');
  });

  it('keeps the title on one line when it holds a line break', () => {
    expect(ruleValues({ ...RULE, title: 'Plain\nstyle' })['ruleTitle']).toBe('Plain style');
  });

  it('gives an empty text value when the rule has no text', () => {
    expect(ruleValues({ ...RULE, text: '' })['ruleText']).toBe('');
  });

  it('fills a rule layout with the title and the text after a blank line', () => {
    const layout = '# {{ruleTitle}}{{ruleText}}';
    expect(renderLayout(layout, ruleValues(RULE), '.claude/rules/style.md')).toBe(
      '# Plain style\n\nWrite short sentences.',
    );
  });
});
