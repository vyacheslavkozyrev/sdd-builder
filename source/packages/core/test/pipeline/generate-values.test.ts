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
    id: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63',
    kind: 'agent',
    name: 'draft-agent',
    description: 'Drafts the text.',
    arguments: [],
    next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
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

const RULE: Rule = { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Plain style', text: 'Write short sentences.' };

describe('F-04 AC-017 the pipeline command values name the arguments and list the flows in order', () => {
  it('gives the pipeline name and description for inline placeholders', () => {
    const values = pipelineValues(validConfig().pipeline);
    expect(values['pipelineName']).toBe('Build pipeline');
    expect(values['pipelineDescription']).toBe('One flow that builds the project.');
  });

  it('gives one line per pipeline argument with its required mark and hint, or No arguments when there are none', () => {
    const base = validConfig().pipeline;
    expect(pipelineValues(base)['pipelineArguments']).toBe('\nNo arguments');
    const withArgs = pipelineWith({
      arguments: [argument(0, 'ccc656eb-7dbe-5012-9af8-c2559c43ae31', true, 'the subject'), argument(1, '80398aba-a45b-51b8-971a-54782c4bdfde', false)],
    });
    expect(pipelineValues(withArgs)['pipelineArguments']).toBe(
      '\n- `ccc656eb-7dbe-5012-9af8-c2559c43ae31` (required, the subject)\n- `80398aba-a45b-51b8-971a-54782c4bdfde` (optional)',
    );
  });

  it('lists each flow once, in the order of the next links, with its description, and a stop step after a flow with approval on', () => {
    const pipeline = pipelineWith({
      flows: [
        flow({ id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92', description: 'Plans the work.', approval: true, next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
        flow({ id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
      ],
    });
    expect(pipelineValues(pipeline)['pipelineFlows']).toBe(
      '\n1. Flow `fc358416-c66a-5fef-9c5e-a282b75cbd92`: Plans the work.' +
        "\n2. Stop and wait for the person's approval before the next flow." +
        '\n3. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.',
    );
  });

  it('F-05 AC-002 lists the flows in the order of the next links, not the array order', () => {
    const pipeline = pipelineWith({
      flows: [
        flow({ id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
        flow({ id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92', description: 'Plans the work.', approval: true, next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
      ],
    });
    expect(pipelineValues(pipeline)['pipelineFlows']).toBe(
      '\n1. Flow `fc358416-c66a-5fef-9c5e-a282b75cbd92`: Plans the work.' +
        "\n2. Stop and wait for the person's approval before the next flow." +
        '\n3. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.',
    );
  });

  it('leaves the description out of a flow line when the flow has none', () => {
    const pipeline = pipelineWith({ flows: [flow({ id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' })] });
    expect(pipelineValues(pipeline)['pipelineFlows']).toBe('\n1. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.');
  });

  it('gives an empty flow list when the pipeline has no flows', () => {
    expect(pipelineValues(pipelineWith({ flows: [] }))['pipelineFlows']).toBe('');
  });

  it('keeps the pipeline name, description and flow description on one line', () => {
    const pipeline = pipelineWith({
      name: 'Build\npipeline',
      description: 'One flow\n\nthat builds.',
      flows: [flow({ id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6', description: 'Builds\nit.' })],
    });
    const values = pipelineValues(pipeline);
    expect(values['pipelineName']).toBe('Build pipeline');
    expect(values['pipelineDescription']).toBe('One flow that builds.');
    expect(values['pipelineFlows']).toBe('\n1. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`: Builds it.');
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

  it('F-05 AC-005 quotes the tools list when a tool name would break the YAML, as the agent tools do', () => {
    expect(pipelineValues(pipelineWith({ tools: ['Read', 'Bash(git: *)'] }))['pipelineTools']).toBe(
      '\ntools: "Read, Bash(git: *)"',
    );
  });

  it('F-05 AC-005 gives the description as a quoted YAML string for the frontmatter, and the plain text for Purpose', () => {
    const values = pipelineValues(pipelineWith({ description: 'Builds "it":\nC:\\bin.' }));
    expect(values['pipelineDescriptionYaml']).toBe('"Builds \\"it\\": C:\\\\bin."');
    expect(values['pipelineDescription']).toBe('Builds "it": C:\\bin.');
  });

  it('F-04 AC-003 keeps a line break in an agent tool name from splitting the agent tools frontmatter line', () => {
    expect(agentValues(agent({ tools: ['Read', 'Edit\nBash'] }))['agentTools']).toBe('\ntools: Read, Edit Bash');
  });

  it('F-04 AC-039 gives the body as a paragraph after a blank line, empty when the pipeline has no body', () => {
    expect(pipelineValues(validConfig().pipeline)['pipelineBody']).toBe('');
    expect(pipelineValues(pipelineWith({ body: '' }))['pipelineBody']).toBe('');
    expect(pipelineValues(pipelineWith({ body: ' \n\t\n' }))['pipelineBody']).toBe('');
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
    ).toBe('Args:\nNo arguments\nFlows:\n1. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.');
  });
});

describe('F-04 AC-003 the agent values name the file and carry the optional lines only when present', () => {
  it('gives the name and the description of the Agent block', () => {
    const values = agentValues(agent());
    expect(values['agentName']).toBe('draft-agent');
    expect(values['agentDescription']).toBe('"Drafts the text."');
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

  it('keeps the description on one line so a frontmatter layout cannot gain a line', () => {
    const values = agentValues(agent({ description: '\nDrafts\nthe text.\nmodel: opus\n' }));
    expect(values['agentDescription']).toBe('"Drafts the text. model: opus"');
    expect(values['agentDescription']).not.toContain('\n');
  });

  it('gives one line per argument with its required mark and hint, or No arguments when there are none, as the flow layout does', () => {
    expect(agentValues(agent())['agentArguments']).toBe('\nNo arguments');
    const values = agentValues(agent({ arguments: [argument(0, 'ccc656eb-7dbe-5012-9af8-c2559c43ae31', true, 'the subject')] }));
    expect(values['agentArguments']).toBe('\n- `ccc656eb-7dbe-5012-9af8-c2559c43ae31` (required, the subject)');
  });

  it('fills a frontmatter layout so that the optional lines follow the description on their own lines', () => {
    const layout = '---\nname: {{agentName}}\ndescription: {{agentDescription}}{{agentModel}}{{agentTools}}\n---';
    expect(
      renderLayout(layout, agentValues(agent({ model: 'haiku', tools: ['Read'] })), '.claude/agents/draft-agent.md'),
    ).toBe('---\nname: draft-agent\ndescription: "Drafts the text."\nmodel: haiku\ntools: Read\n---');
    expect(renderLayout(layout, agentValues(agent()), '.claude/agents/draft-agent.md')).toBe(
      '---\nname: draft-agent\ndescription: "Drafts the text."\n---',
    );
  });
});

describe('F-05 AC-017 the agent description is a quoted YAML string', () => {
  it('F-05 AC-017 quotes the description as it is', () => {
    expect(agentValues(agent())['agentDescription']).toBe('"Drafts the text."');
  });

  it('F-05 AC-017 escapes the quotes and the backslashes inside the description', () => {
    expect(agentValues(agent({ description: 'Says "hi" in C:\\tmp' }))['agentDescription']).toBe(
      '"Says \\"hi\\" in C:\\\\tmp"',
    );
  });

  it('F-05 AC-017 keeps a colon and a hash inside the quoted description', () => {
    expect(agentValues(agent({ description: 'Note: part #2' }))['agentDescription']).toBe('"Note: part #2"');
  });

  it('F-05 AC-017 decodes back to the description, so the quoted form holds the text and nothing else', () => {
    const texts = ['Says "hi" in C:\\tmp', 'Tab\there and \u0001 bell', 'Line\u2028separator', 'plain text'];
    for (const text of texts) {
      const quoted = agentValues(agent({ description: text }))['agentDescription'] ?? '';
      expect(JSON.parse(quoted)).toBe(text);
    }
  });

  it('F-05 AC-017 has a Purpose value with the description as plain text, with no quotes', () => {
    const values = agentValues(agent());
    expect(values['agentPurpose']).toBe('Drafts the text.');
    expect(values['agentPurpose']).not.toContain('"');
    expect(values['agentDescription']).toBe('"Drafts the text."');
  });

  it('F-05 AC-017 keeps the quotes and backslashes of the description as they are in the Purpose value', () => {
    expect(agentValues(agent({ description: 'Says "hi" in C:\\tmp' }))['agentPurpose']).toBe('Says "hi" in C:\\tmp');
  });

  it('F-05 AC-017 writes the quoted description as a frontmatter line that holds one YAML string', () => {
    const layout = '---\nname: {{agentName}}\ndescription: {{agentDescription}}\n---';
    expect(
      renderLayout(
        layout,
        agentValues(agent({ description: 'Writes "docs" for a\nline break' })),
        '.claude/agents/draft-agent.md',
      ),
    ).toBe('---\nname: draft-agent\ndescription: "Writes \\"docs\\" for a line break"\n---');
  });
});

describe('F-05 AC-019 the tools line is one comma-separated list, quoted when YAML would break', () => {
  it('F-05 AC-019 writes plain tool names in the block order, with no quotes', () => {
    expect(agentValues(agent({ tools: ['Read', 'Grep', 'Glob'] }))['agentTools']).toBe('\ntools: Read, Grep, Glob');
  });

  it('F-05 AC-019 keeps a tool name with parentheses, a star or a colon plain when YAML reads it as text', () => {
    expect(agentValues(agent({ tools: ['Bash(git *)', 'WebFetch(domain:example.com)'] }))['agentTools']).toBe(
      '\ntools: Bash(git *), WebFetch(domain:example.com)',
    );
  });

  it('F-05 AC-019 quotes the whole list when a tool name starts with an indicator character', () => {
    expect(agentValues(agent({ tools: ['Read', '*Edit'] }))['agentTools']).toBe('\ntools: "Read, *Edit"');
  });

  it('F-05 AC-019 quotes the whole list when a tool name holds a colon followed by a space', () => {
    expect(agentValues(agent({ tools: ['Bash: git'] }))['agentTools']).toBe('\ntools: "Bash: git"');
  });

  it('F-05 AC-019 quotes the whole list when a tool name holds a space before a hash', () => {
    expect(agentValues(agent({ tools: ['Read #1'] }))['agentTools']).toBe('\ntools: "Read #1"');
  });

  it('F-05 AC-019 quotes the whole list and escapes a quote or a backslash in a tool name', () => {
    expect(agentValues(agent({ tools: ['Read', '"x" Edit'] }))['agentTools']).toBe('\ntools: "Read, \\"x\\" Edit"');
    expect(agentValues(agent({ tools: ['Read', '!C:\\x'] }))['agentTools']).toBe('\ntools: "Read, !C:\\\\x"');
  });

  it('F-05 AC-019 quotes a tool name that YAML reads as another type, such as a single null', () => {
    expect(agentValues(agent({ tools: ['null'] }))['agentTools']).toBe('\ntools: "null"');
    expect(agentValues(agent({ tools: ['Read'] }))['agentTools']).toBe('\ntools: Read');
  });

  it('F-05 AC-019 quotes the whole list when a tool name starts with a digit, a sign or a dot', () => {
    expect(agentValues(agent({ tools: ['Read', '1Edit'] }))['agentTools']).toBe('\ntools: "Read, 1Edit"');
    expect(agentValues(agent({ tools: ['.inf'] }))['agentTools']).toBe('\ntools: ".inf"');
  });

  it('F-05 AC-019 quotes the whole list when a tool name holds a control character', () => {
    expect(agentValues(agent({ tools: ['Read\u0001'] }))['agentTools']).toBe('\ntools: "Read\\u0001"');
  });

  it('F-05 AC-019 the quoted list decodes back to the names joined in their order', () => {
    const names = ['Read', '"x" Edit', 'Bash: git', '!C:\\x'];
    const tools = agentValues(agent({ tools: names }))['agentTools'] ?? '';
    expect(JSON.parse(tools.replace(/^\ntools: /, ''))).toBe(names.join(', '));
  });

  it('F-05 AC-019 writes no tools line when the block has no tools or an empty list', () => {
    expect(agentValues(agent())['agentTools']).toBe('');
    expect(agentValues(agent({ tools: [] }))['agentTools']).toBe('');
  });
});

describe('F-05 AC-020 the agent body has an Instructions heading and is empty when blank', () => {
  it('F-05 AC-020 writes the body under an Instructions heading', () => {
    expect(agentValues(agent({ body: 'Keep it short.' }))['agentBody']).toBe(
      '\n\n## Instructions\n\nKeep it short.',
    );
  });

  it('F-05 AC-020 keeps the line breaks of the body and drops the blank lines around it', () => {
    expect(agentValues(agent({ body: '\n\nFirst line.\n\nSecond line.\n\n' }))['agentBody']).toBe(
      '\n\n## Instructions\n\nFirst line.\n\nSecond line.',
    );
  });

  it('F-05 AC-020 has no Instructions section when the block has no body', () => {
    expect(agentValues(agent())['agentBody']).toBe('');
  });

  it('F-05 AC-020 has no Instructions section when the body is empty, blank or only whitespace', () => {
    expect(agentValues(agent({ body: '' }))['agentBody']).toBe('');
    expect(agentValues(agent({ body: '   ' }))['agentBody']).toBe('');
    expect(agentValues(agent({ body: ' \n\t\n  \n' }))['agentBody']).toBe('');
  });
});

// The rules of the project, which the block's tags name (F-16, AC-029): a tag is written as the file name of its rule.
const RULES: readonly Rule[] = [
  { index: 0, id: 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', title: 'Style guide', text: 'Keep it short.' },
  { index: 1, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Naming', text: 'Name it well.' },
];

describe('F-05 AC-022 the agent rule tags are one comma-separated list in their order', () => {
  it('F-05 AC-022 writes the tags of the block in their order', () => {
    const tags = [
      { ruleId: 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', index: 0 },
      { ruleId: '8f99cc27-78ab-5895-8637-5c13d7429593', index: 1 },
    ];
    expect(agentValues(agent({ ruleTags: tags }), RULES)['agentRuleTags']).toBe('style-guide, naming');
  });

  it('F-05 AC-022 writes one tag without a separator', () => {
    expect(agentValues(agent({ ruleTags: [{ ruleId: '8f99cc27-78ab-5895-8637-5c13d7429593', index: 0 }] }), RULES)['agentRuleTags']).toBe('naming');
  });

  it('F-16 AC-029 names the rule of an agent tag by its file name, and refuses a tag that names no rule', () => {
    const tags = [{ ruleId: 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', index: 0 }];
    expect(agentValues(agent({ ruleTags: tags }), RULES)['agentRuleTags']).toBe('style-guide');
    expect(() => agentValues(agent({ ruleTags: [{ ruleId: '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e', index: 0 }] }), RULES)).toThrow(
      'names no rule of the project',
    );
  });

  it('F-05 AC-022 writes none when the block has no tags or an empty list', () => {
    expect(agentValues(agent())['agentRuleTags']).toBe('none');
    expect(agentValues(agent({ ruleTags: [] }))['agentRuleTags']).toBe('none');
  });
});

describe('F-04 AC-004 the rule values give the id, the title and the text', () => {
  it('gives the id and the title for inline placeholders and the text as a paragraph', () => {
    const values = ruleValues(RULE);
    expect(values['ruleId']).toBe('8f99cc27-78ab-5895-8637-5c13d7429593');
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
