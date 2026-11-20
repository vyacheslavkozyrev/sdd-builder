import { describe, expect, it } from 'vitest';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { isSafePath } from '../../src/pipeline/generate/paths.js';
import { listFiles } from '../../src/pipeline/generate/file-list.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
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

function flowNamed(id: string, index: number, agentName: string | null): Flow {
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
    name: id,
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
    const config = { ...validConfig(), rules: [{ index: 0, id: 'style', title: 'Style', text: 'Keep it plain.' }] };
    expect(pathsOf(config)).toEqual([
      '.claude/agents/build-agent.md',
      '.claude/commands/build.md',
      '.claude/commands/pipeline.md',
      '.claude/rules/style.md',
      'CLAUDE.md',
      'spec/documents/process.md',
    ]);
  });

  it('F-04 AC-002 plans one command file per flow named by its id, plus pipeline.md', () => {
    const config = configWith(
      [flowNamed('specify', 0, 'spec-agent'), flowNamed('plan', 1, 'plan-agent'), flowNamed('build', 2, 'build-agent')],
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
    const config = configWith([flowNamed('check', 0, null)], []);
    expect(pathsOf(config)).toContain('.claude/commands/check.md');
    expect(pathsOf(config).filter((path) => path.startsWith('.claude/agents/'))).toEqual([]);
  });

  it('F-04 AC-003 plans one agent file per Agent block, named by its name, from every flow', () => {
    const config = configWith(
      [flowNamed('specify', 0, 'spec-agent'), flowNamed('plan', 1, 'plan-agent')],
      [],
    );
    expect(pathsOf(config).filter((path) => path.startsWith('.claude/agents/'))).toEqual([
      '.claude/agents/plan-agent.md',
      '.claude/agents/spec-agent.md',
    ]);
  });

  it('F-04 AC-004 plans one rule file per rule, named by its id', () => {
    const config = configWith(validConfig().pipeline.flows, [
      { index: 0, id: 'style', title: 'Style', text: 'Plain.' },
      { index: 1, id: 'tests', title: 'Tests', text: 'Table-driven.' },
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
    const config = configWith([flowNamed('specify', 0, 'spec-agent')], [
      { index: 0, id: 'style', title: 'Style', text: 'Plain.' },
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
      [flowNamed('zeta', 0, 'Zed'), flowNamed('alpha', 1, 'alpha-agent')],
      [{ index: 0, id: 'B', title: 'B', text: 'b' }, { index: 1, id: 'a', title: 'a', text: 'a' }],
    );
    const paths = pathsOf(config);
    expect(paths).toEqual([...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    expect(paths.indexOf('.claude/rules/B.md')).toBeLessThan(paths.indexOf('.claude/rules/a.md'));
  });

  it('F-04 AC-007 orders a character beyond the BMP after U+FFFD, as code-point order does', () => {
    const config = configWith([], [
      { index: 0, id: '\u{10000}', title: 'Astral', text: 'a' },
      { index: 1, id: '\u{FFFD}', title: 'Replacement', text: 'b' },
    ]);
    const rulePaths = pathsOf(config).filter((path) => path.startsWith('.claude/rules/'));
    expect(rulePaths).toEqual(['.claude/rules/\u{FFFD}.md', '.claude/rules/\u{10000}.md']);
  });

  it('F-04 AC-007 gives the same paths when the rules and the flows after the first are reordered', () => {
    const rules = [
      { index: 0, id: 'style', title: 'Style', text: 'Plain.' },
      { index: 1, id: 'tests', title: 'Tests', text: 'Table-driven.' },
    ];
    const specify = flowNamed('specify', 0, 'spec-agent');
    const plan = flowNamed('plan', 1, 'plan-agent');
    const build = flowNamed('build', 2, 'build-agent');
    const original = pathsOf(configWith([specify, plan, build], rules));
    const reordered = pathsOf(configWith([specify, build, plan], [...rules].reverse()));
    expect(reordered).toEqual(original);
  });

  it('F-04 AC-024 throws a GenerationError naming the path when two planned files share one path', () => {
    const config = configWith([flowNamed('pipeline', 0, 'spec-agent')], []);
    expect(() => listFiles(config, TEMPLATES)).toThrow(GenerationError);
    expect(() => listFiles(config, TEMPLATES)).toThrow('.claude/commands/pipeline.md');
  });

  it('F-04 AC-024 throws a GenerationError when two Agent blocks share one name', () => {
    const config = configWith(
      [flowNamed('specify', 0, 'shared-agent'), flowNamed('plan', 1, 'shared-agent')],
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
