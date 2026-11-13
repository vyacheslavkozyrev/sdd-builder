import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

/**
 * The address the per-client limits count: the connection's remote address (F-13 AC-008).
 * Request headers such as a forwarded address are never read, so a client cannot choose its own bucket.
 */
export function connectionAddress(c: Context): string {
  return getConnInfo(c).remote.address ?? 'unknown';
}
