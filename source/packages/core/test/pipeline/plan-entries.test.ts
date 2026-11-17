import { describe, expect, it } from 'vitest';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { GenerationError } from '../../src/pipeline/generate/errors.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { PlannedFile } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { buildConfig } from './analyze-fixture.js';

// Fixture layouts, given as data. The base file lists the process, the command, agent and rule files.
const templates: Templates = {
  base: [
    {
      path: 'CLAUDE.md',
      text: 'Commands:\n{{commandList}}\nAgents:\n{{agentList}}\nRules:\n{{ruleList}}\nProcess:\n{{processList}}\n',
      headings: [],
    },
  ],
  pipelineCommand: { text: 'pipeline {{commandList}}\n', headings: [] },
  command: { text: 'flow {{flowId}}\n', headings: [] },
  agent: { text: '# {{name}}\n{{description}}\nTags: {{ruleTags}}\n', headings: ['## Purpose'] },
  rule: { text: '# {{ruleTitle}}\n{{ruleText}}\n', headings: [] },
};

// The build flow: Start, an agent `review` with the rule tag `style`, and End. It is linked to the ship flow
// through a check gate.
function buildFlow(): Flow {
  return {
    id: 'build',
    name: 'Build',
    description: 'Builds one feature.',
    arguments: 'feature-id',
    blocks: [
      { id: 'build-start', kind: 'start', connectedTo: { to: 'build-review', label: 'feature-id' } },
      {
        id: 'build-review',
        kind: 'agent',
        name: 'review',
        description: 'Reviews the code.',
        arguments: 'feature-id',
        ruleTags: ['style'],
        connectedTo: { to: 'build-end', label: 'reviewed' },
      },
      { id: 'build-end', kind: 'end', outcome: 'done' },
    ],
    connectedTo: {
      to: 'ship',
      label: 'shipped',
      gate: { kind: 'check', description: 'Tests pass', type: 'checks' },
    },
  };
}

// The ship flow: Start, an agent `deploy` with no rule tags, and End.
function shipFlow(): Flow {
  return {
    id: 'ship',
    name: 'Ship',
    description: 'Ships one feature.',
    arguments: 'feature-id',
    blocks: [
      { id: 'ship-start', kind: 'start', connectedTo: { to: 'ship-deploy', label: 'feature-id' } },
      {
        id: 'ship-deploy',
        kind: 'agent',
        name: 'deploy',
        description: 'Deploys the change.',
        arguments: 'feature-id',
        connectedTo: { to: 'ship-end', label: 'released' },
      },
      { id: 'ship-end', kind: 'end', outcome: 'done' },
    ],
  };
}

// The valid config of the tests: the two flows, and two rules in config order. The second rule's text holds
// placeholder-like text, which must reach the output unchanged.
function entryConfig(): ProjectConfig {
  return buildConfig((config) => {
    config.rules = [
      { id: 'style', title: 'Style', text: 'Keep the code short.' },
      { id: 'tone', title: 'Tone', text: 'Use {{ruleTitle}} as written.' },
    ];
    config.pipeline.flows = [buildFlow(), shipFlow()];
  });
}

// The planned file at the given path; fails the test when the config is refused or the file is not planned.
function fileAt(config: ProjectConfig, path: string): PlannedFile {
  const plan = planGeneration(config, templates);
  if (!plan.ok) {
    throw new Error('expected the config to be planned');
  }
  const file = plan.files.find((planned) => planned.path === path);
  if (file === undefined) {
    throw new Error(`expected a planned file at ${path}`);
  }
  return file;
}

describe('F-04 AC-011 each agent file carries its rendered layout, description and rule tags', () => {
  it('F-04 AC-011 gives an agent file the description and rule tags of its Agent block', () => {
    const file = fileAt(entryConfig(), '.claude/agents/review.md');
    expect(file.description).toBe('Reviews the code.');
    expect(file.ruleTags).toEqual(['style']);
    expect(file.headings).toEqual(['## Purpose']);
  });

  it('F-04 AC-011 renders the agent layout with the name, description and tags', () => {
    const file = fileAt(entryConfig(), '.claude/agents/review.md');
    expect(file.text).toBe('# review\nReviews the code.\nTags: style\n');
  });

  it('F-04 AC-011 gives an empty tag list and writes none when the Agent block has no rule tags', () => {
    const file = fileAt(entryConfig(), '.claude/agents/deploy.md');
    expect(file.description).toBe('Deploys the change.');
    expect(file.ruleTags).toEqual([]);
    expect(file.text).toBe('# deploy\nDeploys the change.\nTags: none\n');
  });

  it('F-04 AC-011 writes none as the tags of an Agent block whose tag list is emptied', () => {
    const config = entryConfig();
    const review = config.pipeline.flows[0]?.blocks[1];
    if (review?.kind === 'agent') {
      review.ruleTags = [];
    }
    const file = fileAt(config, '.claude/agents/review.md');
    expect(file.ruleTags).toEqual([]);
    expect(file.text).toContain('Tags: none\n');
  });
});

describe('F-04 AC-011 each rule file carries its title and text', () => {
  it('F-04 AC-011 renders the rule layout with the title and text of the rule', () => {
    const file = fileAt(entryConfig(), '.claude/rules/style.md');
    expect(file.text).toBe('# Style\nKeep the code short.\n');
    expect(file.description).toBe('');
    expect(file.ruleTags).toEqual([]);
  });

});

describe('F-04 AC-011 each base file carries its rendered text with no description and no tags', () => {
  it('F-04 AC-011 renders the base file with the command, agent, rule and process lists', () => {
    const file = fileAt(entryConfig(), 'CLAUDE.md');
    expect(file.text).toBe(
      [
        'Commands:',
        '- .claude/commands/pipeline.md',
        '- .claude/commands/build.md',
        '- .claude/commands/ship.md',
        'Agents:',
        '- .claude/agents/review.md',
        '- .claude/agents/deploy.md',
        'Rules:',
        '- .claude/rules/style.md: Style',
        '- .claude/rules/tone.md: Tone',
        'Process:',
        '- Run the flow `build` (Build)',
        '  1. Start with the arguments `feature-id`',
        '  2. Run the agent `review` with `feature-id`: Reviews the code.',
        '  3. End as `done`',
        '- Check: Tests pass (type checks)',
        '- Run the flow `ship` (Ship)',
        '  1. Start with the arguments `feature-id`',
        '  2. Run the agent `deploy` with `feature-id`: Deploys the change.',
        '  3. End as `done`',
        '',
      ].join('\n'),
    );
    expect(file.description).toBe('');
    expect(file.ruleTags).toEqual([]);
  });

  it('F-04 AC-011 leaves no placeholder in any planned text', () => {
    const plan = planGeneration(entryConfig(), templates);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    for (const file of plan.files) {
      if (file.path !== '.claude/rules/tone.md') {
        expect(file.text, file.path).not.toMatch(/\{\{/);
      }
    }
  });
});

describe('F-04 AC-013 a placeholder with no value makes planning throw, naming it and the file', () => {
  it('F-04 AC-013 refuses a base file with a placeholder that has no value, naming it and the path', () => {
    const broken: Templates = {
      ...templates,
      base: [{ path: 'CLAUDE.md', text: '# {{projectName}}\n', headings: [] }],
    };
    expect(() => planGeneration(entryConfig(), broken)).toThrow(GenerationError);
    expect(() => planGeneration(entryConfig(), broken)).toThrow('{{projectName}}');
    expect(() => planGeneration(entryConfig(), broken)).toThrow('CLAUDE.md');
  });
});

describe('F-04 AC-014 a value with placeholder-like text is copied as written', () => {
  it('F-04 AC-014 keeps placeholder-like text in a rule text unchanged', () => {
    const file = fileAt(entryConfig(), '.claude/rules/tone.md');
    expect(file.text).toBe('# Tone\nUse {{ruleTitle}} as written.\n');
  });
});
