import { describe, expect, expectTypeOf, it } from 'vitest';
import { pipeline } from '../src/index.js';
import type { AnalysisResult, GenerationResult } from '../src/model.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { BASE_TEMPLATES } from './pipeline-routes-fixtures.js';

// The result shapes are the contract between core, apps/api and apps/web. The typed literals and
// `expectTypeOf` checks fail `tsc --noEmit` (run by `npm run typecheck`) if a field is removed or
// renamed. The run-time checks read the shapes that core actually returns, so they fail too.

describe('F-01 result shapes', () => {
  it('F-01 AC-024 AnalysisResult has findings and a review with status, findings and dropped', () => {
    const literal: AnalysisResult = {
      findings: [{ severity: 'info', subject: 'brief', message: 'ok' }],
      review: { status: 'ok', findings: [], dropped: 0 },
    };

    expectTypeOf<AnalysisResult>().toHaveProperty('findings');
    expectTypeOf<AnalysisResult>().toHaveProperty('review');
    expectTypeOf<AnalysisResult['review']>().toHaveProperty('status');
    expectTypeOf<AnalysisResult['review']>().toHaveProperty('findings');
    expectTypeOf<AnalysisResult['review']>().toHaveProperty('dropped');
    expectTypeOf<AnalysisResult['review']['status']>().toEqualTypeOf<'ok' | 'failed' | 'skipped'>();
    expectTypeOf<AnalysisResult['review']['dropped']>().toEqualTypeOf<number>();

    const returned: AnalysisResult = pipeline.skippedAnalysis(defaultProjectConfig);
    expect(Object.keys(returned).sort()).toEqual(['findings', 'review']);
    expect(Object.keys(returned.review).sort()).toEqual(['dropped', 'findings', 'status']);
    expect(literal.review.status).toBe('ok');
    expect(returned.review.status).toBe('skipped');
    expect(Array.isArray(returned.findings)).toBe(true);
  });

  it('F-01 AC-025 GenerationResult has files with path and content, and warnings', () => {
    const literal: GenerationResult = {
      files: [{ path: 'CLAUDE.md', content: '# Project\n' }],
      warnings: [],
    };

    expectTypeOf<GenerationResult>().toHaveProperty('files');
    expectTypeOf<GenerationResult>().toHaveProperty('warnings');
    expectTypeOf<GenerationResult['files'][number]>().toHaveProperty('path');
    expectTypeOf<GenerationResult['files'][number]>().toHaveProperty('content');
    expectTypeOf<GenerationResult['warnings']>().toEqualTypeOf<string[]>();
    expectTypeOf(literal).toEqualTypeOf<GenerationResult>();

    const returned: GenerationResult = pipeline.generate(defaultProjectConfig, BASE_TEMPLATES);
    expect(Object.keys(returned).sort()).toEqual(['files', 'warnings']);
    expect(returned.files.length).toBeGreaterThan(0);
    for (const file of returned.files) {
      expect(Object.keys(file).sort()).toEqual(['content', 'path']);
    }
    expect(Array.isArray(returned.warnings)).toBe(true);
  });
});
