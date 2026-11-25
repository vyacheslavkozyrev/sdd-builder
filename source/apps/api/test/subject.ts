import type { pipeline } from '@sddbuilder/core';
import type { AnalysisFinding } from '../src/analyze.js';

// The findings as the 200 reply carries them: each finding with its path as its subject (F-16 AC-017).
export function withSubjects(findings: readonly pipeline.Finding[]): AnalysisFinding[] {
  return findings.map((finding) => ({ ...finding, subject: finding.path }));
}
