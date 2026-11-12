/**
 * Supplies template text by path. The generator is given one, so it does no
 * file I/O itself. Tests use fixtures; the Claude Code templates come with F-03.
 */
export interface TemplateSource {
  /** Returns the template text for a path, or undefined when there is none. */
  get(path: string): string | undefined;
}

/** A template source backed by an in-memory record of path → text. */
export function templateSourceFromRecord(files: Readonly<Record<string, string>>): TemplateSource {
  const map = new Map(Object.entries(files));
  return {
    get: (path: string) => map.get(path),
  };
}
