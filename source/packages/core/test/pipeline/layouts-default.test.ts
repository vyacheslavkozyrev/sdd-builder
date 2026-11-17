import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { GenerationError } from '../../src/pipeline/generate/errors.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import { type PlaceholderValues, renderText } from '../../src/pipeline/generate/render.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { agentValues, baseValues, ruleValues } from '../../src/pipeline/generate/values-agent.js';
import { flowValues, pipelineValues } from '../../src/pipeline/generate/values-command.js';
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { loadTemplates } from './support/load-templates.js';

// The whole default output is planned from the real layouts (source/templates/), read through the base manifest.
// The default pipeline has no rules, so the rule layout is rendered with a sample rule to show its placeholders
// are filled. No clock and no random input is used.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

// The default pipeline parsed as in plan-fixed-templates.test.ts, so each test gets its own copy.
function defaultConfig(): ProjectConfig {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

// A plan of the config with the templates read from the given root; fails the test when the config is not planned.
function planOf(config: ProjectConfig, templates: Templates): Extract<Plan, { readonly ok: true }> {
  const plan = planGeneration(config, templates);
  if (!plan.ok) {
    throw new Error(`expected the config to be planned, got ${plan.problems.map((p) => p.message).join('; ')}`);
  }
  return plan;
}

// A rule used only to render the rule layout: the default pipeline has no rules of its own.
const sampleRule: Rule = { id: 'sample-rule', title: 'Sample rule', text: 'Keep the sample.' };

// The placeholder names a layout uses, in order of appearance, with each name between the braces.
function placeholderNames(text: string): string[] {
  return [...text.matchAll(/\{\{([^{}]*)\}\}/g)].map((match) => match[1] ?? '');
}

// Every layout of the real templates with the value sets the generator gives it for the default config: the base
// files with the base values, the pipeline command with the pipeline values, each command with its flow's values,
// each agent with its Agent block's values, and the rule layout with the sample rule's values.
interface LayoutCase {
  readonly label: string;
  readonly text: string;
  readonly valueSets: readonly PlaceholderValues[];
}

function layoutCases(config: ProjectConfig, templates: Templates): LayoutCase[] {
  const agents = config.pipeline.flows.flatMap((flow) =>
    flow.blocks.flatMap((block) => (block.kind === 'agent' ? [block] : [])),
  );
  return [
    ...templates.base.map((file) => ({ label: file.path, text: file.text, valueSets: [baseValues(config)] })),
    {
      label: '.claude/commands/pipeline.md',
      text: templates.pipelineCommand.text,
      valueSets: [pipelineValues(config.pipeline)],
    },
    {
      label: '.claude/commands/<flow>.md',
      text: templates.command.text,
      valueSets: config.pipeline.flows.map((flow) => flowValues(flow)),
    },
    {
      label: '.claude/agents/<name>.md',
      text: templates.agent.text,
      valueSets: agents.map((agent) => agentValues(agent)),
    },
    { label: '.claude/rules/<id>.md', text: templates.rule.text, valueSets: [ruleValues(sampleRule)] },
  ];
}

const templates: Templates = loadTemplates(templatesRoot);

// The output files of the default config, in code-point order: the base files of the manifest, the pipeline
// command, one command per child flow, and one agent per Agent block; no rule file, since the default has no rules.
const EXPECTED_PATHS = [
  '.claude/agents/commit.md',
  '.claude/agents/complete.md',
  '.claude/agents/implement.md',
  '.claude/agents/plan.md',
  '.claude/agents/review.md',
  '.claude/agents/specify.md',
  '.claude/agents/test.md',
  '.claude/agents/ux.md',
  '.claude/agents/verify.md',
  '.claude/commands/build.md',
  '.claude/commands/complete.md',
  '.claude/commands/pipeline.md',
  '.claude/commands/plan.md',
  '.claude/commands/specify.md',
  '.claude/commands/ux.md',
  '.claude/commands/verify.md',
  'CLAUDE.md',
  'spec/documents/process.md',
  'spec/specifications/F-00-template/plan.md',
  'spec/specifications/F-00-template/progress.md',
  'spec/specifications/F-00-template/stories.md',
];

describe('F-05 AC-031 planning the default config twice with the real templates gives the same output', () => {
  it('F-05 AC-031 gives the same file list and the same paths on the second run', () => {
    const config = defaultConfig();
    const first = planOf(config, loadTemplates(templatesRoot));
    const second = planOf(config, loadTemplates(templatesRoot));
    expect(second.files.map((file) => file.path)).toEqual(first.files.map((file) => file.path));
  });

  it('F-05 AC-031 gives the same text for every file on the second run', () => {
    const config = defaultConfig();
    const first = planOf(config, loadTemplates(templatesRoot));
    const second = planOf(config, loadTemplates(templatesRoot));
    expect(second.files.map((file) => file.text)).toEqual(first.files.map((file) => file.text));
  });

  it('F-05 AC-031 gives an equal plan as a whole on the second run', () => {
    const config = defaultConfig();
    const first = planOf(config, loadTemplates(templatesRoot));
    const second = planOf(config, loadTemplates(templatesRoot));
    expect(second).toStrictEqual(first);
  });
});

describe('F-05 AC-032 no output file of the default pipeline names this repository', () => {
  const forbidden = [
    { name: 'SDDBuilder', pattern: /SDDBuilder/i },
    { name: 'source/apps', pattern: /source\/apps/ },
    { name: 'source/packages', pattern: /source\/packages/ },
    { name: 'source/templates', pattern: /source\/templates/ },
    { name: 'source/scripts', pattern: /source\/scripts/ },
    { name: 'an absolute user path', pattern: /\/Users\// },
  ];

  it('F-05 AC-032 mentions none of the repository names in any output file', () => {
    const plan = planOf(defaultConfig(), templates);
    const found = plan.files.flatMap((file) =>
      forbidden.filter((entry) => entry.pattern.test(file.text)).map((entry) => `${file.path}: ${entry.name}`),
    );
    expect(found).toEqual([]);
  });

  it('F-05 AC-032 names no repository path in the file paths either', () => {
    const plan = planOf(defaultConfig(), templates);
    const paths = plan.files.filter((file) => /source\/|SDDBuilder/i.test(file.path));
    expect(paths).toEqual([]);
  });
});

// The layout files under source/templates/ (README.md is documentation, not a layout), by their path from the root.
const LAYOUT_FILES = [
  'base/CLAUDE.md',
  'base/process.md',
  'base/spec-template/plan.md',
  'base/spec-template/progress.md',
  'base/spec-template/stories.md',
  'claude-code/agent.md',
  'claude-code/command.md',
  'claude-code/pipeline-command.md',
  'claude-code/rule.md',
];

describe('F-05 AC-033 every placeholder a layout uses is a value the generator gives for the default config', () => {
  it('F-05 AC-033 reads every layout file under source/templates/, none left out of the checks below', () => {
    const onDisk = readdirSync(templatesRoot, { recursive: true })
      .map(String)
      .filter((name) => name.endsWith('.md') && name !== 'README.md')
      .sort();
    expect(onDisk).toEqual(LAYOUT_FILES);
    const checked = [
      ...templates.base.map((file) => file.text),
      templates.pipelineCommand.text,
      templates.command.text,
      templates.agent.text,
      templates.rule.text,
    ];
    const fromDisk = LAYOUT_FILES.map((file) => readFileSync(join(templatesRoot, file), 'utf8'));
    expect([...checked].sort()).toEqual([...fromDisk].sort());
  });

  it('F-05 AC-033 renders every layout with the values of the default config without a throw', () => {
    for (const layout of layoutCases(defaultConfig(), templates)) {
      for (const values of layout.valueSets) {
        expect(() => renderText(layout.label, layout.text, values), layout.label).not.toThrow();
      }
    }
  });

  it('F-05 AC-033 finds every placeholder name of every layout among the values given for it', () => {
    const missing = layoutCases(defaultConfig(), templates).flatMap((layout) =>
      layout.valueSets.flatMap((values) =>
        placeholderNames(layout.text)
          .filter((name) => !Object.hasOwn(values, name))
          .map((name) => `${layout.label}: {{${name}}}`),
      ),
    );
    expect(missing).toEqual([]);
  });

  it('F-05 AC-033 finds at least one placeholder in the layouts, so the check is not empty', () => {
    const names = layoutCases(defaultConfig(), templates).flatMap((layout) => placeholderNames(layout.text));
    expect(names.length).toBeGreaterThan(0);
  });

  it('F-05 AC-033 fails on a fixture with a placeholder that no value fills', () => {
    const values = baseValues(defaultConfig());
    expect(() => renderText('fixture.md', 'before {{noSuchValue}} after', values)).toThrow(GenerationError);
    expect(() => renderText('fixture.md', 'before {{noSuchValue}} after', values)).toThrow(/noSuchValue/);
  });

  it('F-05 AC-033 makes planning fail on a fixture base layout with a placeholder that no value fills', () => {
    const claudeMd = templates.base.find((file) => file.path === 'CLAUDE.md');
    if (claudeMd === undefined) {
      throw new Error('the base manifest has no CLAUDE.md entry');
    }
    const broken: Templates = {
      ...templates,
      base: templates.base.map((file) =>
        file.path === 'CLAUDE.md' ? { ...file, text: `${file.text}\n{{noSuchValue}}\n` } : file,
      ),
    };
    expect(() => planGeneration(defaultConfig(), broken)).toThrow(GenerationError);
  });
});

describe('F-05 AC-034 no output file of the default pipeline has a placeholder or a marker left', () => {
  it('F-05 AC-034 has no `{{` left in any output file', () => {
    const plan = planOf(defaultConfig(), templates);
    expect(plan.files.filter((file) => file.text.includes('{{')).map((file) => file.path)).toEqual([]);
  });

  it('F-05 AC-034 has no `#enabled` section marker left in any output file', () => {
    const plan = planOf(defaultConfig(), templates);
    expect(plan.files.filter((file) => file.text.includes('#enabled')).map((file) => file.path)).toEqual([]);
  });

  it('F-05 AC-034 has no `#step:` step marker left in any output file', () => {
    const plan = planOf(defaultConfig(), templates);
    expect(plan.files.filter((file) => file.text.includes('#step:')).map((file) => file.path)).toEqual([]);
  });
});

describe('F-05 AC-035 the default config renders through every layout into the expected output files', () => {
  it('F-05 AC-035 renders through every layout with no error', () => {
    expect(() => planOf(defaultConfig(), templates)).not.toThrow();
  });

  it('F-05 AC-035 plans exactly the expected output files, in code-point order', () => {
    const plan = planOf(defaultConfig(), templates);
    expect(plan.files.map((file) => file.path)).toEqual(EXPECTED_PATHS);
  });

  it('F-05 AC-035 plans no file under .claude/rules for the default config', () => {
    const plan = planOf(defaultConfig(), templates);
    expect(plan.files.filter((file) => file.path.startsWith('.claude/rules/'))).toEqual([]);
  });
});
