/**
 * Refuses a second Analyze while a request runs (F-05 AC-020). The caller calls `start()` before
 * it sends and `release()` in a `finally`, so the guard is released on success and on failure.
 */
export interface InFlightGuard {
  /** Returns true when the caller may send. Returns false, and changes nothing, while a request runs. */
  start(): boolean;
  /** Releases the guard after the request has settled. */
  release(): void;
}

/** A new guard, free to start. Each form holds its own guard. */
export function createInFlightGuard(): InFlightGuard {
  let running = false;
  return {
    start() {
      if (running) {
        return false;
      }
      running = true;
      return true;
    },
    release() {
      running = false;
    },
  };
}
