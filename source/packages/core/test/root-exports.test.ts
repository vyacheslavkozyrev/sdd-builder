import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as root from '../src/index.js';

const FLAT_ANALYSIS_NAMES = ['analyzeStructure', 'skippedAnalysis', 'checkReview'] as const;
const FLAT_ANALYSIS_DIR = join(import.meta.dirname, '..', 'src', 'analyze');

describe('F-04 AC-024: the root no longer exports the flat analysis', () => {
  it.each(FLAT_ANALYSIS_NAMES)('F-04 AC-024 the root namespace has no %s', (name) => {
    expect(root).not.toHaveProperty(name);
  });

  it('F-04 AC-024 no flat analysis folder remains under src/analyze', () => {
    expect(existsSync(FLAT_ANALYSIS_DIR)).toBe(false);
  });

  it.each(FLAT_ANALYSIS_NAMES)('F-04 AC-024 the pipeline namespace still has %s', (name) => {
    expect(root.pipeline).toHaveProperty(name);
  });
});
