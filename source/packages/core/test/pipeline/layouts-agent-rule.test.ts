import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import type { Agent, ProjectConfig } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { buildConfig } from './analyze-fixture.js';
import { readLayout } from './support/load-templates.js';

// The agent and rule layouts are read from the real templates (source/templates/). loadTemplates needs the base
// manifest, which a later task of F-05 adds, so this file reads the two layouts it tests with readLayout. The
// command layouts are not asserted here, so they carry a fixed one-line text.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

function templates(): Templates {
  return {
    base: [],
    pipelineCommand: { text: 'pipeline\n', headings: [] },
    command: { text: 'command\n', headings: [] },
    agent: readLayout(templatesRoot, 'agent.md'),
    rule: readLayout(templatesRoot, 'rule.md'),
  };
}

// The default pipeline parsed as in plan-fixed-templates.test.ts, so each test gets its own copy.
function defaultConfig(): ProjectConfig {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

// The plan of a config that is expected to plan; fails the test otherwise.
function planOf(config: ProjectConfig): Extract<Plan, { readonly ok: true }> {
  const plan = planGeneration(config, templates());
  if (!plan.ok) {
    throw new Error(`expected the config to be planned, got ${plan.problems.map((p) => p.message).join('; ')}`);
  }
  return plan;
}

// The text of the planned file at a path; fails the test when the path is not planned.
function textAt(config: ProjectConfig, path: string): string {
  const file = planOf(config).files.find((planned) => planned.path === path);
  if (file === undefined) {
    throw new Error(`no planned file at ${path}`);
  }
  return file.text;
}

// The Agent block of the named agent in the first flow of the config; fails the test when there is none.
function agentNamed(config: ProjectConfig, name: string): Agent {
  for (const flow of config.pipeline.flows) {
    for (const block of flow.blocks) {
      if (block.kind === 'agent' && block.name === name) {
        return block;
      }
    }
  }
  throw new Error(`no agent ${name}`);
}

// A config of the default pipeline with the named agent changed by `change`.
function withAgent(name: string, change: (agent: Agent) => void): ProjectConfig {
  const config = defaultConfig();
  change(agentNamed(config, name));
  return config;
}

describe('F-05 AC-011 each Agent block of a child flow is planned at .claude/agents/<name>.md', () => {
  it('F-05 AC-011 plans one agent file for every Agent block of the default pipeline', () => {
    const config = defaultConfig();
    const paths = planOf(config).files.map((file) => file.path);
    const names = config.pipeline.flows.flatMap((flow) =>
      flow.blocks.flatMap((block) => (block.kind === 'agent' ? [block.name] : [])),
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(paths).toContain(`.claude/agents/${name}.md`);
    }
    expect(paths.filter((path) => path.startsWith('.claude/agents/'))).toHaveLength(names.length);
  });

  it('F-05 AC-011 plans the agent file of a block in a second flow with the block name', () => {
    const config = buildConfig((c) => {
      const first = c.pipeline.flows[0];
      if (first !== undefined) {
        first.connectedTo = { to: 'verify', label: 'report' };
      }
      c.pipeline.flows.push({
        id: 'verify',
        name: 'Verify',
        description: 'Verifies one feature.',
        arguments: 'feature-id',
        blocks: [
          { id: 'verify-start', kind: 'start', connectedTo: { to: 'verify-checker', label: 'feature-id' } },
          {
            id: 'verify-checker',
            kind: 'agent',
            name: 'checker',
            description: 'Checks the feature.',
            arguments: 'feature-id',
            connectedTo: { to: 'verify-end', label: 'report' },
          },
          { id: 'verify-end', kind: 'end', outcome: 'done' },
        ],
      });
    });
    expect(planOf(config).files.map((file) => file.path)).toContain('.claude/agents/checker.md');
  });
});

describe('F-05 AC-012 the frontmatter holds name and description, and Purpose repeats the description', () => {
  // A description that a plain YAML value would read wrongly is written as one double-quoted string, on one line.
  it.each([
    ['a colon followed by a space', 'Drafts stories.md for the feature: user stories.'],
    ['a comment mark', 'Runs the tests # fast'],
    ['a line break', 'First line.\nSecond line.'],
    ['a trailing space', 'Reviews the change. '],
    ['a word YAML reads as a boolean', 'yes'],
    ['a word YAML reads as a number', '2026'],
  ])('F-05 AC-012 quotes the frontmatter description with %s so the YAML stays valid', (_case, description) => {
    const config = withAgent('review', (agent) => {
      agent.description = description;
    });
    const lines = textAt(config, '.claude/agents/review.md').split('\n');
    expect(lines.slice(0, 4)).toEqual(['---', 'name: review', `description: ${JSON.stringify(description)}`, '---']);
  });

  it('F-05 AC-012 writes the default specify agent description as a quoted YAML string', () => {
    const config = defaultConfig();
    const description = agentNamed(config, 'specify').description;
    const lines = textAt(config, '.claude/agents/specify.md').split('\n');
    expect(lines[2]).toBe(`description: ${JSON.stringify(description)}`);
  });

  it('F-05 AC-012 writes the frontmatter as name, then description, between two --- lines', () => {
    const config = defaultConfig();
    const lines = textAt(config, '.claude/agents/review.md').split('\n');
    expect(lines.slice(0, 4)).toEqual([
      '---',
      'name: review',
      `description: ${agentNamed(config, 'review').description}`,
      '---',
    ]);
  });

  it('F-05 AC-012 writes the title as the name and repeats the description under Purpose', () => {
    const config = defaultConfig();
    const description = agentNamed(config, 'review').description;
    expect(textAt(config, '.claude/agents/review.md')).toContain(
      `\n# review\n\n## Purpose\n\n${description}\n\nRule tags: none\n`,
    );
  });
});

describe('F-05 AC-013 the model line is written only when the block sets a model, as given', () => {
  it('F-05 AC-013 writes no model key for a block with no model', () => {
    const text = textAt(defaultConfig(), '.claude/agents/review.md');
    expect(text).not.toMatch(/^model:/m);
  });

  it.each(['haiku', 'sonnet', 'opus', 'inherit'] as const)(
    'F-05 AC-013 writes the model %s as given in the frontmatter',
    (model) => {
      const config = withAgent('review', (agent) => {
        agent.model = model;
      });
      const lines = textAt(config, '.claude/agents/review.md').split('\n');
      expect(lines.slice(0, 5)).toEqual([
        '---',
        'name: review',
        `description: ${agentNamed(config, 'review').description}`,
        `model: ${model}`,
        '---',
      ]);
    },
  );
});

describe('F-05 AC-014 the tools line is written only when the block lists tools, in block order', () => {
  it('F-05 AC-014 writes no tools key for a block with no tools', () => {
    const text = textAt(defaultConfig(), '.claude/agents/review.md');
    expect(text).not.toMatch(/^tools:/m);
  });

  it('F-05 AC-014 writes the tools as one comma-separated line in the block order', () => {
    const config = withAgent('review', (agent) => {
      agent.tools = ['Read', 'Grep', 'Bash'];
    });
    expect(textAt(config, '.claude/agents/review.md')).toContain('\ntools: Read, Grep, Bash\n---\n');
  });

  it('F-05 AC-014 writes no tools key for an empty tools list', () => {
    const config = withAgent('review', (agent) => {
      agent.tools = [];
    });
    expect(textAt(config, '.claude/agents/review.md')).not.toMatch(/^tools:/m);
  });

  it('F-05 AC-014 quotes the whole tools line when a tool name would break the YAML', () => {
    const config = withAgent('review', (agent) => {
      agent.tools = ['Read: all', 'Grep'];
    });
    expect(textAt(config, '.claude/agents/review.md')).toContain('\ntools: "Read: all, Grep"\n---\n');
  });

  it('F-05 AC-013 AC-014 writes the model line before the tools line when both are set', () => {
    const config = withAgent('review', (agent) => {
      agent.model = 'opus';
      agent.tools = ['Read'];
    });
    const lines = textAt(config, '.claude/agents/review.md').split('\n');
    expect(lines.slice(3, 6)).toEqual(['model: opus', 'tools: Read', '---']);
  });
});

describe('F-05 AC-015 the Instructions section is written only when the block has a body', () => {
  it('F-05 AC-015 writes no Instructions section for a block with no body', () => {
    const text = textAt(defaultConfig(), '.claude/agents/review.md');
    expect(text).not.toContain('## Instructions');
  });

  it('F-05 AC-015 ends the file at the Rule tags line for a block with no body, with no blank line after it', () => {
    expect(textAt(defaultConfig(), '.claude/agents/review.md').endsWith('Rule tags: none\n')).toBe(true);
  });

  it('F-05 AC-015 writes the body under the Instructions heading', () => {
    const config = withAgent('review', (agent) => {
      agent.body = 'Check each change against the plan.\nReport every blocker.';
    });
    expect(textAt(config, '.claude/agents/review.md')).toContain(
      '## Instructions\n\nCheck each change against the plan.\nReport every blocker.\n',
    );
  });

  it('F-05 AC-015 writes no Instructions section for a body of only whitespace', () => {
    const config = withAgent('review', (agent) => {
      agent.body = '  \n';
    });
    expect(textAt(config, '.claude/agents/review.md')).not.toContain('## Instructions');
  });
});

describe('F-05 AC-016 the rule tags of an agent are a comma list, or none', () => {
  it('F-05 AC-016 writes none for a block with no rule tags', () => {
    expect(textAt(defaultConfig(), '.claude/agents/review.md')).toContain('Rule tags: none');
  });

  it('F-05 AC-016 writes the rule tags of a block comma-separated, in order', () => {
    const config = buildConfig((c) => {
      c.rules = [
        { id: 'review-rules', title: 'Review rules', text: 'Review the change.' },
        { id: 'code-style', title: 'Code style', text: 'Keep the style.' },
      ];
      agentNamed(c, 'build').ruleTags = ['review-rules', 'code-style'];
    });
    expect(textAt(config, '.claude/agents/build.md')).toContain('Rule tags: review-rules, code-style');
  });
});

describe('F-05 AC-018 each rule is written to .claude/rules/<id>.md with its title and text', () => {
  it('F-05 AC-018 writes the title as the heading and the text as the body', () => {
    const config = buildConfig((c) => {
      c.rules = [{ id: 'code-style', title: 'Code style', text: 'Keep the style.' }];
    });
    expect(textAt(config, '.claude/rules/code-style.md')).toBe('# Code style\n\nKeep the style.\n');
  });

  it('F-05 AC-018 writes a title given over two lines as one heading line', () => {
    const config = buildConfig((c) => {
      c.rules = [{ id: 'code-style', title: 'Code\nstyle', text: 'Keep the style.' }];
    });
    expect(textAt(config, '.claude/rules/code-style.md')).toBe('# Code style\n\nKeep the style.\n');
  });

  it('F-05 AC-018 plans one rule file per rule entry at its id path', () => {
    const config = buildConfig((c) => {
      c.rules = [
        { id: 'code-style', title: 'Code style', text: 'Keep the style.' },
        { id: 'review-rules', title: 'Review rules', text: 'Review the change.' },
      ];
    });
    const paths = planOf(config).files.map((file) => file.path);
    expect(paths).toContain('.claude/rules/code-style.md');
    expect(paths).toContain('.claude/rules/review-rules.md');
  });
});

describe('F-05 AC-019 a rule text is written with its line breaks kept', () => {
  it('F-05 AC-019 keeps the blank lines and the list lines of the rule text as given', () => {
    const text = 'First line.\n\n- item one\n- item two\n\nLast line.';
    const config = buildConfig((c) => {
      c.rules = [{ id: 'code-style', title: 'Code style', text }];
    });
    expect(textAt(config, '.claude/rules/code-style.md')).toBe(`# Code style\n\n${text}\n`);
  });
});

describe('F-05 AC-020 a configuration with no rules writes no rule file and does not fail', () => {
  it('F-05 AC-020 plans no file under .claude/rules/ for a config with no rules', () => {
    const plan = planGeneration(defaultConfig(), templates());
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.files.some((file) => file.path.startsWith('.claude/rules/'))).toBe(false);
    }
  });
});
