import { describe, expect, it } from 'vitest';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';
import { agentValues } from '../../src/pipeline/generate/values-agent.js';
import { baseValues } from '../../src/pipeline/generate/values-base.js';
import { flowValues } from '../../src/pipeline/generate/values-flow.js';
import { pipelineValues } from '../../src/pipeline/generate/values-pipeline.js';
import { ruleValues } from '../../src/pipeline/generate/values-rule.js';
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { defaultPipelineConfig, listLayouts, readLayout } from './layouts-loader.js';

// The layouts of the kinds that have their own values. A base layout gets the base values only, as every layout does.
type LayoutKind = 'base' | 'pipeline' | 'flow' | 'agent' | 'rule';

// A rule that the default pipeline does not have, so that the rule layout's values are checked too.
const SAMPLE_RULE: Rule = { index: 0, id: '9ba2c4e8-8f53-5a8f-b5e8-dfd8b0f0fc38', title: 'Sample rule', text: 'The sample rule text.' };

// Every placeholder a layout uses is `{{name}}`. A `{{` that does not close is kept in the match with no name, as the
// renderer does, so it is reported too.
const PLACEHOLDER = /\{\{([\s\S]*?)\}\}|\{\{/g;

// The kind of a layout under `source/templates/`. A Claude Code layout with no value set is an error, so that a new
// one cannot pass the check without its values being named here.
function kindOf(path: string): LayoutKind {
  switch (path) {
    case 'claude-code/pipeline.md':
      return 'pipeline';
    case 'claude-code/flow.md':
      return 'flow';
    case 'claude-code/agent.md':
      return 'agent';
    case 'claude-code/rule.md':
      return 'rule';
    default:
      if (path.startsWith('claude-code/')) throw new Error(`${path} has no value set in this test`);
      return 'base';
  }
}

// The names of the values each kind of layout is given, taken from the value builders with the default config. The
// names of a builder do not depend on its input, so one flow, one Agent block and one sample rule are enough.
function valueNames(config: ProjectConfig): Record<LayoutKind, ReadonlySet<string>> {
  const flow = config.pipeline.flows[0];
  const agent = config.pipeline.flows
    .flatMap((candidate) => candidate.blocks)
    .find((block) => block.kind === 'agent');
  if (flow === undefined || agent?.kind !== 'agent') throw new Error('the default pipeline needs a flow and an Agent block');
  return {
    base: new Set(Object.keys(baseValues(config))),
    pipeline: new Set(Object.keys(pipelineValues(config.pipeline))),
    flow: new Set(Object.keys(flowValues(flow))),
    agent: new Set(Object.keys(agentValues(agent))),
    rule: new Set(Object.keys(ruleValues(SAMPLE_RULE))),
  };
}

describe('F-05 layouts: placeholders are filled', () => {
  it('F-05 AC-038 every placeholder a layout under source/templates uses has a value in the base values or in the values of its kind', () => {
    const names = valueNames(defaultPipelineConfig());
    const problems: string[] = [];
    let used = 0;

    const layouts = listLayouts();
    expect(layouts.length).toBeGreaterThan(0);

    for (const path of layouts) {
      const kind = kindOf(path);
      const text = readLayout(path);
      for (const match of text.matchAll(PLACEHOLDER)) {
        const name = match[1];
        if (name === undefined) {
          problems.push(`${path} has an opening {{ with no closing }}`);
          continue;
        }
        used += 1;
        if (!names.base.has(name) && !names[kind].has(name)) {
          problems.push(`${path} uses the placeholder {{${name}}}, which has no value`);
        }
      }
    }

    expect(used).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  it('F-05 AC-038 a layout with a placeholder that has no value fails, and the error names the placeholder and the file path', () => {
    const layout = 'Title: {{title}}\n\nBody: {{missingValue}}\n';
    const values = { title: 'Example' };

    expect(() => renderLayout(layout, values, '.claude/commands/example.md')).toThrow(GenerationError);
    expect(() => renderLayout(layout, values, '.claude/commands/example.md')).toThrow(
      'the layout of .claude/commands/example.md uses the placeholder {{missingValue}}, which has no value',
    );
  });

  it('F-05 AC-038 a real flow layout with one value left out fails and names that placeholder and its path', () => {
    const config = defaultPipelineConfig();
    const flow = config.pipeline.flows[0];
    if (flow === undefined) throw new Error('the default pipeline has no flow');
    const withoutName = Object.fromEntries(Object.entries(flowValues(flow)).filter(([name]) => name !== 'flowName'));

    expect(() => renderLayout(readLayout('claude-code/flow.md'), withoutName, '.claude/commands/specify.md')).toThrow(
      'the layout of .claude/commands/specify.md uses the placeholder {{flowName}}, which has no value',
    );
  });
});
