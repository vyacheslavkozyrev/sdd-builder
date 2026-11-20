// A programmer error of the generator (F-04): a layout names a value the renderer does not know, or
// two planned files share a path. It is thrown, never returned as a finding, and its message names
// the path of the file where it happened. A user's refusal is a finding, not this error.
export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}
