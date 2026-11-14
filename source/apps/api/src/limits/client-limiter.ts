/** Per-client limits (F-13, decision 12): fixed windows, counted per client address. */
export const CLIENT_LIMITS = { perMinute: 10, perDay: 100 } as const;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * An accepted request's count. The address and windows it was counted in are kept inside the limiter;
 * the holder hands it back through `refund`.
 */
export type Reservation = { readonly allowed: true };

export type LimitDecision = Reservation | { allowed: false; retryAfterSeconds: number };

interface Usage {
  /** UTC day index (days since the epoch) of the current day window. */
  day: number;
  dayCount: number;
  /** Minute index (minutes since the epoch) of the current minute window. */
  minute: number;
  minuteCount: number;
}

/** The address and windows a reservation was counted in. */
interface Counted {
  address: string;
  day: number;
  minute: number;
}

/**
 * In-memory fixed-window limiter. `admit` decides and counts in one synchronous step: an accepted request
 * is counted in the same call that accepts it, and a refused request counts nothing. JavaScript runs the
 * body of `admit` without interleaving, so two requests from one client cannot both pass before either is
 * counted. The clock is injected as epoch milliseconds, so tests move the windows with fixed times.
 */
export class ClientLimiter {
  private readonly usage = new Map<string, Usage>();
  private readonly counted = new WeakMap<Reservation, Counted>();
  private day: number | null = null;

  constructor(private readonly clock: () => number) {}

  /** Number of client addresses currently held in memory. */
  get trackedClients(): number {
    return this.usage.size;
  }

  /**
   * Admits or refuses one request from this address. When allowed, the request is counted in the current
   * minute and day windows and the returned reservation can be refunded once; when refused, nothing is
   * counted and no entry is created or changed.
   */
  admit(address: string): LimitDecision {
    const now = this.clock();
    const { minute, day } = windowsAt(now);
    this.roll(day);
    const current = this.usage.get(address);
    const minuteUsed = current?.minute === minute ? current.minuteCount : 0;
    const dayUsed = current?.day === day ? current.dayCount : 0;
    let waitMs = 0;
    if (minuteUsed >= CLIENT_LIMITS.perMinute) {
      waitMs = (minute + 1) * MINUTE_MS - now;
    }
    if (dayUsed >= CLIENT_LIMITS.perDay) {
      waitMs = Math.max(waitMs, (day + 1) * DAY_MS - now);
    }
    if (waitMs > 0) {
      return { allowed: false, retryAfterSeconds: Math.ceil(waitMs / 1000) };
    }
    this.usage.set(address, {
      day,
      dayCount: dayUsed + 1,
      minute,
      minuteCount: minuteUsed + 1,
    });
    const reservation: Reservation = { allowed: true };
    this.counted.set(reservation, { address, day, minute });
    return reservation;
  }

  /**
   * Gives back the one count a reservation added, for a request that an input cap then refused. The count is
   * returned only if the address's entry still holds the minute and day the reservation was counted in; a
   * window that has since rolled is left alone. A reservation gives back its count once; later calls do nothing.
   */
  refund(reservation: Reservation): void {
    const counted = this.counted.get(reservation);
    if (counted === undefined) {
      return;
    }
    this.counted.delete(reservation);
    const current = this.usage.get(counted.address);
    if (current === undefined || current.minute !== counted.minute || current.day !== counted.day) {
      return;
    }
    current.minuteCount -= 1;
    current.dayCount -= 1;
  }

  /** On the first call of a new UTC day, drops every entry that belongs to an earlier day. */
  private roll(day: number): void {
    if (this.day === day) {
      return;
    }
    this.day = day;
    for (const [address, usage] of this.usage) {
      if (usage.day !== day) {
        this.usage.delete(address);
      }
    }
  }
}

function windowsAt(now: number): { minute: number; day: number } {
  return { minute: Math.floor(now / MINUTE_MS), day: Math.floor(now / DAY_MS) };
}
