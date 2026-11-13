const DAY_MS = 86_400_000;

/**
 * A daily ceiling for one kind of model call (F-13, decision 12): at most `limit` calls per UTC day, shared by
 * all clients. `admit` is called right before a model call and counts that call; a failed call still counts,
 * and a call refused at the ceiling counts nothing. The clock is injected as epoch milliseconds, as in the
 * client limiter, so tests move the day boundary with fixed times.
 */
export class DailyCeiling {
  private day = -Infinity;
  private count = 0;

  constructor(
    private readonly limit: number,
    private readonly clock: () => number,
  ) {}

  /**
   * Counts one model call and returns `true` while the day's count is below the limit; returns `false` at the ceiling.
   * The count resets only when the clock moves to a later day, so a clock that steps back cannot reopen a spent day.
   */
  admit(): boolean {
    const day = Math.floor(this.clock() / DAY_MS);
    if (day > this.day) {
      this.day = day;
      this.count = 0;
    }
    if (this.count >= this.limit) {
      return false;
    }
    this.count += 1;
    return true;
  }
}
