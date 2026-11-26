import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import { blockersOf } from '../../src/pipeline/generate/refuse.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

// A config with several blockers: the flow is named `Pipeline!`, whose command file would be pipeline.md (AC-022), and its
// End block is removed (F-03 AC-004), so the Agent's `next` names no block.
function blockedConfig(): ProjectConfig {
  return withFlow((flow) => ({
    ...flow,
    name: 'Pipeline!',
    blocks: flow.blocks.filter((block) => block.kind !== 'end'),
  }));
}

const TEMPLATES: GenerationTemplates = {
  base: [{ path: 'CLAUDE.md', layout: 'Project instructions.' }],
  pipeline: 'Pipeline {{pipelineName}}:{{pipelineFlows}}',
  flow: 'Flow {{flowId}}:{{flowSteps}}{{flowApproval}}',
  agent: 'Agent {{agentName}}{{agentBody}}',
  rule: 'Rule {{ruleId}}{{ruleText}}',
};

// A layout that cannot be rendered: its placeholder has no value. Rendering it throws, so a test that returns
// normally proves that no layout was rendered.
const UNRENDERABLE: GenerationTemplates = { ...TEMPLATES, flow: 'Flow {{noSuchValue}}' };

describe('F-04 AC-020 a config with a blocker plans no files and lists every blocker in order', () => {
  it('returns ok false with the blockers of the analysis, in the analysis order, and no files', () => {
    const config = blockedConfig();
    const result = planGeneration(config, TEMPLATES);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result).not.toHaveProperty('files');
    expect(result.problems).toEqual(blockersOf(analyzeStructure(config)));
    expect(result.problems.map(({ rule, path }) => ({ rule, path }))).toEqual([
      { rule: 'flow-end', path: 'pipeline.flows.0' },
      { rule: 'command-file-clash', path: 'pipeline.flows.0.name' },
      { rule: 'block-link', path: 'pipeline.flows.0.blocks.1.next' },
    ]);
    for (const problem of result.problems) expect(problem.severity).toBe('blocker');
  });

  it('renders no layout for a blocked config: the unrenderable layout does not throw', () => {
    expect(() => planGeneration(blockedConfig(), UNRENDERABLE)).not.toThrow();
  });

  it('control: the same unrenderable layout throws on a valid config', () => {
    expect(() => planGeneration(validConfig(), UNRENDERABLE)).toThrow(GenerationError);
  });

  it('plans a valid config with no blocker, as before', () => {
    const result = planGeneration(validConfig(), TEMPLATES);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.files.map((file) => file.path)).toContain('CLAUDE.md');
  });
});
