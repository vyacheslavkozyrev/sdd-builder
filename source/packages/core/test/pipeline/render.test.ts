import { describe, expect, it } from 'vitest';
import { GenerationError } from '../../src/pipeline/generate/errors.js';
import { renderText } from '../../src/pipeline/generate/render.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';

// Fixture templates, given as data. The texts are small and invented; they only exercise the renderer.
const fixtureTemplates: Templates = {
  base: [
    {
      path: 'CLAUDE.md',
      text: '# {{projectName}}\n\n## Process\n\n{{processList}}\n',
      headings: ['## Process'],
    },
  ],
  pipelineCommand: {
    text: '# Pipeline\n\n## Steps\n\n{{argumentList}}\n\n{{pipelineStepList}}\n',
    headings: ['## Steps'],
  },
  command: {
    text: '# {{flowId}} — {{flowName}}\n\n## Purpose\n\n{{description}}\n\nTags: {{ruleTags}}\n',
    headings: ['## Purpose'],
  },
  agent: {
    text: '# {{name}}\n\n## Purpose\n\n{{description}}\n',
    headings: ['## Purpose'],
  },
  rule: {
    text: '# {{ruleTitle}}\n\n{{ruleText}}\n',
    headings: [],
  },
};

const values = {
  projectName: 'Demo',
  processList: '1. Brief',
  flowId: 'design',
  flowName: 'Design',
  description: 'Designs the thing.',
  ruleTags: 'none',
  name: 'reviewer',
  ruleTitle: 'Style',
  ruleText: 'Keep it short.',
  'stack.language': 'TypeScript',
};

describe('F-04 AC-012 renderText replaces each placeholder with its value', () => {
  it.each([
    ['# {{projectName}}', '# Demo'],
    ['{{flowId}} ({{flowName}})', 'design (Design)'],
    ['{{stack.language}} only', 'TypeScript only'],
    ['{{flowId}} and {{flowId}} again', 'design and design again'],
    ['no placeholder here', 'no placeholder here'],
    ['single { and } braces', 'single { and } braces'],
    ['', ''],
  ])('F-04 AC-012 renders %j as %j', (text, expected) => {
    expect(renderText('command.md', text, values)).toBe(expected);
  });

  it('F-04 AC-012 gives a flow its own id in its command file', () => {
    const rendered = renderText('.claude/commands/design.md', fixtureTemplates.command.text, values);
    expect(rendered).toBe('# design — Design\n\n## Purpose\n\nDesigns the thing.\n\nTags: none\n');
  });

  it('F-04 AC-012 renders every fixture layout with its own values', () => {
    expect(renderText('CLAUDE.md', fixtureTemplates.base[0]?.text ?? '', values)).toBe(
      '# Demo\n\n## Process\n\n1. Brief\n',
    );
    expect(renderText('.claude/agents/reviewer.md', fixtureTemplates.agent.text, values)).toBe(
      '# reviewer\n\n## Purpose\n\nDesigns the thing.\n',
    );
    expect(renderText('.claude/rules/style.md', fixtureTemplates.rule.text, values)).toBe(
      '# Style\n\nKeep it short.\n',
    );
  });

  it('F-04 AC-012 renders the same text twice to the same output', () => {
    const first = renderText('command.md', fixtureTemplates.command.text, values);
    const second = renderText('command.md', fixtureTemplates.command.text, values);
    expect(second).toBe(first);
  });
});

describe('F-04 AC-013 renderText throws when a placeholder has no value', () => {
  it.each([
    ['{{unknown}}', 'unknown'],
    ['{{flowId}} {{missing}}', 'missing'],
    ['{{stack.framework}}', 'stack.framework'],
    ['{{}}', ''],
    ['{{constructor}}', 'constructor'],
    ['{{__proto__}}', '__proto__'],
    ['{{ProjectName}}', 'ProjectName'],
  ])('F-04 AC-013 throws for the text %j, naming %j', (text, name) => {
    expect(() => renderText('.claude/commands/design.md', text, values)).toThrow(GenerationError);
    expect(() => renderText('.claude/commands/design.md', text, values)).toThrow(
      `No value for the placeholder {{${name}}} in .claude/commands/design.md.`,
    );
  });

  it('F-04 AC-013 names the file path in the error', () => {
    let caught: unknown;
    try {
      renderText('.claude/agents/reviewer.md', '{{name}} {{absent}}', values);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GenerationError);
    expect((caught as GenerationError).message).toContain('{{absent}}');
    expect((caught as GenerationError).message).toContain('.claude/agents/reviewer.md');
  });

  it('F-04 AC-013 throws for a text where one placeholder has a value and another has none', () => {
    expect(() => renderText('CLAUDE.md', 'a {{projectName}} b {{nope}}', values)).toThrow(GenerationError);
  });
});

describe('F-04 AC-014 renderText copies a value as written, in one pass', () => {
  it.each([
    ['{{ruleText}}', 'Use {{flowId}} here.', 'Use {{flowId}} here.'],
    ['{{ruleText}}', '{{unknown}} stays', '{{unknown}} stays'],
    ['{{ruleText}}', '{{{{nested}}}}', '{{{{nested}}}}'],
    ['{{a}}{{b}}', '{{b}}', '{{b}}B'],
    ['{{ruleText}}', '', ''],
    ['{{ruleText}}', '$& $1 $$ $` $\' $<name>', '$& $1 $$ $` $\' $<name>'],
  ])('F-04 AC-014 renders %j with value %j as %j', (text, ruleText, expected) => {
    const local = { ...values, ruleText, a: ruleText, b: 'B' };
    expect(renderText('.claude/rules/style.md', text, local)).toBe(expected);
  });

  it('F-04 AC-014 copies a rule text that holds placeholders of the same file unchanged', () => {
    const ruleText = 'Name the flow {{flowId}} and read {{stack.language}}.';
    const rendered = renderText('.claude/rules/style.md', fixtureTemplates.rule.text, {
      ...values,
      ruleText,
    });
    expect(rendered).toBe(`# Style\n\n${ruleText}\n`);
  });

  it('F-04 AC-014 copies a value that names a placeholder with no value, without failing', () => {
    expect(
      renderText('CLAUDE.md', '{{processList}}', { processList: 'uses {{projectName}}' }),
    ).toBe('uses {{projectName}}');
  });
});
