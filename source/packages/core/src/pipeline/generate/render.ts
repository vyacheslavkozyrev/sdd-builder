// Fills the placeholders of one template text (source/templates/README.md, Placeholders). Every `{{name}}` is
// replaced in one pass from the value map; a value is inserted as written and is never rendered again, so a
// value that holds `{{...}}` text (a rule's text, for example) comes out unchanged. Pure: no file is read.

import { GenerationError } from './errors.js';

// The values of the placeholders, by placeholder name. A name is any text between the braces, dots included
// (`stack.language`).
export type PlaceholderValues = Readonly<Record<string, string>>;

const PLACEHOLDER = /\{\{([^{}]*)\}\}/g;

// Returns the text with every placeholder replaced by its value. A placeholder with no value throws
// GenerationError naming the placeholder and the file path: a template error, a programmer error. A name
// found only on the object's prototype (such as `constructor`) has no value.
export function renderText(path: string, text: string, values: PlaceholderValues): string {
  return text.replace(PLACEHOLDER, (_match, name: string) => {
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    if (value === undefined) {
      throw new GenerationError(`No value for the placeholder {{${name}}} in ${path}.`);
    }
    return value;
  });
}
