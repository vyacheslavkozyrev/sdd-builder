import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { planGeneration, type GeneratedPlan } from '../../src/pipeline/generate/plan.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { defaultPipeline } from '../../src/pipeline/default.js';
import type { Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import { validConfig } from './analyze-fixture.js';

// Fixture layouts, given as data (AC-035): no template file is read.
const TEMPLATES: GenerationTemplates = {
  base: [{ path: 'CLAUDE.md', layout: 'Project instructions.' }],
  pipeline: 'Pipeline {{pipelineName}}:{{pipelineFlows}}',
  flow: 'Flow {{flowId}}:{{flowSteps}}{{flowApproval}}',
  agent: 'Agent {{agentName}}{{agentBody}}',
  rule: 'Rule {{ruleId}}{{ruleText}}',
};

const RULES: readonly Rule[] = [
  { index: 0, id: 'alpha', title: 'Alpha', text: 'First rule.' },
  { index: 1, id: 'beta', title: 'Beta', text: 'Second rule.' },
];

// A flow of the valid fixture with its own id, its own agent name and block ids prefixed by the flow id, so that
// flows do not share a path or a block id (the analysis requires unique block ids across the pipeline).
function flowOf(id: string): Flow {
  const flow = validConfig().pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return {
    ...flow,
    id,
    blocks: flow.blocks.map((block) => {
      const blockId = `${id}-${block.id}`;
      if (block.kind === 'agent') return { ...block, id: blockId, name: `${id}-agent`, next: `${id}-${block.next}` };
      if (block.kind === 'start') return { ...block, id: blockId, next: `${id}-${block.next}` };
      return { ...block, id: blockId };
    }),
  };
}

// The flows in the given order, each with its `index` set to its position (the parser assigns it the same way) and
// linked to the flow after it, so that every flow is reached from the first (AC-007 order).
function linked(flows: readonly Flow[]): Flow[] {
  return flows.map((flow, i) => {
    const following = flows[i + 1];
    return following === undefined ? { ...flow, index: i } : { ...flow, index: i, next: following.id };
  });
}

// The given flows, linked, and the given rules.
function configWith(flows: readonly Flow[], rules: readonly Rule[]): ProjectConfig {
  const base = validConfig();
  return { ...base, rules, pipeline: { ...base.pipeline, flows: linked(flows) } };
}

// The files of a plan for a config with no blocker. A config with a blocker fails the test (refusals are in T009's test).
function planOf(config: ProjectConfig, templates: GenerationTemplates): GeneratedPlan {
  const result = planGeneration(config, templates);
  if (!result.ok) throw new Error(`the config has ${result.problems.length} blocker(s)`);
  return { files: result.files };
}

function pathsOf(plan: GeneratedPlan): string[] {
  return plan.files.map((file) => file.path);
}

// Code-point order, the order of the file list (decision 35). It differs from `sort()` (UTF-16) only beyond the BMP.
function byCodePoint(a: string, b: string): number {
  const x = [...a].map((char) => char.codePointAt(0) ?? 0);
  const y = [...b].map((char) => char.codePointAt(0) ?? 0);
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return x.length - y.length;
}

function fileAt(plan: GeneratedPlan, path: string) {
  const file = plan.files.find((planned) => planned.path === path);
  if (file === undefined) throw new Error(`the plan has no file ${path}`);
  return file;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('F-04 AC-005 the default pipeline plans its files', () => {
  it('plans pipeline.md, one command for each of the six flows and one agent for each Agent block', () => {
    const parsed = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipeline });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const config = parsed.config;
    expect(analyzeStructure(config)).toEqual([]);

    const plan = planOf(config, TEMPLATES);
    const paths = pathsOf(plan);
    const flows = config.pipeline.flows;
    const agents = flows.flatMap((flow) => flow.blocks.flatMap((block) => (block.kind === 'agent' ? [block] : [])));

    expect(flows).toHaveLength(6);
    expect(paths).toContain('.claude/commands/pipeline.md');
    for (const flow of flows) expect(paths).toContain(`.claude/commands/${flow.id}.md`);
    for (const agent of agents) expect(paths).toContain(`.claude/agents/${agent.name}.md`);
    expect(paths).toHaveLength(1 + flows.length + agents.length + TEMPLATES.base.length);
  });
});

describe('F-04 AC-007 the order of rules and flows after the first gives the same paths', () => {
  it('gives the same paths when the rules are reversed and the flows after the first are reordered', () => {
    const build = flowOf('build');
    const test = flowOf('test');
    const lint = flowOf('lint');
    const original = planOf(configWith([build, test, lint], RULES), TEMPLATES);
    const reordered = planOf(configWith([build, lint, test], [...RULES].reverse()), TEMPLATES);

    expect(pathsOf(reordered)).toEqual(pathsOf(original));
  });

  it('lists the planned files sorted by path in code-point order', () => {
    const plan = planOf(configWith([flowOf('build'), flowOf('test')], RULES), TEMPLATES);
    const paths = pathsOf(plan);

    expect(paths).toEqual([...paths].sort(byCodePoint));
    expect(paths[0]).toBe('.claude/agents/build-agent.md');
  });
});

describe('F-04 AC-008 planning the same config twice gives equal plans', () => {
  it('gives equal plans for the same config and templates', () => {
    const config = configWith([flowOf('build'), flowOf('test')], RULES);
    expect(planOf(config, TEMPLATES)).toEqual(planOf(config, TEMPLATES));
  });
});

describe('F-04 AC-009 the plan holds no date, time, UUID or random value', () => {
  it('draws no random value and reads no clock while planning', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random was called');
    });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Date.now was called');
    });
    planOf(configWith([flowOf('build')], RULES), TEMPLATES);
    expect(random).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });

  it('holds no date, time or UUID in any path, layout, description or tag', () => {
    const plan = planOf(configWith([flowOf('build'), flowOf('test')], RULES), TEMPLATES);
    const patterns = [
      /\b\d{4}-\d{2}-\d{2}\b/,
      /\b\d{2}:\d{2}(:\d{2})?\b/,
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    ];
    for (const file of plan.files) {
      const text = [file.path, file.layout, file.description, JSON.stringify(file.ruleTags)].join('\n');
      for (const pattern of patterns) expect(text).not.toMatch(pattern);
    }
  });
});

describe('F-04 AC-010 planning does not change the config or the templates', () => {
  it('leaves the config and the templates equal to their values before the call', () => {
    const config = configWith([flowOf('build'), flowOf('test')], RULES);
    const templates: GenerationTemplates = { ...TEMPLATES, base: [...TEMPLATES.base] };
    const configBefore = structuredClone(config);
    const templatesBefore = structuredClone(templates);

    planOf(config, templates);

    expect(config).toEqual(configBefore);
    expect(templates).toEqual(templatesBefore);
  });
});

describe('F-04 AC-011 each planned file has its rendered layout, description and rule tags', () => {
  it('carries the description and rule tags of its flow or Agent block, and empty ones otherwise', () => {
    const build: Flow = {
      ...flowOf('build'),
      description: 'Builds the project.',
      ruleTags: [{ ruleId: 'alpha', index: 0 }],
    };
    const agentBuild = build.blocks.map((block) =>
      block.kind === 'agent'
        ? { ...block, description: 'Builds the code.', ruleTags: [{ ruleId: 'beta', index: 1 }] }
        : block,
    );
    const plan = planOf(configWith([{ ...build, blocks: agentBuild }, flowOf('test')], RULES), TEMPLATES);

    const command = fileAt(plan, '.claude/commands/build.md');
    expect(command.description).toBe('Builds the project.');
    expect(command.ruleTags).toEqual([{ ruleId: 'alpha', index: 0 }]);
    expect(command.layout).toContain('Flow build:');

    const agent = fileAt(plan, '.claude/agents/build-agent.md');
    expect(agent.description).toBe('Builds the code.');
    expect(agent.ruleTags).toEqual([{ ruleId: 'beta', index: 1 }]);

    const noDescription = fileAt(plan, '.claude/commands/test.md');
    expect(noDescription.description).toBe('');
    expect(noDescription.ruleTags).toEqual([]);

    for (const path of ['.claude/commands/pipeline.md', 'CLAUDE.md', '.claude/rules/alpha.md']) {
      const file = fileAt(plan, path);
      expect(file.description).toBe('');
      expect(file.ruleTags).toEqual([]);
    }
  });

  it('gives every layout with its placeholders rendered', () => {
    const plan = planOf(configWith([flowOf('build'), flowOf('test')], RULES), TEMPLATES);
    for (const file of plan.files) expect(file.layout).not.toMatch(/\{\{/);
    expect(fileAt(plan, '.claude/rules/beta.md').layout).toBe('Rule beta\n\nSecond rule.');
  });
});

describe('F-04 AC-013 a placeholder with no value makes planning throw', () => {
  it('throws for a base layout that uses a placeholder, naming the placeholder and the file', () => {
    // Base layouts take only the base values (AC-037): a placeholder that those do not name is a template error.
    const templates: GenerationTemplates = {
      ...TEMPLATES,
      base: [{ path: 'CLAUDE.md', layout: 'Project {{projectName}}.' }],
    };
    const config = configWith([flowOf('build')], RULES);

    expect(() => planOf(config, templates)).toThrow(GenerationError);
    expect(() => planOf(config, templates)).toThrow(
      /the layout of CLAUDE\.md uses the placeholder \{\{projectName\}\}, which has no value/,
    );
  });
});

describe('F-04 AC-038 planning renders each base layout with the base values', () => {
  it('renders the process, command, agent and rule lists into a base layout', () => {
    const templates: GenerationTemplates = {
      ...TEMPLATES,
      base: [
        {
          path: 'CLAUDE.md',
          layout: 'Process:{{processFlows}}\nCommands:{{commandList}}\nAgents:{{agentList}}\nRules:{{ruleList}}',
        },
      ],
    };
    const config = configWith([flowOf('build')], RULES);
    const plan = planOf(config, templates);

    expect(fileAt(plan, 'CLAUDE.md').layout).toBe(
      'Process:\n- Build (`build`): The process does not stop at the end of this flow.' +
        '\nCommands:\n- `.claude/commands/pipeline.md`\n- `.claude/commands/build.md`' +
        '\nAgents:\n- `.claude/agents/build-agent.md`: Builds the project.' +
        '\nRules:\n- `.claude/rules/alpha.md`: Alpha\n- `.claude/rules/beta.md`: Beta',
    );
  });

  it('throws for a base layout that uses a placeholder the base values do not supply', () => {
    const templates: GenerationTemplates = {
      ...TEMPLATES,
      base: [{ path: 'CLAUDE.md', layout: 'Other:{{unsuppliedList}}' }],
    };
    expect(() => planOf(configWith([flowOf('build')], RULES), templates)).toThrow(
      /the layout of CLAUDE\.md uses the placeholder \{\{unsuppliedList\}\}, which has no value/,
    );
  });
});

describe('F-04 AC-036 the same fixture templates give the same plan in two runs', () => {
  it('returns the expected plan twice from the same data', () => {
    const config = configWith([flowOf('build')], []);
    const expected: GeneratedPlan = {
      files: [
        {
          path: '.claude/agents/build-agent.md',
          layout: 'Agent build-agent',
          description: 'Builds the project.',
          ruleTags: [],
        },
        {
          path: '.claude/commands/build.md',
          layout:
            'Flow build:\n1. Start the flow.\n2. Run the agent `.claude/agents/build-agent.md`: Builds the project.\n3. End the flow, producing the artifact `out.md`.',
          description: '',
          ruleTags: [],
        },
        {
          path: '.claude/commands/pipeline.md',
          layout: 'Pipeline Build pipeline:\n1. Flow `build`.',
          description: '',
          ruleTags: [],
        },
        { path: 'CLAUDE.md', layout: 'Project instructions.', description: '', ruleTags: [] },
      ],
    };

    expect(planOf(config, TEMPLATES)).toEqual(expected);
    expect(planOf(config, TEMPLATES)).toEqual(expected);
  });
});
