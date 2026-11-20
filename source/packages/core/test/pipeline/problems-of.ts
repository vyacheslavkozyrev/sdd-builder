import type { Problem } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';

// The problems of a config as a list: empty when the config parses cleanly.
export function problemsOf(input: unknown): readonly Problem[] {
  const result = parseProjectConfig(input);
  return result.ok ? [] : result.problems;
}
