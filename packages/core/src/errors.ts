/**
 * A configuration the generator refuses. Carries every problem found,
 * not only the first, so the user can fix them in one pass.
 */
export class InvalidConfigError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid configuration (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`);
    this.name = 'InvalidConfigError';
    this.problems = [...problems];
  }
}

/** A template problem: a missing template, an unknown or unfilled placeholder, a broken marker. */
export class TemplateError extends Error {
  readonly templatePath: string;

  constructor(templatePath: string, message: string) {
    super(`${templatePath}: ${message}`);
    this.name = 'TemplateError';
    this.templatePath = templatePath;
  }
}

/** Generation failed on template problems. Carries every problem found across the outputs. */
export class GenerationError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Generation failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`);
    this.name = 'GenerationError';
    this.problems = [...problems];
  }
}
