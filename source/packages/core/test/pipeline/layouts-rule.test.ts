import { describe, expect, it } from 'vitest';
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import { listFiles } from '../../src/pipeline/generate/file-list.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const LAYOUT_PATH = 'claude-code/rule.md';

// The real layouts of the Claude Code files, with no base files: the rule layout is the one under test.
const TEMPLATES: GenerationTemplates = {
  base: [],
  pipeline: readLayout('claude-code/pipeline.md'),
  flow: readLayout('claude-code/flow.md'),
  agent: readLayout('claude-code/agent.md'),
  rule: readLayout(LAYOUT_PATH),
};

function ruleOf(index: number, id: string, title: string, text: string): Rule {
  return { index, id, title, text };
}

// The valid fixture with its rules replaced by the given ones.
function configWithRules(rules: readonly Rule[]): ProjectConfig {
  return { ...validConfig(), rules };
}

describe('F-05 layouts: the rule file layout', () => {
  it('F-05 AC-024 writes each rule to .claude/rules/<title name>.md, named from its title and not its id (F-16 AC-029), with its title as the heading and its text as the body', () => {
    const files = planGeneration(
      configWithRules([
        ruleOf(0, '8f99cc27-78ab-5895-8637-5c13d7429593', 'Style', 'Write short sentences.'),
        ruleOf(1, 'e345b9a9-48a4-5f13-a7a8-34a0f6722b08', 'Safety', 'Never print secrets.'),
      ]),
      TEMPLATES,
    );
    if (!files.ok) throw new Error('the fixture config must plan');
    const rules = files.files.filter((file) => file.path.startsWith('.claude/rules/'));
    expect(rules.map((file) => file.path)).toEqual(['.claude/rules/safety.md', '.claude/rules/style.md']);
    expect(rules.map((file) => file.layout)).toEqual([
      '# Safety\n\nNever print secrets.\n',
      '# Style\n\nWrite short sentences.\n',
    ]);
  });

  it('F-05 AC-024 keeps the line breaks of the text as given, with blank lines and list lines', () => {
    const text = 'First line.\nSecond line.\n\n- item one\n- item two';
    const files = planGeneration(configWithRules([ruleOf(0, '8f99cc27-78ab-5895-8637-5c13d7429593', 'Style', text)]), TEMPLATES);
    if (!files.ok) throw new Error('the fixture config must plan');
    const file = files.files.find((planned) => planned.path === '.claude/rules/style.md');
    expect(file?.layout).toBe(`# Style\n\n${text}\n`);
  });

  it('F-05 AC-024 writes the heading alone, with no blank line after it, when the rule has no text', () => {
    const files = planGeneration(configWithRules([ruleOf(0, '8f99cc27-78ab-5895-8637-5c13d7429593', 'Style', '')]), TEMPLATES);
    if (!files.ok) throw new Error('the fixture config must plan');
    const file = files.files.find((planned) => planned.path === '.claude/rules/style.md');
    expect(file?.layout).toBe('# Style\n');
  });

  it('F-05 AC-024 ends the file with one newline when the text ends with line breaks or spaces', () => {
    const files = planGeneration(
      configWithRules([ruleOf(0, '8f99cc27-78ab-5895-8637-5c13d7429593', 'Style', 'Write short sentences.\n\n  \n')]),
      TEMPLATES,
    );
    if (!files.ok) throw new Error('the fixture config must plan');
    const file = files.files.find((planned) => planned.path === '.claude/rules/style.md');
    expect(file?.layout).toBe('# Style\n\nWrite short sentences.\n');
  });

  it('F-05 AC-024 writes the heading alone when the text holds only blank lines', () => {
    const files = planGeneration(configWithRules([ruleOf(0, '8f99cc27-78ab-5895-8637-5c13d7429593', 'Style', '\n \n\t\n')]), TEMPLATES);
    if (!files.ok) throw new Error('the fixture config must plan');
    const file = files.files.find((planned) => planned.path === '.claude/rules/style.md');
    expect(file?.layout).toBe('# Style\n');
  });

  it('F-05 AC-025 plans no file under .claude/rules/ for a configuration with no rules, and does not fail', () => {
    const config = configWithRules([]);
    const files = planGeneration(config, TEMPLATES);
    expect(files.ok).toBe(true);
    if (!files.ok) throw new Error('a configuration with no rules must plan');
    expect(files.files.some((file) => file.path.startsWith('.claude/rules/'))).toBe(false);
    expect(listFiles(config, TEMPLATES).some((file) => file.path.startsWith('.claude/rules/'))).toBe(false);
  });
});
