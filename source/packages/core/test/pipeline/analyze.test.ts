import { describe, expect, it } from 'vitest';
import { analyzeStructure, analyzeWith } from '../../src/pipeline/analyze/index.js';
import type { PositionedFinding, Severity } from '../../src/pipeline/analyze/finding.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

const PIPELINE = { flow: -1, block: -1, slot: -1 };

// Freezes the value and everything in it, so a write in strict mode (ES modules) throws.
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function found(
  rule: string,
  path: string,
  position: { flow: number; block: number; slot: number },
  severity: Severity = 'blocker',
): PositionedFinding {
  return { severity, rule, path, message: `${rule} at ${path}`, position };
}

describe('F-03 analysis entry', () => {
  it('F-03 AC-033 gives the same list in the same order when the same pipeline is analysed twice', () => {
    const config = validConfig();
    expect(analyzeStructure(config)).toEqual(analyzeStructure(config));
  });

  it('F-03 AC-033 does not change the pipeline it analyses (a frozen input would throw on any write)', () => {
    const config: ProjectConfig = deepFreeze(withFlow((flow) => ({ ...flow, blocks: [...flow.blocks].reverse() })));
    const before = structuredClone(config);
    expect(() => analyzeStructure(config)).not.toThrow();
    expect(() => analyzeWith([() => [found('fake', 'root.pipeline', PIPELINE)]], config)).not.toThrow();
    expect(config).toEqual(before);
  });

  it('F-03 AC-034 gives every finding a severity, a rule id, a path and a message, and no other keys', () => {
    const modules = [
      () => [found('rule-a', 'root.pipeline.flows.0', { flow: 0, block: -1, slot: -1 })],
      () => [found('rule-b', 'root.pipeline.flows.0.blocks.1.name', { flow: 0, block: 1, slot: -1 }, 'warning')],
    ];
    const result = analyzeWith(modules, validConfig());
    expect(result).toHaveLength(2);
    for (const finding of result) {
      expect(Object.keys(finding).sort()).toEqual(['message', 'path', 'rule', 'severity']);
      expect(['blocker', 'warning']).toContain(finding.severity);
      expect(finding.rule).not.toBe('');
      expect(finding.path).not.toBe('');
      expect(finding.message).not.toBe('');
    }
  });

  it('F-03 AC-032 sorts findings by pipeline, flow, block and route (true before false), then drops positions', () => {
    const modules = [
      () => [
        found('falseRoute', 'p.route.false', { flow: 0, block: 2, slot: 1 }),
        found('flowLevel', 'p.flow', { flow: 0, block: -1, slot: -1 }),
        found('laterBlock', 'p.block.3', { flow: 0, block: 3, slot: -1 }),
        found('trueRoute', 'p.route.true', { flow: 0, block: 2, slot: 0 }),
        found('block', 'p.block.2', { flow: 0, block: 2, slot: -1 }),
      ],
      () => [
        found('nextFlow', 'p.flows.1', { flow: 1, block: -1, slot: -1 }),
        found('pipelineLevel', 'p.pipeline', PIPELINE),
      ],
    ];
    const result = analyzeWith(modules, validConfig());
    expect(result.map((finding) => finding.rule)).toEqual([
      'pipelineLevel',
      'flowLevel',
      'block',
      'trueRoute',
      'falseRoute',
      'laterBlock',
      'nextFlow',
    ]);
    expect(result[0]).toEqual({
      severity: 'blocker',
      rule: 'pipelineLevel',
      path: 'p.pipeline',
      message: 'pipelineLevel at p.pipeline',
    });
  });

  it('F-03 AC-032 keeps the order of the modules for findings at the same position', () => {
    const at = { flow: 0, block: 1, slot: -1 };
    const modules = [() => [found('first', 'p', at)], () => [found('second', 'p', at)]];
    expect(analyzeWith(modules, validConfig()).map((finding) => finding.rule)).toEqual(['first', 'second']);
  });
});
