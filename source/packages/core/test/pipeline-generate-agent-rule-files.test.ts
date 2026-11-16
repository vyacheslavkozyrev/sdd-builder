import { describe, expect, it } from 'vitest';
import type { GeneratedFile } from '../src/model.js';
import { renderAgentAndRuleFiles } from '../src/pipeline/generate/agent-rule-files.js';
import type { AgentBlock, ProjectConfig, Rule } from '../src/pipeline/model.js';
import { configWith, flow, gate, NEXT, pipelineEnd, pipelineStart, STOP, validFlow } from './pipeline-routes-fixtures.js';

/** An Agent block whose name differs from its id, so the tests see the file name and not the id. */
function agentBlock(id: string, name: string, description: string, enabled = true): AgentBlock {
  return { kind: 'agent', id, enabled, name, scope: 'feature', description };
}

/** A rule with a title and text, for the rule files. */
function rule(id: string, title: string, text: string): Rule {
  return { id, title, text };
}

/** A config with the given pipeline blocks and rules. */
function configOf(blocks: ProjectConfig['pipeline']['blocks'], rules: Rule[] = []): ProjectConfig {
  return { ...configWith(blocks), rules };
}

/** The paths of the files, in the order returned. */
function pathsOf(files: readonly GeneratedFile[]): string[] {
  return files.map((file) => file.path);
}

/** The file with the given path, or undefined when none has it. */
function fileAt(files: readonly GeneratedFile[], path: string): GeneratedFile | undefined {
  return files.find((file) => file.path === path);
}

describe('F-02 AC-027 agent files', () => {
  const agentRows: Array<{ name: string; config: ProjectConfig; expected: string[] }> = [
    {
      name: 'one enabled agent in an enabled flow gives one file named by its name, not its id',
      config: configOf([pipelineStart(), validFlow('a', [agentBlock('a1', 'writer', 'Writes the stories.')]), pipelineEnd()]),
      expected: ['.claude/agents/writer.md'],
    },
    {
      name: 'a disabled agent gives no file',
      config: configOf([
        pipelineStart(),
        validFlow('a', [agentBlock('a1', 'writer', 'Writes the stories.', false)]),
        pipelineEnd(),
      ]),
      expected: [],
    },
    {
      name: 'an agent in a disabled flow gives no file',
      config: configOf([
        pipelineStart(),
        flow('a', [agentBlock('a1', 'writer', 'Writes the stories.')], false),
        pipelineEnd(),
      ]),
      expected: [],
    },
    {
      name: 'agents of two enabled flows give two files, sorted by path',
      config: configOf([
        pipelineStart(),
        validFlow('a', [agentBlock('a1', 'writer', 'Writes.')]),
        gate('g1', NEXT, STOP),
        validFlow('b', [agentBlock('b1', 'checker', 'Checks.')]),
        pipelineEnd(),
      ]),
      expected: ['.claude/agents/checker.md', '.claude/agents/writer.md'],
    },
    {
      name: 'blocks that are not agents give no agent file',
      config: configOf([pipelineStart(), validFlow('a', []), pipelineEnd()]),
      expected: [],
    },
  ];

  it.each(agentRows)('F-02 AC-027 $name', ({ config, expected }) => {
    const files = renderAgentAndRuleFiles(config);
    expect(pathsOf(files).filter((path) => path.startsWith('.claude/agents/'))).toEqual(expected);
  });

  it('F-02 AC-027 refuses to write an agent file whose name is not file-safe, so no path leaves .claude/', () => {
    const config = configOf([
      pipelineStart(),
      validFlow('a', [agentBlock('a1', '../escape', 'Writes.')]),
      pipelineEnd(),
    ]);
    expect(() => renderAgentAndRuleFiles(config)).toThrow(/cannot be a file name/);
  });

  it('F-02 AC-027 the stub text of an agent file is its description under its name heading, below its name and description', () => {
    const config = configOf([
      pipelineStart(),
      validFlow('a', [agentBlock('a1', 'writer', 'Writes the user stories from the brief.')]),
      pipelineEnd(),
    ]);
    expect(fileAt(renderAgentAndRuleFiles(config), '.claude/agents/writer.md')?.content).toBe(
      '---\nname: "writer"\ndescription: "Writes the user stories from the brief."\n---\n# writer\n\nWrites the user stories from the brief.\n',
    );
  });
});

describe('F-02 AC-028 rule files', () => {
  const ruleRows: Array<{ name: string; rules: Rule[]; expected: string[] }> = [
    {
      name: 'an empty rules list gives no rule file',
      rules: [],
      expected: [],
    },
    {
      name: 'one rule gives one file named by its id',
      rules: [rule('style', 'Code style', 'Use strict types.')],
      expected: ['.claude/rules/style.md'],
    },
    {
      name: 'each rule gives one file, sorted by path',
      rules: [rule('testing', 'Testing', 'Test every change.'), rule('style', 'Code style', 'Use strict types.')],
      expected: ['.claude/rules/style.md', '.claude/rules/testing.md'],
    },
  ];

  it.each(ruleRows)('F-02 AC-028 $name', ({ rules, expected }) => {
    const files = renderAgentAndRuleFiles(configOf([pipelineStart(), pipelineEnd()], rules));
    expect(pathsOf(files).filter((path) => path.startsWith('.claude/rules/'))).toEqual(expected);
  });

  it('F-02 AC-028 refuses to write a rule file whose id is not file-safe, so no path leaves .claude/', () => {
    const config = configOf([pipelineStart(), pipelineEnd()], [rule('../escape', 'Code style', 'Use strict types.')]);
    expect(() => renderAgentAndRuleFiles(config)).toThrow(/cannot be a file name/);
  });

  it('F-02 AC-028 a rule file holds its title as the heading, then its text', () => {
    const files = renderAgentAndRuleFiles(
      configOf([pipelineStart(), pipelineEnd()], [rule('style', 'Code style', 'Use strict types.')]),
    );
    expect(fileAt(files, '.claude/rules/style.md')?.content).toBe('# Code style\n\nUse strict types.\n');
  });

  it('F-02 AC-028 rules come from the config, not the flows: a disabled flow does not drop them', () => {
    const config = configOf(
      [pipelineStart(), flow('a', [agentBlock('a1', 'writer', 'Writes.')], false), pipelineEnd()],
      [rule('style', 'Code style', 'Use strict types.')],
    );
    expect(pathsOf(renderAgentAndRuleFiles(config))).toEqual(['.claude/rules/style.md']);
  });
});

describe('F-02 AC-027 AC-028 sorted and deterministic output', () => {
  const config = configOf(
    [
      pipelineStart(),
      validFlow('a', [agentBlock('a1', 'writer', 'Writes.'), agentBlock('a2', 'checker', 'Checks.')]),
      pipelineEnd(),
    ],
    [rule('testing', 'Testing', 'Test every change.'), rule('style', 'Code style', 'Use strict types.')],
  );

  it('F-02 AC-027 AC-028 the agent and rule files come out sorted by path', () => {
    const paths = pathsOf(renderAgentAndRuleFiles(config));
    expect(paths).toEqual([
      '.claude/agents/checker.md',
      '.claude/agents/writer.md',
      '.claude/rules/style.md',
      '.claude/rules/testing.md',
    ]);
  });

  it('F-02 AC-027 AC-028 two runs on the same config give the same paths and content', () => {
    expect(renderAgentAndRuleFiles(config)).toEqual(renderAgentAndRuleFiles(config));
  });
});
