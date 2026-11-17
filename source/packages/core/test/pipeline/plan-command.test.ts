import { describe, expect, it } from 'vitest';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { PlannedFile } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { buildConfig } from './analyze-fixture.js';

// Fixture layouts, given as data. They use the placeholders of the command and pipeline files and nothing else.
const templates: Templates = {
  base: [],
  pipelineCommand: {
    text: [
      'Arguments:',
      '{{argumentList}}',
      'Steps:',
      '{{pipelineStepList}}',
      'Rules:',
      '{{routeRules}}',
      'Commands:',
      '{{commandList}}',
      '',
    ].join('\n'),
    headings: [],
  },
  command: {
    text: '# {{flowName}}\n{{description}}\nTags: {{ruleTags}}\n{{stepList}}\n{{routeRules}}\n',
    headings: [],
  },
  agent: { text: 'agent\n', headings: [] },
  rule: { text: 'rule\n', headings: [] },
};

// A flow with a start, an agent, a check whose false route goes back with a round limit, an agent, a check whose
// false route goes back with no limit, and an end. The true routes go forward.
function buildFlow(): Flow {
  return {
    id: 'build',
    name: 'Build',
    description: 'Builds one feature.',
    arguments: 'feature-id',
    ruleTags: ['quality', 'style'],
    blocks: [
      { id: 'build-start', kind: 'start', connectedTo: { to: 'build-implement', label: 'feature-id' } },
      {
        id: 'build-implement',
        kind: 'agent',
        name: 'implement',
        description: 'Writes the code.',
        arguments: 'feature-id',
        connectedTo: { to: 'build-review', label: 'code' },
      },
      {
        id: 'build-review',
        kind: 'check',
        description: 'Review passes',
        type: 'checks',
        connectedTo: { true: { to: 'build-verify' }, false: { to: 'build-implement', roundLimit: 2 } },
      },
      {
        id: 'build-verify',
        kind: 'agent',
        name: 'verify',
        description: 'Runs the checks.',
        arguments: 'feature-id',
        connectedTo: { to: 'build-tests', label: 'verified' },
      },
      {
        id: 'build-tests',
        kind: 'check',
        description: 'Tests pass',
        type: 'diff size',
        threshold: 200,
        connectedTo: { true: { to: 'build-end' }, false: { to: 'build-verify' } },
      },
      { id: 'build-end', kind: 'end', outcome: 'done', producedArtifact: 'the change' },
    ],
  };
}

// A flow with one agent, used as the second flow of the pipeline.
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
        connectedTo: { to: 'ship-end', label: 'release' },
      },
      { id: 'ship-end', kind: 'end', outcome: 'done' },
    ],
  };
}

// The valid config of the tests with the given flows in the pipeline. It has the two rules that the rule tags of
// the fixture flow name, so the tags are not refused.
function configWith(flows: Flow[]): ProjectConfig {
  return buildConfig((config) => {
    config.rules = [
      { id: 'quality', title: 'Quality', text: 'Keep the code clean.' },
      { id: 'style', title: 'Style', text: 'Keep the code short.' },
    ];
    config.pipeline.flows = flows;
  });
}

// The ship flow with a check after its agent, whose false route goes back to the agent with a round limit of 1.
function retryShipFlow(): Flow {
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
        connectedTo: { to: 'ship-check', label: 'release' },
      },
      {
        id: 'ship-check',
        kind: 'check',
        description: 'Release passes',
        type: 'checks',
        connectedTo: { true: { to: 'ship-end' }, false: { to: 'ship-deploy', roundLimit: 1 } },
      },
      { id: 'ship-end', kind: 'end', outcome: 'done' },
    ],
  };
}

// The build flow followed by the ship flow, linked so that the ship flow is reached.
function linkedFlows(): Flow[] {
  const build = buildFlow();
  build.connectedTo = { to: 'ship', label: 'shipped' };
  return [build, shipFlow()];
}

// The planned file at the given path; fails the test when the config is refused or the file is not planned.
function fileAt(config: ProjectConfig, path: string, layouts: Templates = templates): PlannedFile {
  const plan = planGeneration(config, layouts);
  if (!plan.ok) {
    throw new Error('expected the config to be planned');
  }
  const file = plan.files.find((item) => item.path === path);
  if (file === undefined) {
    throw new Error(`no planned file at ${path}`);
  }
  return file;
}

const BUILD_STEPS = [
  '1. Start with the arguments `feature-id`',
  '2. Run the agent `implement` with `feature-id`: Writes the code.',
  '3. Check: Review passes (type checks)',
  '4. Run the agent `verify` with `feature-id`: Runs the checks.',
  '5. Check: Tests pass (type diff size, threshold 200)',
  '6. End as `done`, producing `the change`',
].join('\n');

const BUILD_RULES = [
  '1. On fail, go back to `build-implement` and run again from there; round limit 2.',
  '2. On fail, go back to `build-verify` and run again from there; round limit no limit set.',
].join('\n');

describe('F-04 AC-011 each command file carries its description and rule tags', () => {
  it('F-04 AC-011 gives a flow command file the flow description and rule tags', () => {
    const file = fileAt(configWith([buildFlow()]), '.claude/commands/build.md');
    expect(file.description).toBe('Builds one feature.');
    expect(file.ruleTags).toEqual(['quality', 'style']);
  });

  it('F-04 AC-011 gives an empty description and no rule tags when the flow has neither', () => {
    const flow = buildFlow();
    flow.description = '';
    delete flow.ruleTags;
    const file = fileAt(configWith([flow]), '.claude/commands/build.md');
    expect(file.description).toBe('');
    expect(file.ruleTags).toEqual([]);
  });

  it('F-04 AC-011 gives the pipeline command file no description and no rule tags of its own', () => {
    const file = fileAt(configWith([buildFlow()]), '.claude/commands/pipeline.md');
    expect(file.description).toBe('');
    expect(file.ruleTags).toEqual([]);
  });

  it('F-04 AC-011 renders the flow command file with its name, description, tags, steps and rules', () => {
    const file = fileAt(configWith([buildFlow()]), '.claude/commands/build.md');
    expect(file.text).toBe(`# Build\nBuilds one feature.\nTags: quality, style\n${BUILD_STEPS}\n${BUILD_RULES}\n`);
  });

  it('F-04 AC-011 writes none as the tags of a flow with no rule tags', () => {
    const flow = buildFlow();
    delete flow.ruleTags;
    const file = fileAt(configWith([flow]), '.claude/commands/build.md');
    expect(file.text).toContain('Tags: none\n');
  });

  it('F-04 AC-011 writes none as the tags of a flow with an empty tag list, and plans no tags', () => {
    const flow = buildFlow();
    flow.ruleTags = [];
    const file = fileAt(configWith([flow]), '.claude/commands/build.md');
    expect(file.text).toContain('Tags: none\n');
    expect(file.ruleTags).toEqual([]);
  });

  it('F-04 AC-011 writes a check gate between two flows as a check step of the pipeline command', () => {
    const build = buildFlow();
    build.connectedTo = {
      to: 'ship',
      label: 'shipped',
      gate: { kind: 'check', description: 'Diff is small', type: 'diff size', threshold: 50 },
    };
    const file = fileAt(configWith([build, shipFlow()]), '.claude/commands/pipeline.md');
    expect(file.text).toContain(
      '2. Check: Diff is small (type diff size, threshold 50)\n3. Run the flow `ship` (Ship)\n',
    );
  });

  it('F-04 AC-011 leaves no placeholder in any command file', () => {
    const plan = planGeneration(configWith(linkedFlows()), templates);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const commands = plan.files.filter((file) => file.path.startsWith('.claude/commands/'));
    expect(commands.length).toBe(3);
    for (const file of commands) {
      expect(file.text).not.toMatch(/\{\{/);
    }
  });

  it('F-04 AC-011 renders the pipeline command with its arguments, flow and gate steps, rules and command list', () => {
    const build = buildFlow();
    build.connectedTo = {
      to: 'ship',
      label: 'shipped',
      gate: { kind: 'approval', description: 'Owner approves the build' },
    };
    const config = configWith([build, shipFlow()]);
    config.pipeline.arguments.push({ id: 'note', required: false, hint: '' });
    const file = fileAt(config, '.claude/commands/pipeline.md');
    expect(file.text).toBe(
      [
        'Arguments:',
        '- `feature-id` (required): F-XX',
        '- `note` (optional)',
        'Steps:',
        '1. Run the flow `build` (Build)',
        '2. Approval: Owner approves the build',
        '3. Run the flow `ship` (Ship)',
        'Rules:',
        BUILD_RULES,
        'Commands:',
        '- .claude/commands/pipeline.md',
        '- .claude/commands/build.md',
        '- .claude/commands/ship.md',
        '',
      ].join('\n'),
    );
  });
});

describe('F-04 AC-012 the flow id and name fill the flow command file', () => {
  it('F-04 AC-012 gives each flow command file its own flow id', () => {
    const layouts: Templates = { ...templates, command: { text: 'id={{flowId}}\n', headings: [] } };
    const config = configWith(linkedFlows());
    expect(fileAt(config, '.claude/commands/build.md', layouts).text).toBe('id=build\n');
    expect(fileAt(config, '.claude/commands/ship.md', layouts).text).toBe('id=ship\n');
  });

  it('F-04 AC-012 gives the steps of a flow in block order, with the arguments of its Start block', () => {
    const layouts: Templates = { ...templates, command: { text: '{{stepList}}\n', headings: [] } };
    expect(fileAt(configWith([buildFlow()]), '.claude/commands/build.md', layouts).text).toBe(`${BUILD_STEPS}\n`);
  });
});

describe('F-04 AC-015 each back route is a numbered rule with its target and round limit', () => {
  it('F-04 AC-015 names the target block and round limit of each back route, in block order', () => {
    const file = fileAt(configWith([buildFlow()]), '.claude/commands/build.md');
    expect(file.text.split('\n')).toContain(
      '1. On fail, go back to `build-implement` and run again from there; round limit 2.',
    );
    expect(file.text.split('\n')).toContain(
      '2. On fail, go back to `build-verify` and run again from there; round limit no limit set.',
    );
  });

  it('F-04 AC-015 writes no rule for a route that goes forward or stops', () => {
    const flow = buildFlow();
    const review = flow.blocks[2];
    const tests = flow.blocks[4];
    if (review?.kind !== 'check' || tests?.kind !== 'check') {
      throw new Error('the fixture blocks are checks');
    }
    review.connectedTo.false = { stop: true };
    tests.connectedTo.false = { stop: true };
    const file = fileAt(configWith([flow]), '.claude/commands/build.md');
    expect(file.text).toBe(`# Build\nBuilds one feature.\nTags: quality, style\n${BUILD_STEPS}\n\n`);
  });

  it('F-04 AC-015 numbers the back routes of all flows in one list, in pipeline order', () => {
    const build = buildFlow();
    build.connectedTo = { to: 'ship', label: 'shipped' };
    const file = fileAt(configWith([build, retryShipFlow()]), '.claude/commands/pipeline.md');
    const shipRule = '3. On fail, go back to `ship-deploy` and run again from there; round limit 1.';
    expect(file.text).toContain(`Rules:\n${BUILD_RULES}\n${shipRule}\nCommands:`);
  });

  it('F-04 AC-015 gives a flow command file only its own back routes, numbered from 1', () => {
    const build = buildFlow();
    build.connectedTo = { to: 'ship', label: 'shipped' };
    const file = fileAt(configWith([build, retryShipFlow()]), '.claude/commands/ship.md');
    expect(file.text).toBe(
      [
        '# Ship',
        'Ships one feature.',
        'Tags: none',
        '1. Start with the arguments `feature-id`',
        '2. Run the agent `deploy` with `feature-id`: Deploys the change.',
        '3. Check: Release passes (type checks)',
        '4. End as `done`',
        '1. On fail, go back to `ship-deploy` and run again from there; round limit 1.',
        '',
      ].join('\n'),
    );
  });
});
