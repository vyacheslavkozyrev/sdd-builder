import { createProblemCollector } from '../check/primitives.js';
import type { Problem } from '../model.js';
import { parseRoot } from './project.js';

// The parser entry. It takes an unknown value (a parsed JSON document) and returns every problem
// found, each with its path. It never throws on bad input. Returning the typed config is added
// when the rules and the pipeline are parsed.
export function parseProjectConfig(input: unknown): readonly Problem[] {
  const problems = createProblemCollector();
  parseRoot(input, problems);
  return problems.list();
}
