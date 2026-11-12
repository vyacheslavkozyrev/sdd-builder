import type { ProjectConfig } from '../model.js';
import { InvalidConfigError } from '../errors.js';
import { checkDuplicateIds } from './ids.js';
import { checkMap } from './map.js';
import { checkRoutes } from './routes.js';

/** Every structural problem in a configuration, in the order the checks run. */
export function validateConfig(config: ProjectConfig): string[] {
  return [...checkDuplicateIds(config), ...checkMap(config), ...checkRoutes(config)];
}

/** Throws InvalidConfigError listing every problem; does nothing for a valid configuration. */
export function assertValidConfig(config: ProjectConfig): void {
  const problems = validateConfig(config);
  if (problems.length > 0) {
    throw new InvalidConfigError(problems);
  }
}
