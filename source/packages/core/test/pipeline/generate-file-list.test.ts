import { describe, expect, it } from 'vitest';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { isSafePath } from '../../src/pipeline/generate/paths.js';
import { listFiles } from '../../src/pipeline/generate/file-list.js';
import { ruleFileName } from '../../src/pipeline/generate/rule-file.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import type { Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';

const TEMPLATES: GenerationTemplates = {
  base: [
    { path: 'CLAUDE.md', layout: 'project instructions' },
    { path: 'spec/documents/process.md', layout: 'process' },
  ],
  pipeline: 'pipeline layout',
  flow: 'flow layout',
  agent: 'agent layout',
  rule: 'rule layout',
};

const BASE_PATHS = ['CLAUDE.md', 'spec/documents/process.md'];

function pathsOf(config: ProjectConfig): string[] {
  return listFiles(config, TEMPLATES).map((file) => file.path);
}

// A flow with the given id and name: its command file takes the name (F-16 AC-013), not the id.
function flowNamed(id: string, index: number, agentName: string | null, name: string): Flow {
  const agent =
    agentName === null
      ? []
      : [
          {
            index: 1,
            id: `${id}-agent`,
            kind: 'agent' as const,
            name: agentName,
            description: `Agent of ${id}.`,
            arguments: [],
            next: `${id}-end`,
          },
        ];
  return {
    index,
    id,
    name,
    arguments: [],
    body: `Flow ${id}.`,
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    blocks: [
      { index: 0, id: `${id}-start`, kind: 'start', next: agentName === null ? `${id}-end` : `${id}-agent` },
      ...agent,
      { index: 2, id: `${id}-end`, kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ],
  };
}

function configWith(flows: readonly Flow[], rules: ProjectConfig['rules']): ProjectConfig {
  const base = validConfig();
  return { ...base, rules, pipeline: { ...base.pipeline, flows } };
}

describe('F-04 listFiles', () => {
  it('F-04 AC-001 plans the base files, pipeline.md, the flow command, the agent file and the rule file', () => {
    const config = { ...validConfig(), rules: [{ index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Keep it plain.' }] };
    expect(pathsOf(config)).toEqual([
      '.claude/agents/build-agent.md',
      '.claude/commands/build.md',
      '.claude/commands/pipeline.md',
      '.claude/rules/style.md',
      'CLAUDE.md',
      'spec/documents/process.md',
    ]);
  });

  it('F-04 AC-002 plans one command file per flow named by its flow name, plus pipeline.md', () => {
    const config = configWith(
      [flowNamed('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 0, 'spec-agent', 'Specify'), flowNamed('fc358416-c66a-5fef-9c5e-a282b75cbd92', 1, 'plan-agent', 'Plan'), flowNamed('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 2, 'build-agent', 'Build')],
      [],
    );
    const commands = pathsOf(config).filter((path) => path.startsWith('.claude/commands/'));
    expect(commands).toEqual([
      '.claude/commands/build.md',
      '.claude/commands/pipeline.md',
      '.claude/commands/plan.md',
      '.claude/commands/specify.md',
    ]);
  });

  it('F-04 AC-002 gives a flow with no Agent block its command file', () => {
    const config = configWith([flowNamed('6235136f-9021-5aaf-9958-4bc813c4d9b1', 0, null, 'Check')], []);
    expect(pathsOf(config)).toContain('.claude/commands/check.md');
    expect(pathsOf(config).filter((path) => path.startsWith('.claude/agents/'))).toEqual([]);
  });

  it('F-04 AC-003 plans one agent file per Agent block, named by its name, from every flow', () => {
    const config = configWith(
      [flowNamed('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 0, 'spec-agent', 'Specify'), flowNamed('fc358416-c66a-5fef-9c5e-a282b75cbd92', 1, 'plan-agent', 'Plan')],
      [],
    );
    expect(pathsOf(config).filter((path) => path.startsWith('.claude/agents/'))).toEqual([
      '.claude/agents/plan-agent.md',
      '.claude/agents/spec-agent.md',
    ]);
  });

  it('F-04 AC-004 plans one rule file per rule, named by its title (F-16 AC-029)', () => {
    const config = configWith(validConfig().pipeline.flows, [
      { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Plain.' },
      { index: 1, id: 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', title: 'Tests', text: 'Table-driven.' },
    ]);
    expect(pathsOf(config).filter((path) => path.startsWith('.claude/rules/'))).toEqual([
      '.claude/rules/style.md',
      '.claude/rules/tests.md',
    ]);
  });

  it('F-04 AC-004 plans no rule file when the rules list is empty', () => {
    expect(pathsOf(validConfig()).filter((path) => path.startsWith('.claude/rules/'))).toEqual([]);
  });

  it('F-04 AC-006 plans only file-safe paths', () => {
    const config = configWith([flowNamed('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 0, 'spec-agent', 'Specify')], [
      { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Plain.' },
    ]);
    for (const path of pathsOf(config)) {
      expect(isSafePath(path), path).toBe(true);
    }
  });

  it.each([
    ['an empty path', '', false],
    ['a leading slash', '/CLAUDE.md', false],
    ['a dot-dot segment', 'spec/../CLAUDE.md', false],
    ['a backslash', 'spec\\process.md', false],
    ['an empty segment', 'spec//process.md', false],
    ['a trailing slash', 'spec/', false],
    ['a plain relative path', 'spec/documents/process.md', true],
    ['a dotted file name', '.claude/commands/build.md', true],
  ])('F-04 AC-006 isSafePath classifies %s', (_label, path, expected) => {
    expect(isSafePath(path)).toBe(expected);
  });

  it('F-04 AC-007 sorts the planned files by path in code-point order', () => {
    const config = configWith(
      [flowNamed('6c7fc739-8d69-5c14-8941-0f59299f8853', 0, 'Zed', 'Zed'), flowNamed('e93a0c3f-4b53-5b4b-b2a8-02bc3303e29a', 1, 'alpha-agent', 'Alpha')],
      [{ index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Zeta', text: 'z' }, { index: 1, id: 'fdac7165-b540-5201-bca7-029a056ea40e', title: 'alpha', text: 'a' }],
    );
    const paths = pathsOf(config);
    expect(paths).toEqual([...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    expect(paths.indexOf('.claude/rules/alpha.md')).toBeLessThan(paths.indexOf('.claude/rules/zeta.md'));
  });

  it('F-04 AC-007 orders a character beyond the BMP after a BMP letter, as code-point order does', () => {
    const config = configWith([], [
      { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: '\u{10400}', text: 'a' },
      { index: 1, id: 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', title: '\u{FF21}', text: 'b' },
    ]);
    const rulePaths = pathsOf(config).filter((path) => path.startsWith('.claude/rules/'));
    expect(rulePaths).toEqual(['.claude/rules/\u{FF41}.md', '.claude/rules/\u{10428}.md']);
  });

  it('F-04 AC-007 gives the same paths when the rules and the flows after the first are reordered', () => {
    const rules = [
      { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Plain.' },
      { index: 1, id: 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', title: 'Tests', text: 'Table-driven.' },
    ];
    const specify = flowNamed('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 0, 'spec-agent', 'Specify');
    const plan = flowNamed('fc358416-c66a-5fef-9c5e-a282b75cbd92', 1, 'plan-agent', 'Plan');
    const build = flowNamed('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 2, 'build-agent', 'Build');
    const original = pathsOf(configWith([specify, plan, build], rules));
    const reordered = pathsOf(configWith([specify, build, plan], [...rules].reverse()));
    expect(reordered).toEqual(original);
  });

  it('F-04 AC-024 throws a GenerationError naming the path when two planned files share one path', () => {
    const config = configWith([flowNamed('8af9843a-ffd1-5225-bd03-352062d8b7e6', 0, 'spec-agent', 'Pipeline')], []);
    expect(() => listFiles(config, TEMPLATES)).toThrow(GenerationError);
    expect(() => listFiles(config, TEMPLATES)).toThrow('.claude/commands/pipeline.md');
  });

  it('F-04 AC-024 throws a GenerationError when two Agent blocks share one name', () => {
    const config = configWith(
      [flowNamed('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 0, 'shared-agent', 'Specify'), flowNamed('fc358416-c66a-5fef-9c5e-a282b75cbd92', 1, 'shared-agent', 'Plan')],
      [],
    );
    expect(() => listFiles(config, TEMPLATES)).toThrow('.claude/agents/shared-agent.md');
  });

  it('F-04 AC-024 throws a GenerationError when a base path is the same as a planned command file', () => {
    const clash: GenerationTemplates = {
      ...TEMPLATES,
      base: [{ path: '.claude/commands/pipeline.md', layout: 'x' }],
    };
    expect(() => listFiles(validConfig(), clash)).toThrow(GenerationError);
    expect(() => listFiles(validConfig(), clash)).toThrow('.claude/commands/pipeline.md');
  });

  it('F-04 AC-006 throws a GenerationError naming a base path that is not file-safe', () => {
    const unsafe: GenerationTemplates = { ...TEMPLATES, base: [{ path: '../CLAUDE.md', layout: 'x' }] };
    expect(() => listFiles(validConfig(), unsafe)).toThrow(GenerationError);
    expect(() => listFiles(validConfig(), unsafe)).toThrow('../CLAUDE.md');
  });

  it('F-04 AC-001 plans every base path of the templates', () => {
    const paths = pathsOf(validConfig());
    expect(BASE_PATHS.every((path) => paths.includes(path))).toBe(true);
  });
});

describe('F-16 AC-029 a rule file takes its name from the rule title, with the rule of a flow name', () => {
  const RULE_ID = '8f99cc27-78ab-5895-8637-5c13d7429593';

  it.each([
    ['Style', 'style'],
    ['Review code', 'review-code'],
    ['Café', 'café'],
    ['Tests 2', 'tests-2'],
    ['  Spaced  title ', 'spaced-title'],
  ])('F-16 AC-029 names the rule file of the title %j as %j', (title, expected) => {
    const rule: Rule = { index: 0, id: RULE_ID, title, text: 'The text.' };
    expect(ruleFileName(rule)).toBe(expected);
  });

  it('F-16 AC-029 plans the rule file under the title name, and no path holds the rule id', () => {
    const config = configWith([flowNamed('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 0, 'spec-agent', 'Specify')], [
      { index: 0, id: RULE_ID, title: 'Review code', text: 'Check the code.' },
    ]);
    const paths = pathsOf(config);
    expect(paths).toContain('.claude/rules/review-code.md');
    expect(paths.some((path) => path.includes(RULE_ID))).toBe(false);
  });
});
