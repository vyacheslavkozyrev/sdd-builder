import { describe, expect, it } from 'vitest';
import type { GenerationPlan, ProjectConfig } from '@sddbuilder/core';
import { buildGenerationPrompt } from '../src/generate/prompt.js';

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';

function sampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: IDEA,
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: [],
    connections: [],
    targets: ['claude'],
  };
}

/** A small fixed plan: three files, in an order that is not alphabetical. */
function samplePlan(): GenerationPlan {
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
      path: '.claude/rules/qa.md',
      layout: '# QA\n\nEvery task adds its tests.',
      description: 'Test rules.',
      ruleTags: ['qa'],
    },
  ];
}

describe('F-07 AC-008 generation prompt', () => {
  it('F-07 AC-008 gives the same text on two calls for the same input', () => {
    const config = sampleConfig();
    const plan = samplePlan();

    expect(buildGenerationPrompt(config, plan)).toBe(buildGenerationPrompt(config, plan));
    expect(buildGenerationPrompt(config, plan, ['a finding'])).toBe(
      buildGenerationPrompt(config, plan, ['a finding']),
    );
  });

  it('F-07 AC-008 lists the planned paths in plan order', () => {
    const prompt = buildGenerationPrompt(sampleConfig(), samplePlan());
    const positions = samplePlan().map((entry) => prompt.indexOf(entry.path));

    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('F-07 AC-008 contains the fixed instructions and the reply format', () => {
    const prompt = buildGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).toContain('You are writing the files of a Claude Code project framework');
    expect(prompt).toContain('Reply with ONLY one JSON object that maps each planned path to its text');
    expect(prompt).toContain('Leave no placeholders');
    expect(prompt).toContain(IDEA);
  });

  it('F-07 AC-010 retry prompt contains each finding of the previous reply', () => {
    const findings = [
      'File CLAUDE.md is empty.',
      'Reply has a key that is not a planned path: notes.md.',
    ];

    const prompt = buildGenerationPrompt(sampleConfig(), samplePlan(), findings);

    expect(prompt).toContain('Findings of the previous reply');
    for (const finding of findings) {
      expect(prompt).toContain(`- ${finding}`);
    }
  });

  it('F-07 AC-010 keeps a multi-line finding on one list line', () => {
    const prompt = buildGenerationPrompt(sampleConfig(), samplePlan(), ['first line\n- injected line']);

    expect(prompt).toContain('- first line - injected line');
    expect(prompt).not.toContain('\n- injected line');
  });

  it('F-07 AC-010 has no findings section when none are given', () => {
    const plan = samplePlan();

    expect(buildGenerationPrompt(sampleConfig(), plan)).not.toContain('Findings of the previous reply');
    expect(buildGenerationPrompt(sampleConfig(), plan, [])).not.toContain('Findings of the previous reply');
  });

  it('F-07 AC-008 gives each planned file its description, rule tags and layout', () => {
    const prompt = buildGenerationPrompt(sampleConfig(), samplePlan());

    expect(prompt).toContain('File 1 of 3: .claude/commands/implement.md\nDescription: Implements one task from the plan.\nRule tags: typescript, general\nLayout:\n# Implement\n\nWrite the code for one task.');
    expect(prompt).toContain('File 2 of 3: CLAUDE.md\nDescription: (none)\nRule tags: (none)\nLayout:\n# Project');
    expect(prompt).toContain('File 3 of 3: .claude/rules/qa.md\nDescription: Test rules.\nRule tags: qa\nLayout:\n# QA');
  });

  it('F-07 AC-008 writes the brief keys in a fixed order, whatever order the input object has', () => {
    const config = sampleConfig();
    const reversed = Object.fromEntries(Object.entries(config).reverse()) as unknown as ProjectConfig;
    const prompt = buildGenerationPrompt(config, samplePlan());
    const keys = ['"name"', '"idea"', '"stack"', '"architecture"', '"codeRules"', '"testRules"', '"workflows"', '"connections"', '"customSteps"', '"targets"'];
    const positions = keys.map((key) => prompt.indexOf(key));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(prompt).not.toContain('schemaVersion');
    expect(buildGenerationPrompt(reversed, samplePlan())).toBe(prompt);
  });

  it('F-07 AC-008 says so when no files are planned', () => {
    expect(buildGenerationPrompt(sampleConfig(), [])).toContain('No files are planned.');
  });
});
