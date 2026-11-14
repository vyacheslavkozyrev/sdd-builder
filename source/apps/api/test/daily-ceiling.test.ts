import { describe, expect, it } from 'vitest';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';
import { dailyLimitsFrom } from '../src/limits/env.js';

/** 2026-11-13 12:00:00 UTC. */
const START = Date.UTC(2026, 10, 13, 12, 0, 0);
const NEXT_DAY_START = Date.UTC(2026, 10, 14, 0, 0, 0);

function setup(limit: number, startAt = START): { ceiling: DailyCeiling; move: (to: number) => void } {
  let now = startAt;
  const ceiling = new DailyCeiling(limit, () => now);
  return { ceiling, move: (to) => (now = to) };
}

/** Admits `count` calls, asserting each one is admitted. */
function admitAll(ceiling: DailyCeiling, count: number): void {
  for (let i = 0; i < count; i += 1) {
    expect(ceiling.admit()).toBe(true);
  }
}

describe('F-13 AC-018 generation ceiling counts calls per UTC day', () => {
  it('F-13 AC-018 admits 50 calls in one day and refuses the 51st', () => {
    const { ceiling } = setup(50);
    admitAll(ceiling, 50);
    expect(ceiling.admit()).toBe(false);
  });

  it('F-13 AC-018 keeps refusing at the ceiling without counting the refused calls', () => {
    const { ceiling } = setup(2);
    admitAll(ceiling, 2);
    expect(ceiling.admit()).toBe(false);
    expect(ceiling.admit()).toBe(false);
    expect(ceiling.admit()).toBe(false);
  });

  it('F-13 AC-018 a ceiling of 0 refuses the first call', () => {
    const { ceiling } = setup(0);
    expect(ceiling.admit()).toBe(false);
  });

  it('F-13 AC-018 counts across the whole day, not per minute', () => {
    const { ceiling, move } = setup(3);
    admitAll(ceiling, 2);
    move(START + 5 * 60 * 60_000);
    expect(ceiling.admit()).toBe(true);
    expect(ceiling.admit()).toBe(false);
  });
});

describe('F-13 AC-019 daily ceilings reset at the UTC day boundary', () => {
  it('F-13 AC-019 admits again from the first moment of the next UTC day', () => {
    const { ceiling, move } = setup(2, NEXT_DAY_START - 1);
    admitAll(ceiling, 2);
    expect(ceiling.admit()).toBe(false);
    move(NEXT_DAY_START);
    admitAll(ceiling, 2);
    expect(ceiling.admit()).toBe(false);
  });

  it('F-13 AC-019 the last millisecond of a day still belongs to that day', () => {
    const { ceiling, move } = setup(1, NEXT_DAY_START - 2);
    expect(ceiling.admit()).toBe(true);
    move(NEXT_DAY_START - 1);
    expect(ceiling.admit()).toBe(false);
  });

  it('F-13 AC-019 a clock that steps back to an earlier day does not reopen a spent day', () => {
    const { ceiling, move } = setup(1, NEXT_DAY_START + 60_000);
    expect(ceiling.admit()).toBe(true);
    move(NEXT_DAY_START - 60_000);
    expect(ceiling.admit()).toBe(false);
    move(NEXT_DAY_START + 2 * 86_400_000);
    expect(ceiling.admit()).toBe(true);
  });

  it('F-13 AC-019 two separate ceilings reset independently at the same boundary', () => {
    let now = NEXT_DAY_START - 1;
    const clock = () => now;
    const review = new DailyCeiling(1, clock);
    const generate = new DailyCeiling(1, clock);
    expect(review.admit()).toBe(true);
    expect(generate.admit()).toBe(true);
    expect(review.admit()).toBe(false);
    expect(generate.admit()).toBe(false);
    now = NEXT_DAY_START;
    expect(review.admit()).toBe(true);
    expect(generate.admit()).toBe(true);
  });
});

describe('F-13 AC-017 review ceiling counts calls per UTC day', () => {
  it('F-13 AC-017 admits up to the review ceiling read from the environment default and refuses the next call', () => {
    const limit = dailyLimitsFrom({}).reviewDailyLimit;
    const { ceiling } = setup(limit);
    admitAll(ceiling, limit);
    expect(ceiling.admit()).toBe(false);
  });
});
