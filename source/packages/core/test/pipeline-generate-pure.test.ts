import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate } from '../src/pipeline/generate/generate.js';
import type { ProjectConfig } from '../src/pipeline/model.js';
import {
  BASE_TEMPLATES,
  agent,
  configWith,
  pipelineEnd,
  pipelineStart,
  requiredGates,
  validFlow,
} from './pipeline-routes-fixtures.js';

/** A small valid pipeline: one enabled flow with one enabled agent, between the pipeline start and end. */
function smallConfig(): ProjectConfig {
  return configWith([pipelineStart(), validFlow('build', [agent('build-implement')]), ...requiredGates(), pipelineEnd()]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('F-02 AC-034 generate runs without network or file access', () => {
  it('F-02 AC-034 generates the small pipeline from fixed input with the fake template source and no warnings', () => {
    const result = generate(smallConfig(), BASE_TEMPLATES);
    expect(result.warnings).toEqual([]);
    expect(result.files.map((file) => file.path)).toContain('CLAUDE.md');
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('F-02 AC-034 generates the default pipeline from fixed input with the fake template source and no warnings', () => {
    const result = generate(defaultProjectConfig, BASE_TEMPLATES);
    expect(result.warnings).toEqual([]);
    expect(result.files.map((file) => file.path)).toContain('CLAUDE.md');
  });

  it('F-02 AC-034 never calls fetch while it generates', () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('network access in the pure core');
    });
    vi.stubGlobal('fetch', fetchSpy);
    generate(smallConfig(), BASE_TEMPLATES);
    generate(defaultProjectConfig, BASE_TEMPLATES);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('F-02 AC-034 two runs from the same config and templates give equal files and warnings', () => {
    const config = smallConfig();
    const first = generate(config, BASE_TEMPLATES);
    const second = generate(config, BASE_TEMPLATES);
    expect(second).toEqual(first);
  });

  it('F-02 AC-034 two runs from the default config give equal files and warnings', () => {
    const first = generate(defaultProjectConfig, BASE_TEMPLATES);
    const second = generate(defaultProjectConfig, BASE_TEMPLATES);
    expect(second).toEqual(first);
  });
});
