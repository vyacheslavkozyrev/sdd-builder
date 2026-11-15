/**
 * Supplies template text by path. The generator is given one, so it does no
 * file I/O itself. Tests use fixtures; the Claude Code templates come with F-03.
 */
export interface TemplateSource {
  /** Returns the template text for a path, or undefined when there is none. */
  get(path: string): string | undefined;
}

/**
 * A template source that can also list the paths it holds, so a folder of templates
 * (the spec template files, F-02 AC-018) is placed in full without naming each file in code.
 */
export interface ListableTemplateSource extends TemplateSource {
  /** Returns every template path the source holds. */
  paths(): readonly string[];
}

/** A template source backed by an in-memory record of path → text. */
export function templateSourceFromRecord(files: Readonly<Record<string, string>>): ListableTemplateSource {
  const map = new Map(Object.entries(files));
  return {
    get: (path: string) => map.get(path),
    paths: () => [...map.keys()],
  };
}
