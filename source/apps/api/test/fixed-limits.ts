import type { LimitPorts } from '../src/app.js';
import { ClientLimiter } from '../src/limits/client-limiter.js';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';

/** A ceiling no test reaches, so the daily ceilings do not refuse requests in tests that are not about them. */
const UNREACHED = Number.MAX_SAFE_INTEGER;

/** 2026-11-13 12:00:00 UTC: the clock of every test app that is not about limits. */
const FIXED_NOW = Date.UTC(2026, 10, 13, 12, 0, 0);

/**
 * Limits for an app whose test is not about limits: a fresh limiter on a fixed clock, one fixed client address,
 * and daily ceilings that are not reached. Each call returns new counts, so no count carries from one app to another.
 */
export function fixedLimits(): LimitPorts {
  return {
    limiter: new ClientLimiter(() => FIXED_NOW),
    clientAddress: () => '203.0.113.7',
    reviewCeiling: new DailyCeiling(UNREACHED, () => FIXED_NOW),
    generateCeiling: new DailyCeiling(UNREACHED, () => FIXED_NOW),
  };
}
