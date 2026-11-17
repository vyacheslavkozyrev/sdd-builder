import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import { renderText } from '../../src/pipeline/generate/render.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { baseValues } from '../../src/pipeline/generate/values-agent.js';
import { pipelineSteps, stepList } from '../../src/pipeline/generate/values-command.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { loadTemplates } from './support/load-templates.js';

// The process text is read from the real base layout (source/templates/base/process.md) through the base manifest,
// and rendered with the values that baseValues builds for the default config.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

const templates: Templates = loadTemplates(templatesRoot);

const processPath = 'spec/documents/process.md';

// The default pipeline parsed as in layouts-claude-md.test.ts, so each test gets its own copy.
function defaultConfig(): ProjectConfig {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

// A plan of the config with the real templates; fails the test when the config is not planned.
function planOf(config: ProjectConfig): Extract<Plan, { readonly ok: true }> {
  const plan = planGeneration(config, templates);
  if (!plan.ok) {
    throw new Error(`expected the config to be planned, got ${plan.problems.map((p) => p.message).join('; ')}`);
  }
  return plan;
}

// The raw process layout, before rendering; fails the test when the base manifest has no such entry.
function rawProcess(): string {
  const file = templates.base.find((entry) => entry.path === processPath);
  if (file === undefined) {
    throw new Error('the base manifest has no spec/documents/process.md entry');
  }
  return file.text;
}

// The process text rendered from the real base layout with the values of the config.
function renderedProcess(config: ProjectConfig): string {
  return renderText(processPath, rawProcess(), baseValues(config));
}

// The fenced blocks of a text: the info string of each opening fence, and the lines inside it.
function fencesOf(text: string): { info: string; lines: string[] }[] {
  const fences: { info: string; lines: string[] }[] = [];
  let current: { info: string; lines: string[] } | undefined;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      if (current === undefined) {
        current = { info: line.slice(3).trim(), lines: [] };
      } else {
        fences.push(current);
        current = undefined;
      }
    } else if (current !== undefined) {
      current.lines.push(line);
    }
  }
  return fences;
}

describe('F-05 AC-021 process.md is the second base file, planned at spec/documents/process.md', () => {
  it('F-05 AC-021 maps the second base manifest entry to spec/documents/process.md', () => {
    expect(templates.base[1]?.path).toBe(processPath);
  });

  it('F-05 AC-021 plans spec/documents/process.md with the rendered base layout, after CLAUDE.md', () => {
    const config = defaultConfig();
    const planned = planOf(config).files;
    const file = planned.find((entry) => entry.path === processPath);
    expect(file?.text).toBe(renderedProcess(config));
    const paths = planned.map((entry) => entry.path);
    expect(paths.indexOf(processPath)).toBeGreaterThan(paths.indexOf('CLAUDE.md'));
  });

  it('F-05 AC-021 renders the default config with no placeholder left in the text', () => {
    expect(renderedProcess(defaultConfig())).not.toMatch(/\{\{/);
  });
});

describe('F-05 AC-025 process.md lists the flows and their steps in pipeline order', () => {
  it('F-05 AC-025 lists each flow once, in pipeline order', () => {
    const config = defaultConfig();
    const text = renderedProcess(config);
    const positions = config.pipeline.flows.map((flow) => text.indexOf(`- Run the flow \`${flow.id}\` (${flow.name})`));
    for (const position of positions) {
      expect(position).toBeGreaterThan(-1);
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('F-05 AC-025 lists each flow step under its flow, in block order, and its gate right after them', () => {
    const config = defaultConfig();
    const lines = renderedProcess(config).split('\n');
    for (const flow of config.pipeline.flows) {
      const [flowLine = '', ...gateLines] = pipelineSteps(flow);
      const start = lines.indexOf(`- ${flowLine}`);
      expect(start).toBeGreaterThan(-1);
      const steps = stepList(flow).split('\n');
      steps.forEach((step, index) => {
        expect(lines[start + 1 + index]).toBe(`  ${step}`);
      });
      gateLines.forEach((gate, index) => {
        expect(lines[start + 1 + steps.length + index]).toBe(`- ${gate}`);
      });
    }
  });
});

describe('F-05 AC-026 process.md holds exactly one fenced mermaid block whose first line is flowchart', () => {
  it('F-05 AC-026 holds exactly one fence, and it is marked mermaid', () => {
    const fences = fencesOf(renderedProcess(defaultConfig()));
    expect(fences.map((fence) => fence.info)).toEqual(['mermaid']);
  });

  it('F-05 AC-026 has flowchart as the first line of the mermaid block', () => {
    const [fence] = fencesOf(renderedProcess(defaultConfig()));
    expect(fence?.lines[0]).toMatch(/^flowchart\b/);
  });

  it('F-05 AC-026 keeps every ## heading out of the fenced block', () => {
    const [fence] = fencesOf(renderedProcess(defaultConfig()));
    expect(fence?.lines.some((line) => line.startsWith('## '))).toBe(false);
  });
});

describe('F-05 AC-032 process.md names no path of this repository, no SDDBuilder name and no F-XX id', () => {
  it('F-05 AC-032 keeps the raw layout and the rendered default text free of repository names', () => {
    for (const text of [rawProcess(), renderedProcess(defaultConfig())]) {
      expect(text).not.toMatch(/source\//);
      expect(text).not.toMatch(/apps\//);
      expect(text).not.toMatch(/packages\//);
      expect(text).not.toMatch(/SDDBuilder/);
      expect(text).not.toMatch(/F-\d{2}/);
    }
  });

  it('F-05 AC-026 has no ## heading inside a fence in the raw layout', () => {
    for (const fence of fencesOf(rawProcess())) {
      expect(fence.lines.some((line) => line.startsWith('## '))).toBe(false);
    }
  });
});
