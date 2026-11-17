import { describe, expect, expectTypeOf, it } from 'vitest';
import * as root from '../../src/index.js';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { configProblems } from '../../src/pipeline/generate/problems.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import { checkReply } from '../../src/pipeline/generate/reply-check.js';
import { GenerationError } from '../../src/pipeline/generate/errors.js';

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

  it('F-04 AC-031 the pipeline namespace exposes configProblems, planGeneration and checkReply as the module functions', () => {
    expect(root.pipeline.configProblems).toBe(configProblems);
    expect(root.pipeline.planGeneration).toBe(planGeneration);
    expect(root.pipeline.checkReply).toBe(checkReply);
  });

  it('F-04 AC-031 the pipeline namespace exposes GenerationError as the error class', () => {
    expect(root.pipeline.GenerationError).toBe(GenerationError);
    expect(new root.pipeline.GenerationError('fixture')).toBeInstanceOf(Error);
  });

  it('F-04 AC-031 the root export list gains no generator name, only the namespace pipeline', () => {
    expect(Object.keys(root)).toEqual(['pipeline']);
    expect(Object.keys(root)).not.toContain('planGeneration');
    expect(Object.keys(root)).not.toContain('checkReply');
    expect(Object.keys(root)).not.toContain('configProblems');
    expect(Object.keys(root)).not.toContain('GenerationError');
  });

  it('F-02 AC-034 the pipeline namespace exposes the model types', () => {
    expectTypeOf<root.pipeline.ProjectConfig>().toHaveProperty('schemaVersion');
    expectTypeOf<root.pipeline.Model>().toEqualTypeOf<'haiku' | 'sonnet' | 'opus' | 'inherit'>();
  });
});
