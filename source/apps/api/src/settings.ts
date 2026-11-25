// Settings read from the environment. The caller passes the environment in; this module never reads process.env,
// so every rule here is a pure function of the object it is given.

export interface Settings {
  readonly port: number;
  readonly analyzerModel: string;
  readonly apiKey: string | undefined;
}

export type Environment = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 3000;
const DEFAULT_ANALYZER_MODEL = 'claude-sonnet-5-5';
const MIN_PORT = 1;
const MAX_PORT = 65535;

function readPort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }
  const port = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Invalid PORT: expected a whole number from ${MIN_PORT} to ${MAX_PORT}`);
  }
  return port;
}

// A blank model or key (empty, or only spaces) counts as not set: it would otherwise be sent to the provider.
export function readSettings(env: Environment): Settings {
  const model = env.SDDBUILDER_ANALYZER_MODEL;
  const key = env.ANTHROPIC_API_KEY;
  return {
    port: readPort(env.PORT),
    analyzerModel: model === undefined || model.trim() === '' ? DEFAULT_ANALYZER_MODEL : model,
    apiKey: key === undefined || key.trim() === '' ? undefined : key,
  };
}
