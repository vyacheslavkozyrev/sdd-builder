import { describe, expect, it } from 'vitest';
import { agentValues } from '../../src/pipeline/generate/values-agent.js';
import { renderText } from '../../src/pipeline/generate/render.js';
import type { Agent } from '../../src/pipeline/model.js';

// An Agent block with the given optional fields; the required fields have fixed values.
function agentWith(fields: Partial<Agent>): Agent {
  return {
    id: 'reviewer',
    kind: 'agent',
    name: 'reviewer',
    description: 'Reviews the change.',
    arguments: '',
    ...fields,
  };
}

interface Case {
  name: string;
  agent: Agent;
  key: 'optionalFrontmatter' | 'bodySection' | 'name' | 'description' | 'ruleTags';
  expected: string;
}

const cases: Case[] = [
  {
    name: 'F-05 AC-013 a model set writes the model line',
    agent: agentWith({ model: 'sonnet' }),
    key: 'optionalFrontmatter',
    expected: 'model: sonnet\n',
  },
  {
    name: 'F-05 AC-013 the model is written as given, inherit included',
    agent: agentWith({ model: 'inherit' }),
    key: 'optionalFrontmatter',
    expected: 'model: inherit\n',
  },
  {
    name: 'F-05 AC-013 no model writes no model key, not an empty one',
    agent: agentWith({}),
    key: 'optionalFrontmatter',
    expected: '',
  },
  {
    name: 'F-05 AC-014 tools set write one comma-separated line in the block order',
    agent: agentWith({ tools: ['Read', 'Grep', 'Bash'] }),
    key: 'optionalFrontmatter',
    expected: 'tools: Read, Grep, Bash\n',
  },
  {
    name: 'F-05 AC-014 an empty tools list writes no tools key',
    agent: agentWith({ tools: [] }),
    key: 'optionalFrontmatter',
    expected: '',
  },
  {
    name: 'F-05 AC-014 no tools writes no tools key',
    agent: agentWith({}),
    key: 'optionalFrontmatter',
    expected: '',
  },
  {
    name: 'F-05 AC-013 AC-014 a model and tools write the model line, then the tools line',
    agent: agentWith({ model: 'opus', tools: ['Read'] }),
    key: 'optionalFrontmatter',
    expected: 'model: opus\ntools: Read\n',
  },
  {
    name: 'F-05 AC-012 the name value is the agent name',
    agent: agentWith({ name: 'implement' }),
    key: 'name',
    expected: 'implement',
  },
  {
    name: 'F-05 AC-012 the description value is the block description',
    agent: agentWith({ description: 'Builds the UI tasks.' }),
    key: 'description',
    expected: 'Builds the UI tasks.',
  },
  {
    name: 'F-05 AC-016 rule tags are written as a comma-separated list',
    agent: agentWith({ ruleTags: ['typescript', 'general'] }),
    key: 'ruleTags',
    expected: 'typescript, general',
  },
  {
    name: 'F-05 AC-016 no rule tags write none',
    agent: agentWith({}),
    key: 'ruleTags',
    expected: 'none',
  },
  {
    name: 'F-05 AC-016 an empty rule tag list writes none',
    agent: agentWith({ ruleTags: [] }),
    key: 'ruleTags',
    expected: 'none',
  },
  {
    name: 'F-05 AC-015 a body set gives the Instructions section with the body',
    agent: agentWith({ body: 'Check the diff.' }),
    key: 'bodySection',
    expected: '\n## Instructions\n\nCheck the diff.\n',
  },
  {
    name: 'F-05 AC-015 no body gives an empty section',
    agent: agentWith({}),
    key: 'bodySection',
    expected: '',
  },
  {
    name: 'F-05 AC-015 an empty body gives an empty section',
    agent: agentWith({ body: '' }),
    key: 'bodySection',
    expected: '',
  },
  {
    name: 'F-05 AC-015 a body of only whitespace gives an empty section',
    agent: agentWith({ body: ' \n\t ' }),
    key: 'bodySection',
    expected: '',
  },
];

describe('agentValues', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(agentValues(testCase.agent)[testCase.key]).toBe(testCase.expected);
    });
  }

  it('F-05 AC-017 a body containing a placeholder is kept as typed through the renderer', () => {
    const body = 'Fill {{x}} with the value of {{stack.language}}.';
    const values = agentValues(agentWith({ body }));
    const rendered = renderText('.claude/agents/reviewer.md', '{{bodySection}}', values);
    expect(rendered).toBe(`\n## Instructions\n\n${body}\n`);
  });

  it('F-05 AC-017 a body placeholder that names a known value is not filled a second time', () => {
    const body = 'The agent is {{name}}; see {{description}}.';
    const values = agentValues(agentWith({ name: 'reviewer', description: 'Reviews.', body }));
    const rendered = renderText('.claude/agents/reviewer.md', '# {{name}}\n{{bodySection}}', values);
    expect(rendered).toBe(`# reviewer\n\n## Instructions\n\n${body}\n`);
  });
});
