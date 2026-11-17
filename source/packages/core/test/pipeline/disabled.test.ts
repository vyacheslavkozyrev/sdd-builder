import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { validConfig } from './analyze-fixture.js';

// The raw input as the parser receives it: a copy of the valid fixture, with keys added by a test.
type RawBlock = Record<string, unknown>;
interface RawFlow {
  blocks: RawBlock[];
  [key: string]: unknown;
}
interface RawConfig {
  pipeline: { flows: RawFlow[] };
}

function rawConfig(change: (config: RawConfig) => void): unknown {
  const config = structuredClone(validConfig) as unknown as RawConfig;
  change(config);
  return config;
}

function problemPaths(input: unknown): string[] {
  const result = parseProjectConfig(input);
  return result.ok ? [] : result.problems.map((problem) => problem.path);
}

describe('F-03 AC-028 a block with an enabled or disabled key is refused as an unknown key', () => {
  it.each(['enabled', 'disabled'])('F-03 AC-028 refuses a %s key on a block, at the block path', (key) => {
    const input = rawConfig((config) => {
      const block = config.pipeline.flows[0]?.blocks[1];
      if (block) {
        block[key] = true;
      }
    });
    expect(parseProjectConfig(input).ok).toBe(false);
    expect(problemPaths(input)).toEqual([`pipeline.flows[0].blocks[1].${key}`]);
  });

  it.each(['enabled', 'disabled'])('F-03 AC-028 refuses a %s key on the Start block, at its path', (key) => {
    const input = rawConfig((config) => {
      const block = config.pipeline.flows[0]?.blocks[0];
      if (block) {
        block[key] = false;
      }
    });
    expect(problemPaths(input)).toEqual([`pipeline.flows[0].blocks[0].${key}`]);
  });

  it.each(['enabled', 'disabled'])('F-03 AC-028 refuses a %s key on the End block, at its path', (key) => {
    const input = rawConfig((config) => {
      const block = config.pipeline.flows[0]?.blocks[2];
      if (block) {
        block[key] = true;
      }
    });
    expect(problemPaths(input)).toEqual([`pipeline.flows[0].blocks[2].${key}`]);
  });
});

describe('F-03 AC-028 a flow with an enabled or disabled key is refused as an unknown key', () => {
  it.each(['enabled', 'disabled'])('F-03 AC-028 refuses a %s key on a flow, at the flow path', (key) => {
    const input = rawConfig((config) => {
      const flow = config.pipeline.flows[0];
      if (flow) {
        flow[key] = true;
      }
    });
    expect(parseProjectConfig(input).ok).toBe(false);
    expect(problemPaths(input)).toEqual([`pipeline.flows[0].${key}`]);
  });
});
