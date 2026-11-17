import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const defaultPath = resolve(sourceDir, 'templates', 'pipeline', 'default.json');

function loadDefaultConfig(): unknown {
  const pipeline: unknown = JSON.parse(readFileSync(defaultPath, 'utf8'));
  return { schemaVersion: 2, rules: [], pipeline };
}

describe('F-03 AC-024 the default pipeline passes the structural checks with two retry warnings', () => {
  it('F-03 AC-024 gives no blocker on the default pipeline', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    const blockers = analyzeStructure(result.config).filter((finding) => finding.severity === 'blocker');
    expect(blockers).toEqual([]);
  });

  it('F-03 AC-024 gives exactly two warnings on the default pipeline, one per retry into build-implement', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    const findings = analyzeStructure(result.config);
    expect(findings.map((finding) => finding.severity)).toEqual(['warning', 'warning']);
    expect(findings.map((finding) => finding.path)).toEqual([
      'pipeline.flows[3].blocks[3].connectedTo.false',
      'pipeline.flows[3].blocks[5].connectedTo.false',
    ]);
  });

  it('F-03 AC-024 names the retry into build-implement in both warnings', () => {
    const result = parseProjectConfig(loadDefaultConfig());
    if (!result.ok) {
      throw new Error('default pipeline does not parse');
    }
    for (const finding of analyzeStructure(result.config)) {
      expect(finding.message).toContain('"build-implement"');
      expect(finding.message).toContain('no round limit');
    }
  });
});
