import type { LimitPorts } from '../src/app.js';
import { ClientLimiter } from '../src/limits/client-limiter.js';

/** 2026-11-13 12:00:00 UTC: the clock of every test app that is not about limits. */
const FIXED_NOW = Date.UTC(2026, 10, 13, 12, 0, 0);

/**
 * Limits for an app whose test is not about limits: a fresh limiter on a fixed clock, and one fixed client address.
 * Each call returns a new limiter, so no count carries from one app to another.
 */
export function fixedLimits(): LimitPorts {
  return { limiter: new ClientLimiter(() => FIXED_NOW), clientAddress: () => '203.0.113.7' };
}
