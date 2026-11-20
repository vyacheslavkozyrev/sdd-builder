import { describe, expect, it } from 'vitest';
import type { AgentBlock, Block, ProjectConfig, RuleTag } from '../../src/pipeline/model.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';
import { listFiles } from '../../src/pipeline/generate/file-list.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { agentValues } from '../../src/pipeline/generate/values-agent.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const LAYOUT_PATH = 'claude-code/agent.md';

// The real layout of `source/templates/claude-code/agent.md`, rendered with the real values of the agent.
function render(agent: AgentBlock): string {
  return renderLayout(readLayout(LAYOUT_PATH), agentValues(agent), LAYOUT_PATH);
}

// A valid Agent block: a review agent with no model, tools, body, artifacts, arguments or rule tags. `change` replaces
// the parts it names.
function agentOf(change: Partial<AgentBlock> = {}): AgentBlock {
  return {
    index: 1,
    id: 'review',
    kind: 'agent',
    name: 'review-agent',
    description: 'Reviews the plan.',
    arguments: [],
    next: 'end',
    ...change,
  };
}

function ruleTags(...ruleIds: string[]): RuleTag[] {
  return ruleIds.map((ruleId, index) => ({ index, ruleId }));
}

// The lines of one section of a rendered agent file: those after its heading, up to the next heading.
function section(text: string, heading: string): string[] {
  const lines = text.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error(`the text has no ${heading} heading`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

// The frontmatter lines of a rendered agent file, from the opening `---` to the closing one.
function frontmatter(text: string): string[] {
  const lines = text.split('\n');
  const end = lines.indexOf('---', 1);
  return lines.slice(0, end + 1);
}

// The valid fixture with its one flow replaced by a flow of a Start, one Agent block per name and an End. Each agent
// is named `<name>-agent`.
function configWithAgents(names: readonly string[]): ProjectConfig {
  const config = validConfig();
  const flow = config.pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  const agents = names.map((name, index) =>
    agentOf({ index: index + 1, id: name, name: `${name}-agent`, next: 'end' }),
  );
  const blocks: Block[] = [
    { index: 0, id: 'start', kind: 'start', next: names[0] ?? 'end' },
    ...agents,
    { index: 99, id: 'end', kind: 'end', outcome: 'done', producedArtifact: '' },
  ];
  return { ...config, pipeline: { ...config.pipeline, flows: [{ ...flow, blocks }] } };
}

const TEMPLATES_WITH_AGENT: GenerationTemplates = {
  base: [],
  pipeline: '',
  flow: '',
  agent: readLayout(LAYOUT_PATH),
  rule: '',
};

describe('F-05 layouts: the agent file layout', () => {
  it('F-05 AC-016 plans one agent file per Agent block, named after the block, with the name once in the path', () => {
    const files = listFiles(configWithAgents(['draft', 'publish']), TEMPLATES_WITH_AGENT)
      .map((file) => file.path)
      .filter((path) => path.startsWith('.claude/agents/'));
    expect(files).toEqual(['.claude/agents/draft-agent.md', '.claude/agents/publish-agent.md']);
  });

  it('F-05 AC-017 writes the name and the quoted description in the frontmatter, and the plain description under Purpose', () => {
    const text = render(agentOf({ description: 'Reviews "the" plan: all of it.' }));
    expect(frontmatter(text)).toEqual([
      '---',
      'name: review-agent',
      'description: "Reviews \\"the\\" plan: all of it."',
      '---',
    ]);
    expect(section(text, '## Purpose')).toEqual(['', 'Reviews "the" plan: all of it.', '']);
  });

  it('F-05 AC-018 writes the model in the frontmatter, after the description, as the block gives it', () => {
    for (const model of ['haiku', 'sonnet', 'opus', 'inherit'] as const) {
      expect(frontmatter(render(agentOf({ model })))).toEqual([
        '---',
        'name: review-agent',
        'description: "Reviews the plan."',
        `model: ${model}`,
        '---',
      ]);
    }
  });

  it('F-05 AC-018 writes no model key when the block has no model', () => {
    expect(render(agentOf()).includes('model:')).toBe(false);
  });

  it('F-05 AC-019 writes the tools in the frontmatter as one comma-separated list in the block order', () => {
    expect(frontmatter(render(agentOf({ tools: ['Read', 'Grep', 'Bash(git:*)'] })))[3]).toBe(
      'tools: Read, Grep, Bash(git:*)',
    );
  });

  it('F-05 AC-019 quotes the tools list when YAML would break on a tool name, and writes no tools key with no tools', () => {
    expect(frontmatter(render(agentOf({ tools: ['Read', 'Write: notes'] })))[3]).toBe('tools: "Read, Write: notes"');
    expect(render(agentOf({ tools: [] })).includes('tools:')).toBe(false);
    expect(render(agentOf()).includes('tools:')).toBe(false);
  });

  it('F-05 AC-020 writes the body under an Instructions heading after Purpose, with its line breaks kept', () => {
    const text = render(agentOf({ body: 'First line.\n\nSecond line.' }));
    expect(text).toContain(
      '## Purpose\n\nReviews the plan.\n\n## Instructions\n\nFirst line.\n\nSecond line.\n\n## Arguments',
    );
  });

  it('F-05 AC-020 writes no Instructions section when the body is missing or blank', () => {
    expect(render(agentOf()).includes('## Instructions')).toBe(false);
    expect(render(agentOf({ body: '  \n \n' })).includes('## Instructions')).toBe(false);
  });

  it('F-05 AC-021 writes the Reads and Writes artifacts as one label per line, in their order, under their headings', () => {
    const text = render(agentOf({ reads: ['spec/plan.md', 'spec/stories.md'], writes: ['src/review.md'] }));
    expect(text).toContain(
      '## Arguments\nNo arguments\n\n## Reads\n- `spec/plan.md`\n- `spec/stories.md`\n\n## Writes\n- `src/review.md`\n\n## Rule tags',
    );
  });

  it('F-05 AC-021 leaves out the Reads and Writes sections when their lists are empty or absent', () => {
    const text = render(agentOf({ reads: [], writes: [] }));
    expect(text.includes('## Reads')).toBe(false);
    expect(text.includes('## Writes')).toBe(false);
    expect(text).toContain('## Arguments\nNo arguments\n\n## Rule tags');
  });

  it('F-05 AC-022 writes the rule tags of the block as one comma-separated list under Rule tags, in their order', () => {
    expect(section(render(agentOf({ ruleTags: ruleTags('style', 'safety') })), '## Rule tags')).toEqual([
      '',
      'style, safety',
      '',
    ]);
  });

  it('F-05 AC-022 writes none under Rule tags when the block has no rule tags', () => {
    expect(section(render(agentOf()), '## Rule tags')).toEqual(['', 'none', '']);
    expect(section(render(agentOf({ ruleTags: [] })), '## Rule tags')).toEqual(['', 'none', '']);
  });

  it('F-05 AC-023 writes a placeholder in the body as typed, without filling it a second time', () => {
    const body = 'Write to {{agentName}} and read {{ruleText}} and {{unknown}}.';
    expect(render(agentOf({ body }))).toContain(`## Instructions\n\n${body}\n\n## Arguments`);
  });

  it('F-05 AC-023 writes a placeholder in the description as typed, without filling it a second time', () => {
    expect(render(agentOf({ description: 'Checks {{agentName}}.' }))).toContain('\n\nChecks {{agentName}}.\n');
  });

  it('F-05 AC-017 writes the whole file of a one-agent fixture with no stray blank line from the empty values', () => {
    expect(render(agentOf())).toBe(
      [
        '---',
        'name: review-agent',
        'description: "Reviews the plan."',
        '---',
        '',
        '# review-agent',
        '',
        '## Purpose',
        '',
        'Reviews the plan.',
        '',
        '## Arguments',
        'No arguments',
        '',
        '## Rule tags',
        '',
        'none',
        '',
      ].join('\n'),
    );
  });
});
