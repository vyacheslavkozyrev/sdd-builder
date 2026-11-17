import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { buildConfig } from './analyze-fixture.js';
import { readLayout } from './support/load-templates.js';

// The two command layouts are read from the real templates (source/templates/) by the reader of the template
// tests. loadTemplates needs every layout and the base manifest, which later tasks of F-05 add, so this file reads
// the two it tests and gives the agent and rule layouts a fixture text: no assertion of these tests reads them.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

function templates(): Templates {
  return {
    base: [],
    pipelineCommand: readLayout(templatesRoot, 'pipeline-command.md'),
    command: readLayout(templatesRoot, 'command.md'),
    agent: { text: 'agent {{name}}\n', headings: [] },
    rule: { text: 'rule {{ruleTitle}}\n{{ruleText}}\n', headings: [] },
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

// The lines of one `## ` section, from its heading to the next `## ` heading or the end of the text.
function section(text: string, heading: string): string[] {
  const lines = text.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) {
    throw new Error(`no section ## ${heading}`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => line !== '');
}

function flowNamed(config: ProjectConfig, id: string): Flow {
  const flow = config.pipeline.flows.find((candidate) => candidate.id === id);
  if (flow === undefined) {
    throw new Error(`no flow ${id}`);
  }
  return flow;
}

describe('F-05 AC-001 the pipeline command has its path and its arguments with the required flag', () => {
  it('F-05 AC-001 plans the pipeline command at .claude/commands/pipeline.md', () => {
    const paths = planOf(defaultConfig()).files.map((file) => file.path);
    expect(paths).toContain('.claude/commands/pipeline.md');
  });

  it('F-05 AC-001 writes each argument with its id and a required flag', () => {
    const lines = section(textAt(defaultConfig(), '.claude/commands/pipeline.md'), 'Arguments');
    expect(lines).toEqual(['- `feature-id` (required): F-XX']);
  });

  it('F-05 AC-001 writes an optional argument with the optional flag and no hint when it has none', () => {
    const config = buildConfig((c) => {
      c.pipeline.arguments = [{ id: 'scope', required: false, hint: '' }];
    });
    const lines = section(textAt(config, '.claude/commands/pipeline.md'), 'Arguments');
    expect(lines).toEqual(['- `scope` (optional)']);
  });
});

describe('F-05 AC-002 every flow and check of the pipeline is a numbered step, in order', () => {
  it('F-05 AC-002 lists each flow, with its approval gate, then its check gate, in pipeline order', () => {
    const steps = section(textAt(defaultConfig(), '.claude/commands/pipeline.md'), 'Steps').filter((line) =>
      /^\d+\./.test(line),
    );
    expect(steps).toEqual([
      '1. Run the flow `specify` (Specify)',
      '2. Approval: Approval on the stories',
      '3. Run the flow `ux` (UX)',
      '4. Approval: Approval on the screens',
      '5. Run the flow `plan` (Plan)',
      '6. Approval: Approval on the plan',
      '7. Run the flow `build` (Build)',
      '8. Check: all tasks committed and the check passes (type checks)',
      '9. Run the flow `verify` (Verify)',
      '10. Approval: Approval: the manual checklist results',
      '11. Run the flow `complete` (Complete)',
    ]);
  });
});

describe('F-05 AC-003 a back route rule names its target and its round limit', () => {
  it('F-05 AC-003 writes "no limit set" for a back route with no round limit', () => {
    const rules = section(textAt(defaultConfig(), '.claude/commands/build.md'), 'Rules');
    expect(rules).toContain(
      '1. On fail, go back to `build-implement` and run again from there; round limit no limit set.',
    );
  });

  it('F-05 AC-003 writes the round limit number when the back route sets one', () => {
    const config = buildConfig();
    const flow = flowNamed(config, 'build');
    flow.blocks = [
      { id: 'build-start', kind: 'start', connectedTo: { to: 'build-implement', label: 'task-id' } },
      {
        id: 'build-implement',
        kind: 'agent',
        name: 'implement',
        description: 'Builds.',
        arguments: 'task-id',
        connectedTo: { to: 'build-review-check', label: 'change' },
      },
      {
        id: 'build-review-check',
        kind: 'check',
        description: 'The review passes.',
        type: 'checks',
        connectedTo: { true: { to: 'build-end' }, false: { to: 'build-implement', roundLimit: 2 } },
      },
      { id: 'build-end', kind: 'end', outcome: 'done' },
    ];
    const rules = section(textAt(config, '.claude/commands/build.md'), 'Rules');
    expect(rules).toEqual([
      '1. On fail, go back to `build-implement` and run again from there; round limit 2.',
    ]);
  });
});

describe('F-05 AC-004 an outcome with no back route writes no rule', () => {
  it('F-05 AC-004 writes two rules for the build flow, not one for each of its six check outcomes', () => {
    const rules = section(textAt(defaultConfig(), '.claude/commands/build.md'), 'Rules');
    expect(rules).toHaveLength(2);
  });

  it('F-05 AC-004 writes no rule for a route that goes forward, or for a stop route', () => {
    const rules = section(textAt(defaultConfig(), '.claude/commands/build.md'), 'Rules');
    expect(rules.join('\n')).not.toContain('build-commit');
    expect(rules.join('\n')).not.toMatch(/stop/i);
  });
});

describe('F-05 AC-005 a one-flow pipeline renders one step and no error', () => {
  it('F-05 AC-005 plans one flow step and no gate step for a pipeline of one flow', () => {
    const config = buildConfig();
    const steps = section(textAt(config, '.claude/commands/pipeline.md'), 'Steps').filter((line) =>
      /^\d+\./.test(line),
    );
    expect(steps).toEqual(['1. Run the flow `build` (Build)']);
  });
});

describe('F-05 AC-006 each flow command has its path, its name, its description and its rule tags', () => {
  it('F-05 AC-006 plans one command file per flow at .claude/commands/<flow-id>.md', () => {
    const paths = planOf(defaultConfig()).files.map((file) => file.path);
    for (const id of ['specify', 'ux', 'plan', 'build', 'verify', 'complete']) {
      expect(paths).toContain(`.claude/commands/${id}.md`);
    }
  });

  it('F-05 AC-006 writes the flow name and id as the title, and the description under Purpose', () => {
    const text = textAt(defaultConfig(), '.claude/commands/ux.md');
    expect(text.split('\n')[0]).toBe('# UX (`ux`)');
    expect(section(text, 'Purpose')).toContain('Draws the screens of the feature from its stories.');
  });

  it('F-05 AC-006 writes the rule tags of a flow, comma-separated', () => {
    const config = defaultConfig();
    config.rules = [
      { id: 'review-rules', title: 'Review rules', text: 'Review the change.' },
      { id: 'code-style', title: 'Code style', text: 'Keep the style.' },
    ];
    flowNamed(config, 'build').ruleTags = ['review-rules', 'code-style'];
    expect(textAt(config, '.claude/commands/build.md')).toContain('Rule tags: review-rules, code-style');
  });
});

describe('F-05 AC-007 a flow with no rule tags writes none', () => {
  it('F-05 AC-007 writes "none" as the rule tags of a flow that has none', () => {
    const text = textAt(defaultConfig(), '.claude/commands/build.md');
    expect(text).toContain('Rule tags: none');
  });
});

describe('F-05 AC-008 the steps of a flow are its blocks in order, Start and End included', () => {
  it('F-05 AC-008 writes one step per block of the build flow, Start first and End last', () => {
    const steps = section(textAt(defaultConfig(), '.claude/commands/build.md'), 'Steps').filter((line) =>
      /^\d+\./.test(line),
    );
    expect(steps).toEqual([
      '1. Start with the arguments `for each task`',
      '2. Run the agent `implement` with `feature-id and task-id`: ' +
        'Builds the task from plan.md and the approved screens, with its tests, in the files the task lists.',
      '3. Run the agent `review` with `feature-id and task-id`: ' +
        'Reviews the change of the task against its stories, the plan and the rules, ' +
        'and reports each blocker and warning.',
      '4. Check: the review reports no blocker or warning (type checks)',
      '5. Run the agent `test` with `feature-id and task-id`: ' +
        'Runs the tests and checks the acceptance criteria the task covers.',
      '6. Check: the check script of the project passes (type checks)',
      '7. Check: the change of the task is at most 400 changed lines (type diff size, threshold 400)',
      '8. Run the agent `commit` with `feature-id and task-id`: ' +
        'Commits the change of the task, with the feature ID at the start of the message.',
      '9. End as `done`',
    ]);
  });
});

describe('F-05 AC-009 a check back route is a numbered rule in the flow command', () => {
  it('F-05 AC-009 writes each back route of the build checks under the Rules section, numbered', () => {
    const text = textAt(defaultConfig(), '.claude/commands/build.md');
    expect(section(text, 'Rules')).toEqual([
      '1. On fail, go back to `build-implement` and run again from there; round limit no limit set.',
      '2. On fail, go back to `build-implement` and run again from there; round limit no limit set.',
    ]);
  });
});

describe('F-05 AC-010 a flow with only Start and End has two steps and no route rule', () => {
  it('F-05 AC-010 writes two steps and no rule for a flow of Start and End only', () => {
    const config = buildConfig((c) => {
      flowNamed(c, 'build').blocks = [
        { id: 'build-start', kind: 'start', connectedTo: { to: 'build-end', label: 'feature-id' } },
        { id: 'build-end', kind: 'end', outcome: 'done' },
      ];
    });
    const text = textAt(config, '.claude/commands/build.md');
    const steps = section(text, 'Steps').filter((line) => /^\d+\./.test(line));
    expect(steps).toEqual(['1. Start with the arguments `feature-id`', '2. End as `done`']);
    expect(section(text, 'Rules')).toEqual([]);
  });

  it('F-05 AC-010 plans the flow of Start and End only with no error', () => {
    const config = buildConfig((c) => {
      flowNamed(c, 'build').blocks = [
        { id: 'build-start', kind: 'start', connectedTo: { to: 'build-end', label: 'feature-id' } },
        { id: 'build-end', kind: 'end', outcome: 'done' },
      ];
    });
    expect(planGeneration(config, templates()).ok).toBe(true);
  });
});
