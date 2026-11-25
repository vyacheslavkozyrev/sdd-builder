import { describe, expect, it } from 'vitest';
import { analyzeStructure, type Finding } from '../../src/pipeline/analyze/index.js';
import { commandFileRule } from '../../src/pipeline/analyze/command-file.js';
import { flowFileName } from '../../src/pipeline/generate/flow-file.js';
import { listFiles } from '../../src/pipeline/generate/file-list.js';
import { configProblems } from '../../src/pipeline/generate/refuse.js';
import type { GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { baseValues } from '../../src/pipeline/generate/values-base.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

const TEMPLATES: GenerationTemplates = {
  base: [{ path: 'CLAUDE.md', layout: 'project instructions' }],
  pipeline: 'pipeline layout',
  flow: 'flow layout',
  agent: 'agent layout',
  rule: 'rule layout',
};

function flowNamed(name: string, id: string): Flow {
  const flow = validConfig().pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return { ...flow, id, name };
}

// The valid config with two flows, each named by the argument; the second one's ids are renamed so no id clashes.
function twoFlows(firstName: string, secondName: string): ProjectConfig {
  const base = validConfig();
  const first: Flow = { ...flowNamed(firstName, 'flow-a'), index: 0 };
  const second: Flow = {
    ...flowNamed(secondName, 'flow-b'),
    index: 1,
    blocks: first.blocks.map((block) => ({
      ...block,
      id: `b-${block.id}`,
      ...(block.kind === 'start' || block.kind === 'agent' ? { next: `b-${block.next}` } : {}),
      ...(block.kind === 'agent' ? { name: `${secondName}-agent` } : {}),
    })) as Flow['blocks'],
  };
  return { ...base, pipeline: { ...base.pipeline, flows: [first, second] } };
}

function commandPaths(config: ProjectConfig): string[] {
  return listFiles(config, TEMPLATES)
    .map((file) => file.path)
    .filter((path) => path.startsWith('.claude/commands/') && path !== '.claude/commands/pipeline.md');
}

function blockersOf(findings: readonly Finding[], rule: string): Finding[] {
  return findings.filter((finding) => finding.rule === rule && finding.severity === 'blocker');
}

describe('F-16 AC-013 the command file takes the flow name', () => {
  it.each([
    ['Specify', 'specify'],
    ['Review code', 'review-code'],
    ['Build', 'build'],
    ['Step 2 review', 'step-2-review'],
    ['v1.2', 'v1-2'],
    ['a  --  b', 'a-b'],
    ['  Build  ', 'build'],
    ['!Build!', 'build'],
    ['a-b', 'a-b'],
    ['Café au lait', 'café-au-lait'],
    ['Ünïcode', 'ünïcode'],
    ['Café', 'café'],
    ['Build 日本', 'build-日本'],
    ['Stufe ½', 'stufe'],
    ['Stufe 2³', 'stufe-2'],
    ['日本', '日本'],
    ['---', ''],
    ['', ''],
    ['   ', ''],
  ])('F-16 AC-013 names the command file of the flow name %j as %j', (name, expected) => {
    expect(flowFileName(flowNamed(name, 'flow-1'))).toBe(expected);
  });

  it('F-16 AC-013 names the command file from the name, not from the flow id', () => {
    const config = withFlow((flow) => ({ ...flow, id: 'flow-1', name: 'Specify' }));
    expect(commandPaths(config)).toEqual(['.claude/commands/specify.md']);
  });

  it('F-16 AC-013 keeps the flow id in the content, while the file takes the name', () => {
    const config = withFlow((flow) => ({ ...flow, id: 'flow-1', name: 'Review code' }));
    expect(commandPaths(config)).toEqual(['.claude/commands/review-code.md']);
    expect(baseValues(config)['processFlows']).toContain('Review code (`flow-1`)');
    expect(configProblems(config)).toEqual([]);
  });
});

describe('F-16 AC-014 a flow name with no letter or digit is a blocker', () => {
  it.each([
    ['---', ''],
    ['?!', ''],
    ['½ ²', ''],
    ['́', ''],
  ])('F-16 AC-014 refuses the name %j, which gives no file name', (name) => {
    const config = withFlow((flow) => ({ ...flow, name }));
    expect(blockersOf(analyzeStructure(config), 'command-file-name')).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        rule: 'command-file-name',
        path: 'pipeline.flows.0.name',
        message: expect.stringContaining('flow build gives no command file name'),
      }),
    ]);
  });

  it('F-16 AC-014 is reported by the refusal gate, so generation refuses the config', () => {
    const config = withFlow((flow) => ({ ...flow, name: '---' }));
    expect(configProblems(config)).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'command-file-name', path: 'pipeline.flows.0.name' })]),
    );
  });

  it('F-16 AC-014 leaves a blank name to the flow-name rule only, so it is not reported twice', () => {
    const config = withFlow((flow) => ({ ...flow, name: '   ' }));
    expect(blockersOf(analyzeStructure(config), 'command-file-name')).toEqual([]);
    expect(blockersOf(analyzeStructure(config), 'flow-name')).toHaveLength(1);
  });

  it('F-16 AC-014 has no finding for a name with a letter or digit', () => {
    expect(blockersOf(analyzeStructure(withFlow((flow) => ({ ...flow, name: 'Café 2' }))), 'command-file-name')).toEqual(
      [],
    );
  });
});

describe('F-16 AC-015 two flows with the same command file name are a blocker', () => {
  it.each([
    ['Build', 'build!', 'build'],
    ['Review code', 'review  code', 'review-code'],
    ['Specify', 'SPECIFY', 'specify'],
  ])('F-16 AC-015 refuses %j and %j, which both give %j', (first, second, fileName) => {
    const config = twoFlows(first, second);
    expect(blockersOf(analyzeStructure(config), 'command-file-clash')).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        rule: 'command-file-clash',
        path: 'pipeline.flows.1.name',
        message: `flow flow-b gives the command file ${fileName}.md, the same as flow flow-a`,
      }),
    ]);
  });

  it('F-16 AC-015 is reported by the refusal gate, so generation refuses the config', () => {
    expect(configProblems(twoFlows('Build', 'build!'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'command-file-clash', path: 'pipeline.flows.1.name' })]),
    );
  });

  it('F-16 AC-015 has no finding for two flows with different file names', () => {
    expect(blockersOf(analyzeStructure(twoFlows('Build', 'Test')), 'command-file-clash')).toEqual([]);
  });

  it('F-16 AC-015 has no finding for two names whose non-ASCII letters give different file names', () => {
    expect(blockersOf(analyzeStructure(twoFlows('Build 日本', 'Build 中国')), 'command-file-clash')).toEqual([]);
  });

  it('F-16 AC-015 gives the clash for each later flow with the same file name', () => {
    const base = twoFlows('Build', 'build');
    const third: Flow = { ...flowNamed('BUILD', 'flow-c'), index: 2 };
    const config: ProjectConfig = { ...base, pipeline: { ...base.pipeline, flows: [...base.pipeline.flows, third] } };
    expect(commandFileRule(config).map((finding) => finding.path)).toEqual([
      'pipeline.flows.1.name',
      'pipeline.flows.2.name',
    ]);
  });

  it('F-16 AC-015 refuses a flow whose file name is pipeline, the pipeline command file', () => {
    const config = withFlow((flow) => ({ ...flow, name: 'Pipeline!' }));
    expect(blockersOf(analyzeStructure(config), 'command-file-clash')).toEqual([
      expect.objectContaining({
        path: 'pipeline.flows.0.name',
        message: "flow build gives the command file pipeline.md, the pipeline command's file",
      }),
    ]);
  });
});

describe('F-16 AC-016 the file list and the process command list name each command file the same way', () => {
  it('F-16 AC-016 lists every flow command file under the name its file list path has', () => {
    const config = twoFlows('Review code', 'Specify');
    const listed = baseValues(config)['commandList'] ?? '';
    for (const path of commandPaths(config)) {
      expect(listed).toContain(`\`${path}\``);
    }
    expect(commandPaths(config)).toEqual([
      '.claude/commands/review-code.md',
      '.claude/commands/specify.md',
    ]);
  });
});
