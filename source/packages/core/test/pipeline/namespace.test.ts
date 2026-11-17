import { describe, expect, expectTypeOf, it } from 'vitest';
import * as root from '../../src/index.js';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

describe('F-02 AC-034 pipeline namespace', () => {
  it('F-02 AC-034 the root exposes the pipeline module as the namespace pipeline', () => {
    expect(root.pipeline).toBeTypeOf('object');
  });

  it('F-02 AC-034 the root exports no pipeline name other than the namespace', () => {
    const names = Object.keys(root);
    expect(names).toContain('pipeline');
    expect(names).not.toContain('parseProjectConfig');
    expect(names).not.toContain('defaultPipeline');
    expect(names).not.toContain('MODELS');
  });

  it('F-02 AC-034 the pipeline namespace exposes parseProjectConfig as the module function', () => {
    expect(root.pipeline.parseProjectConfig).toBe(parseProjectConfig);
    expect(root.pipeline.parseProjectConfig(undefined).ok).toBe(false);
  });

  it('F-02 AC-034 the pipeline namespace exposes defaultPipeline as the module value', () => {
    expect(root.pipeline.defaultPipeline).toBe(defaultPipeline);
  });

  it('F-02 AC-034 the pipeline namespace carries the model values, not only the types', () => {
    expect(root.pipeline.MODELS).toContain('haiku');
  });

  it('F-03 AC-029 the root exports only the namespace pipeline, and no other name', () => {
    expect(Object.keys(root)).toEqual(['pipeline']);
  });

  it('F-03 AC-029 the pipeline namespace exposes analyzeStructure as the module function', () => {
    expect(root.pipeline.analyzeStructure).toBe(analyzeStructure);
  });

  it('F-03 AC-029 the pipeline namespace exposes the Finding and Severity types', () => {
    expectTypeOf<root.pipeline.Finding>().toEqualTypeOf<{
      severity: 'blocker' | 'warning';
      path: string;
      message: string;
    }>();
    expectTypeOf<root.pipeline.Severity>().toEqualTypeOf<'blocker' | 'warning'>();
  });

  it('F-02 AC-034 the pipeline namespace exposes the model types', () => {
    expectTypeOf<root.pipeline.ProjectConfig>().toHaveProperty('schemaVersion');
    expectTypeOf<root.pipeline.Model>().toEqualTypeOf<'haiku' | 'sonnet' | 'opus' | 'inherit'>();
  });
});
