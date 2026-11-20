import { describe, expect, it } from 'vitest';
import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import { validConfig } from './analyze-fixture.js';

// The default pipeline is read from its JSON file and passed through the parser, as a user document would be.
// The parser adds the `index` keys, so the analysis gets the typed value it expects.
describe('F-03 AC-031 the default pipeline gives no finding', () => {
  it('parses the default pipeline JSON with no problem and analyses it to an empty list', () => {
    const parsed = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipelineJson });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(analyzeStructure(parsed.config)).toEqual([]);
  });
});

describe('F-03 AC-036 a minimal valid pipeline has no finding', () => {
  it('gives an empty list for one flow with Start, Agent and End and no next link', () => {
    expect(analyzeStructure(validConfig())).toEqual([]);
  });
});
