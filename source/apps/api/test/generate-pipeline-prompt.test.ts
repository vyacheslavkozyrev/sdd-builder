import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { buildPipelineGenerationPrompt } from '../src/generate/pipeline-prompt.js';
import { pipelineConfig } from './pipeline-config.js';

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';
const RULE_TITLE = 'Rule title for the generation prompt';
const RULE_TEXT = 'Every public function has a unit test that names its criterion.';

function sampleConfig(): pipeline.ProjectConfig {
  return pipelineConfig({
    name: 'Sample Project',
    idea: IDEA,
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    rules: [{ id: 'quality', title: RULE_TITLE, text: RULE_TEXT }],
  });
}

/** A small fixed plan: three files, in an order that is not alphabetical. */
function samplePlan(): pipeline.PipelinePlanEntry[] {
  return [
    {
      path: '.claude/commands/implement.md',
      layout: '# Implement\n\nWrite the code for one task.',
      description: 'Implements one task from the plan.',
      ruleTags: ['typescript', 'general'],
    },
    {
      path: 'CLAUDE.md',
      layout: '# Project\n\nRead the rules before coding.',
      description: '',
      ruleTags: [],
    },
    {
      path: '.claude/rules/quality.md',
      layout: '# Quality\n\nEvery task adds its tests.',
      description: 'Test rules.',
      ruleTags: ['qa'],
    },
  ];
}

describe('F-07 AC-008 pipeline generation prompt', () => {
  it('F-07 AC-008 gives the same text on two calls for the same input', () => {
    const config = sampleConfig();
    const plan = samplePlan();

    expect(buildPipelineGenerationPrompt(config, plan)).toBe(buildPipelineGenerationPrompt(config, plan));
  });

  it('F-07 AC-008 lists every planned path in plan order', () => {
    const plan = samplePlan();
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), plan);
    const positions = plan.map((entry) => prompt.indexOf(`: ${entry.path}\n`));

    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('F-07 AC-008 gives each planned file its description, rule tags and layout', () => {
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).toContain(
      'File 1 of 3: .claude/commands/implement.md\nDescription: Implements one task from the plan.\nRule tags: typescript, general\nLayout:\n# Implement\n\nWrite the code for one task.',
    );
    expect(prompt).toContain('File 2 of 3: CLAUDE.md\nDescription: (none)\nRule tags: (none)\nLayout:\n# Project');
    expect(prompt).toContain('File 3 of 3: .claude/rules/quality.md\nDescription: Test rules.\nRule tags: qa\nLayout:\n# Quality');
  });

  it('F-07 AC-008 says (none) for a description that is only white space', () => {
    const plan = samplePlan().map((entry) => (entry.path === 'CLAUDE.md' ? { ...entry, description: ' \n\t ' } : entry));

    expect(buildPipelineGenerationPrompt(sampleConfig(), plan)).toContain('File 2 of 3: CLAUDE.md\nDescription: (none)\n');
  });

  it('F-07 AC-008 asks for one JSON object that maps each planned path to its text', () => {
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).toContain('Reply with ONLY one JSON object that maps each planned path to its text');
    expect(prompt).toContain('Use exactly the planned paths as keys, and no other keys. Every value is a string.');
    expect(prompt).toContain('You are writing the files of a Claude Code project framework');
  });

  it('F-07 AC-008 carries the same content rules as the flat prompt', () => {
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).toContain('Write for this project only. Do not mention the tool that produced these files.');
    expect(prompt).toContain('Leave no placeholders, such as braces around a name, and no TODO markers.');
  });

  it('F-07 AC-008 does not name SDDBuilder or its own paths in the prompt text', () => {
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).not.toContain('SDDBuilder');
    expect(prompt).not.toContain('source/');
    expect(prompt).not.toContain('spec/');
  });

  it('F-07 AC-008 puts the brief in the prompt as JSON, without the flows or the schema version', () => {
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).toContain(IDEA);
    expect(prompt).toContain(RULE_TITLE);
    expect(prompt).toContain(RULE_TEXT);
    expect(prompt).not.toContain('schemaVersion');
    expect(prompt).not.toContain('"pipeline"');
  });

  it('F-07 AC-008 writes the brief keys in a fixed order, whatever order the input object has', () => {
    const config = sampleConfig();
    const reversed = Object.fromEntries(Object.entries(config).reverse()) as unknown as pipeline.ProjectConfig;
    const prompt = buildPipelineGenerationPrompt(config, samplePlan());
    const keys = ['"name"', '"idea"', '"stack"', '"rules"'];
    const positions = keys.map((key) => prompt.indexOf(key));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(buildPipelineGenerationPrompt(reversed, samplePlan())).toBe(prompt);
  });

  it('F-07 AC-008 says so when no files are planned', () => {
    expect(buildPipelineGenerationPrompt(sampleConfig(), [])).toContain('No files are planned.');
  });
});

describe('F-07 AC-010 pipeline retry prompt', () => {
  it('F-07 AC-010 contains each finding of the previous reply', () => {
    const findings = ['File CLAUDE.md is empty.', 'Reply has a key that is not a planned path: notes.md.'];

    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan(), findings);

    expect(prompt).toContain('Findings of the previous reply');
    for (const finding of findings) {
      expect(prompt).toContain(`- ${finding}`);
    }
  });

  it('F-07 AC-010 lists the findings in the order given', () => {
    const findings = ['second in the list', 'first in the list'];
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan(), findings);

    expect(prompt.indexOf('- second in the list')).toBeLessThan(prompt.indexOf('- first in the list'));
    expect(prompt.endsWith('- second in the list\n- first in the list')).toBe(true);
  });

  it('F-07 AC-010 keeps a multi-line finding on one list line', () => {
    const prompt = buildPipelineGenerationPrompt(sampleConfig(), samplePlan(), ['first line\n- injected line']);

    expect(prompt).toContain('- first line - injected line');
    expect(prompt).not.toContain('\n- injected line');
  });

  it('F-07 AC-010 has no findings section when none are given', () => {
    const plan = samplePlan();

    expect(buildPipelineGenerationPrompt(sampleConfig(), plan)).not.toContain('Findings of the previous reply');
    expect(buildPipelineGenerationPrompt(sampleConfig(), plan, [])).not.toContain('Findings of the previous reply');
  });
});
