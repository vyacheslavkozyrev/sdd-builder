import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import { renderText } from '../../src/pipeline/generate/render.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { baseValues } from '../../src/pipeline/generate/values-agent.js';
import { pipelineSteps, stepList } from '../../src/pipeline/generate/values-command.js';
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { buildConfig } from './analyze-fixture.js';
import { loadTemplates } from './support/load-templates.js';

// The base CLAUDE.md is read from the real templates (source/templates/base/) through the base manifest, and it is
// rendered with the values that baseValues builds for a config. The rule list uses fixture rules, since the default
// pipeline has none.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

const templates: Templates = loadTemplates(templatesRoot);

// The raw CLAUDE.md layout, before rendering; fails the test when the base manifest has no such entry.
function rawClaudeMd(): string {
  const claudeMd = templates.base.find((file) => file.path === 'CLAUDE.md');
  if (claudeMd === undefined) {
    throw new Error('the base manifest has no CLAUDE.md entry');
  }
  return claudeMd.text;
}

// The default pipeline parsed as in layouts-agent-rule.test.ts, so each test gets its own copy.
function defaultConfig(): ProjectConfig {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

// The rules of the fixture: two rules with a title, in config order.
const fixtureRules: Rule[] = [
  { id: 'code-style', title: 'Code style', text: 'Keep the style.' },
  { id: 'review-rules', title: 'Review rules', text: 'Review the change.' },
];

// A plan of the config with the real templates; fails the test when the config is not planned.
function planOf(config: ProjectConfig): Extract<Plan, { readonly ok: true }> {
  const plan = planGeneration(config, templates);
  if (!plan.ok) {
    throw new Error(`expected the config to be planned, got ${plan.problems.map((p) => p.message).join('; ')}`);
  }
  return plan;
}

// The CLAUDE.md text rendered from the real base layout with the values of the config.
function renderedClaudeMd(config: ProjectConfig): string {
  return renderText('CLAUDE.md', rawClaudeMd(), baseValues(config));
}

// The agent names of a config's Agent blocks, in flow order, as the agent files are named.
function agentPathsInFlowOrder(config: ProjectConfig): string[] {
  return config.pipeline.flows.flatMap((flow) =>
    flow.blocks.flatMap((block) =>
      block.kind === 'agent' ? [`.claude/agents/${block.name}.md`] : [],
    ),
  );
}

// The lines of the section under a level-2 heading, up to the next level-2 heading.
function sectionOf(text: string, heading: string): string[] {
  const lines = text.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) {
    throw new Error(`no section ${heading}`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

// The list items of a section: lines that start with "- ", without the marker.
function itemsOf(lines: readonly string[]): string[] {
  return lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
}

describe('F-05 AC-021 CLAUDE.md is the first base file, planned at the root from its layout', () => {
  it('F-05 AC-021 maps the first base manifest entry to CLAUDE.md at the root', () => {
    expect(templates.base[0]?.path).toBe('CLAUDE.md');
  });

  it('F-05 AC-021 plans CLAUDE.md with the rendered base layout', () => {
    const config = defaultConfig();
    const file = planOf(config).files.find((planned) => planned.path === 'CLAUDE.md');
    expect(file?.text).toBe(renderedClaudeMd(config));
  });

  it('F-05 AC-021 renders the default config with no placeholder left in the text', () => {
    expect(renderedClaudeMd(defaultConfig())).not.toMatch(/\{\{/);
  });
});

describe('F-05 AC-022 CLAUDE.md lists the planned command, agent and rule files', () => {
  it('F-05 AC-022 lists exactly the planned command files, pipeline.md first, then one per flow', () => {
    const config = defaultConfig();
    const planned = planOf(config)
      .files.map((file) => file.path)
      .filter((path) => path.startsWith('.claude/commands/'));
    const listed = itemsOf(sectionOf(renderedClaudeMd(config), 'Commands'));
    expect([...listed].sort()).toEqual(planned);
    expect(listed[0]).toBe('.claude/commands/pipeline.md');
  });

  it('F-05 AC-022 lists exactly the planned agent files, in flow order of the config', () => {
    const config = defaultConfig();
    const planned = planOf(config)
      .files.map((file) => file.path)
      .filter((path) => path.startsWith('.claude/agents/'));
    const listed = itemsOf(sectionOf(renderedClaudeMd(config), 'Agents'));
    expect(listed.length).toBeGreaterThan(0);
    expect([...listed].sort()).toEqual(planned);
    expect(listed).toEqual(agentPathsInFlowOrder(config));
  });

  it('F-05 AC-022 lists each planned rule file with its title, in config order', () => {
    const config = buildConfig((c) => {
      c.rules = fixtureRules;
    });
    const planned = planOf(config)
      .files.map((file) => file.path)
      .filter((path) => path.startsWith('.claude/rules/'));
    const listed = itemsOf(sectionOf(renderedClaudeMd(config), 'Rules'));
    expect(planned).toEqual(['.claude/rules/code-style.md', '.claude/rules/review-rules.md']);
    expect(listed).toEqual(['.claude/rules/code-style.md: Code style', '.claude/rules/review-rules.md: Review rules']);
  });

  it('F-05 AC-022 leaves the rule list empty for a config with no rules and writes no rule file', () => {
    const config = defaultConfig();
    expect(itemsOf(sectionOf(renderedClaudeMd(config), 'Rules'))).toEqual([]);
    expect(planOf(config).files.some((file) => file.path.startsWith('.claude/rules/'))).toBe(false);
  });

  it('F-05 AC-022 lists every flow of the process, each with its steps and the gate after it', () => {
    const config = defaultConfig();
    const lines = sectionOf(renderedClaudeMd(config), 'The process');
    for (const flow of config.pipeline.flows) {
      const [flowLine = '', ...gateLines] = pipelineSteps(flow);
      expect(lines).toContain(`- ${flowLine}`);
      for (const step of stepList(flow).split('\n')) {
        expect(lines).toContain(`  ${step}`);
      }
      for (const gate of gateLines) {
        expect(lines).toContain(`- ${gate}`);
      }
    }
  });
});

describe('F-05 AC-023 no base layout holds a placeholder for the project name, the idea or the stack', () => {
  it.each(templates.base.map((file) => [file.path, file.text] as const))(
    'F-05 AC-023 %s holds no projectName, idea or stack. placeholder',
    (_path, text) => {
      expect(text).not.toMatch(/\{\{\s*(projectName|idea|stack\.)/);
    },
  );

  it('F-05 AC-023 generates the default config with no error and no line left in place of a project name', () => {
    const text = renderedClaudeMd(defaultConfig());
    expect(text).not.toMatch(/projectName|idea|stack\./);
    expect(text.startsWith('# Project instructions for Claude Code\n')).toBe(true);
  });

  it('F-05 AC-023 names no path of this repository, no SDDBuilder name and no F-XX id in CLAUDE.md', () => {
    const config = buildConfig((c) => {
      c.rules = fixtureRules;
    });
    for (const text of [rawClaudeMd(), renderedClaudeMd(config)]) {
      expect(text).not.toMatch(/source\//);
      expect(text).not.toMatch(/apps\//);
      expect(text).not.toMatch(/packages\//);
      expect(text).not.toMatch(/SDDBuilder/);
      expect(text).not.toMatch(/F-\d{2}/);
    }
  });

  it('F-05 AC-023 keeps every ## heading out of a fenced block in CLAUDE.md', () => {
    let inFence = false;
    for (const line of rawClaudeMd().split('\n')) {
      if (line.startsWith('```')) {
        inFence = !inFence;
      } else if (inFence) {
        expect(line.startsWith('## ')).toBe(false);
      }
    }
    expect(inFence).toBe(false);
  });
});
