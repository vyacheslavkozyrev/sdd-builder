/** The port the app writes log lines to. Lines are built by `formatLogLine` only. */
export interface LogPort {
  write(line: string): void;
}

export type LogEvent =
  | 'unexpected_error'
  | 'generation_model_failed'
  | 'generation_model_disabled'
  | 'review_key_missing'
  | 'review_model_disabled'
  | 'server_started';

/** A request path that is not a route is logged as `other`, so a path never reaches the log. */
export type LogRoute = '/analyze' | '/generate' | 'other';

/** What a line may carry. A body, brief, reply text, key or exception message has no field here. */
export interface LogEntry {
  event: LogEvent;
  route?: LogRoute;
  status?: number;
  error?: string;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function routeOf(path: string): LogRoute {
  return path === '/analyze' || path === '/generate' ? path : 'other';
}

/** The name of a thrown value, or `UnknownError` when it is not an Error. `formatLogLine` checks the name is an identifier. */
export function errorNameOf(value: unknown): string {
  return value instanceof Error ? value.name : 'UnknownError';
}

/** Builds `event=`, then `route=`, `status=` and `error=` when given. An error field that is not an identifier is logged as `UnknownError`. */
export function formatLogLine({ event, route, status, error }: LogEntry): string {
  const parts = [`event=${event}`];
  if (route !== undefined) parts.push(`route=${route}`);
  if (status !== undefined) parts.push(`status=${status}`);
  if (error !== undefined) parts.push(`error=${IDENTIFIER.test(error) ? error : 'UnknownError'}`);
  return parts.join(' ');
}
