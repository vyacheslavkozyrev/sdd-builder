// The error of the generator (architecture.md §6, decision 23). It is thrown for a bug in the generator or in
// the templates (a placeholder with no value, two files with one path), never for a user's configuration: a
// configuration with a fault is refused as a finding before anything is rendered.

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}
