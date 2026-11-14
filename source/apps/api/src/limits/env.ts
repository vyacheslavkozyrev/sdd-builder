/** Daily ceilings used when their variables are unset or empty (F-13, decision 12). */
export const DEFAULT_REVIEW_DAILY_LIMIT = 500;
export const DEFAULT_GENERATE_DAILY_LIMIT = 50;

/** The daily ceilings the server runs with, read once at startup. */
export interface DailyLimits {
  reviewDailyLimit: number;
  generateDailyLimit: number;
}

/** The environment the ceilings are read from. Only the two limit variables are named here. */
export interface DailyLimitsEnv {
  SDDBUILDER_REVIEW_DAILY_LIMIT?: string | undefined;
  SDDBUILDER_GENERATE_DAILY_LIMIT?: string | undefined;
}

/**
 * Reads both daily ceilings. Unset or empty gives the default; a value that is not a whole number of 0 or more
 * throws an error that names the variable, never its value.
 */
export function dailyLimitsFrom(env: DailyLimitsEnv): DailyLimits {
  return {
    reviewDailyLimit: wholeNumberFrom(
      env.SDDBUILDER_REVIEW_DAILY_LIMIT,
      'SDDBUILDER_REVIEW_DAILY_LIMIT',
      DEFAULT_REVIEW_DAILY_LIMIT,
    ),
    generateDailyLimit: wholeNumberFrom(
      env.SDDBUILDER_GENERATE_DAILY_LIMIT,
      'SDDBUILDER_GENERATE_DAILY_LIMIT',
      DEFAULT_GENERATE_DAILY_LIMIT,
    ),
  };
}

function wholeNumberFrom(raw: string | undefined, name: string, fallback: number): number {
  const text = raw?.trim() ?? '';
  if (text === '') {
    return fallback;
  }
  const value = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a whole number of 0 or more`);
  }
  return value;
}
