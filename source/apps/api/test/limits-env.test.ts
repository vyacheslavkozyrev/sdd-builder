import { describe, expect, it } from 'vitest';
import { dailyLimitsFrom } from '../src/limits/env.js';

describe('F-13 AC-017 review ceiling from the environment', () => {
  it('F-13 AC-017 uses 500 when SDDBUILDER_REVIEW_DAILY_LIMIT is unset or empty', () => {
    expect(dailyLimitsFrom({}).reviewDailyLimit).toBe(500);
    expect(dailyLimitsFrom({ SDDBUILDER_REVIEW_DAILY_LIMIT: '' }).reviewDailyLimit).toBe(500);
    expect(dailyLimitsFrom({ SDDBUILDER_REVIEW_DAILY_LIMIT: '   ' }).reviewDailyLimit).toBe(500);
  });

  it('F-13 AC-017 reads a whole number of 0 or more', () => {
    expect(dailyLimitsFrom({ SDDBUILDER_REVIEW_DAILY_LIMIT: '0' }).reviewDailyLimit).toBe(0);
    expect(dailyLimitsFrom({ SDDBUILDER_REVIEW_DAILY_LIMIT: ' 120 ' }).reviewDailyLimit).toBe(120);
  });

  it.each(['-1', '1.5', 'abc', '12x', '1e3', '+5', '0x10', '99999999999999999999'])(
    'F-13 AC-017 refuses the value %s and names the variable without its value',
    (value) => {
      let message = '';
      try {
        dailyLimitsFrom({ SDDBUILDER_REVIEW_DAILY_LIMIT: value });
      } catch (err) {
        message = err instanceof Error ? err.message : '';
      }
      expect(message).toBe('SDDBUILDER_REVIEW_DAILY_LIMIT must be a whole number of 0 or more');
      expect(message).not.toContain(value);
    },
  );
});

describe('F-13 AC-018 generation ceiling from the environment', () => {
  it('F-13 AC-018 uses 50 when SDDBUILDER_GENERATE_DAILY_LIMIT is unset or empty', () => {
    expect(dailyLimitsFrom({}).generateDailyLimit).toBe(50);
    expect(dailyLimitsFrom({ SDDBUILDER_GENERATE_DAILY_LIMIT: '' }).generateDailyLimit).toBe(50);
  });

  it('F-13 AC-018 reads a whole number of 0 or more', () => {
    expect(dailyLimitsFrom({ SDDBUILDER_GENERATE_DAILY_LIMIT: '0' }).generateDailyLimit).toBe(0);
    expect(dailyLimitsFrom({ SDDBUILDER_GENERATE_DAILY_LIMIT: '7' }).generateDailyLimit).toBe(7);
  });

  it.each(['-3', '2.0', 'many', 'xxx'])(
    'F-13 AC-018 refuses the value %s and names the variable without its value',
    (value) => {
      let message = '';
      try {
        dailyLimitsFrom({ SDDBUILDER_GENERATE_DAILY_LIMIT: value });
      } catch (err) {
        message = err instanceof Error ? err.message : '';
      }
      expect(message).toBe('SDDBUILDER_GENERATE_DAILY_LIMIT must be a whole number of 0 or more');
      expect(message).not.toContain(value);
    },
  );

  it('F-13 AC-018 reads the two variables independently', () => {
    const limits = dailyLimitsFrom({ SDDBUILDER_REVIEW_DAILY_LIMIT: '3', SDDBUILDER_GENERATE_DAILY_LIMIT: '4' });
    expect(limits).toEqual({ reviewDailyLimit: 3, generateDailyLimit: 4 });
  });
});
