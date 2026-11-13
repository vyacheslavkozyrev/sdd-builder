import { describe, expect, it } from 'vitest';
import { ClientLimiter, type LimitDecision } from '../src/limits/client-limiter.js';

const MINUTE = 60_000;
const DAY = 86_400_000;
/** 2026-11-13 12:00:00 UTC, minute-aligned. */
const START = Date.UTC(2026, 10, 13, 12, 0, 0);
const NEXT_DAY = Date.UTC(2026, 10, 14, 0, 0, 0);
const ADDRESS = '203.0.113.7';

function setup(startAt = START): { limiter: ClientLimiter; move: (to: number) => void } {
  let now = startAt;
  const limiter = new ClientLimiter(() => now);
  return { limiter, move: (to) => (now = to) };
}

/** Admits `count` requests, asserting each one is allowed. */
function accept(limiter: ClientLimiter, address: string, count: number): void {
  for (let i = 0; i < count; i += 1) {
    expect(limiter.admit(address)).toEqual({ allowed: true });
  }
}

describe('F-13 AC-001 per-minute limit', () => {
  it('F-13 AC-001 allows 10 requests in one minute and refuses the 11th', () => {
    const { limiter } = setup();
    accept(limiter, ADDRESS, 10);
    expect(limiter.admit(ADDRESS)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('F-13 AC-001 reports Retry-After as the whole seconds left in the minute, rounded up', () => {
    const { limiter, move } = setup(START + 30_250);
    accept(limiter, ADDRESS, 10);
    expect(limiter.admit(ADDRESS)).toEqual({ allowed: false, retryAfterSeconds: 30 });
    move(START + 59_999);
    expect(limiter.admit(ADDRESS)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('F-13 AC-001 two requests in a row at the last free slot admit exactly one', () => {
    const { limiter } = setup();
    accept(limiter, ADDRESS, 9);
    const first: LimitDecision = limiter.admit(ADDRESS);
    const second: LimitDecision = limiter.admit(ADDRESS);
    expect(first).toEqual({ allowed: true });
    expect(second).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });
});

describe('F-13 AC-002 per-day limit', () => {
  it('F-13 AC-002 refuses the 101st request of a UTC day even when the minute window has reset', () => {
    const { limiter, move } = setup();
    for (let minute = 0; minute < 10; minute += 1) {
      move(START + minute * MINUTE);
      accept(limiter, ADDRESS, 10);
    }
    move(START + 10 * MINUTE);
    const decision = limiter.admit(ADDRESS);
    expect(decision).toEqual({ allowed: false, retryAfterSeconds: Math.ceil((NEXT_DAY - (START + 10 * MINUTE)) / 1000) });
  });

  it('F-13 AC-002 allows requests again at the next UTC day with a fresh count', () => {
    const { limiter, move } = setup();
    for (let minute = 0; minute < 10; minute += 1) {
      move(START + minute * MINUTE);
      accept(limiter, ADDRESS, 10);
    }
    move(NEXT_DAY);
    accept(limiter, ADDRESS, 10);
  });
});

describe('F-13 AC-003 per-address counts', () => {
  it('F-13 AC-003 a second address has its own counts', () => {
    const { limiter } = setup();
    accept(limiter, '198.51.100.1', 10);
    expect(limiter.admit('198.51.100.1').allowed).toBe(false);
    accept(limiter, '198.51.100.2', 10);
  });
});

describe('F-13 AC-006 injected clock windows', () => {
  it('F-13 AC-006 resets the minute count at the window boundary', () => {
    const { limiter, move } = setup();
    accept(limiter, ADDRESS, 10);
    move(START + MINUTE - 1);
    expect(limiter.admit(ADDRESS).allowed).toBe(false);
    move(START + MINUTE);
    accept(limiter, ADDRESS, 10);
  });

  it('F-13 AC-006 resets the day count at the UTC day boundary', () => {
    const { limiter, move } = setup(NEXT_DAY - MINUTE);
    accept(limiter, ADDRESS, 10);
    move(NEXT_DAY);
    expect(limiter.admit(ADDRESS)).toEqual({ allowed: true });
  });
});

describe('F-13 AC-007 only accepted requests count', () => {
  it('F-13 AC-007 refused requests do not use up the day budget', () => {
    const { limiter, move } = setup();
    accept(limiter, ADDRESS, 10);
    for (let i = 0; i < 20; i += 1) {
      expect(limiter.admit(ADDRESS).allowed).toBe(false);
    }
    for (let minute = 1; minute < 10; minute += 1) {
      move(START + minute * MINUTE);
      accept(limiter, ADDRESS, 10);
    }
    move(START + 10 * MINUTE);
    expect(limiter.admit(ADDRESS).allowed).toBe(false);
  });

  it('F-13 AC-007 refused requests leave the number of table entries unchanged', () => {
    const { limiter } = setup();
    accept(limiter, ADDRESS, 10);
    const before = limiter.trackedClients;
    for (let i = 0; i < 5; i += 1) {
      limiter.admit(ADDRESS);
    }
    expect(limiter.trackedClients).toBe(before);
  });
});

describe('F-13 AC-009 expired entries are pruned', () => {
  it('F-13 AC-009 drops entries from earlier UTC days when the day changes', () => {
    const { limiter, move } = setup();
    limiter.admit('198.51.100.1');
    limiter.admit('198.51.100.2');
    limiter.admit('198.51.100.3');
    expect(limiter.trackedClients).toBe(3);

    move(NEXT_DAY);
    limiter.admit('198.51.100.4');
    expect(limiter.trackedClients).toBe(1);
  });

  it('F-13 AC-009 keeps entries of the current day', () => {
    const { limiter, move } = setup();
    limiter.admit('198.51.100.1');
    move(START + MINUTE);
    limiter.admit('198.51.100.2');
    expect(limiter.trackedClients).toBe(2);
  });
});

describe('F-13 AC-001 refusal shape', () => {
  it('F-13 AC-001 a refusal carries a whole-second retry value and nothing else', () => {
    const { limiter } = setup(START + 1);
    accept(limiter, ADDRESS, 10);
    expect(limiter.admit(ADDRESS)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });
});
