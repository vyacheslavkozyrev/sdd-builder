import type { ProjectConfig } from '../model.js';
import { TemplateError } from '../errors.js';

/** Values available to templates, by placeholder name. Undefined means no value. */
export type PlaceholderValues = Readonly<Record<string, string | undefined>>;

/** The project placeholders listed in templates/README.md. */
export function projectValues(config: ProjectConfig): PlaceholderValues {
  return {
    projectName: config.name,
    idea: config.idea,
    'stack.language': config.stack.language,
    'stack.framework': config.stack.framework,
    'stack.testFramework': config.stack.testFramework,
    modules: config.architecture.modules
      .map((m) => `- ${m.name} (layer ${m.layer}): ${m.responsibility}; depends on: ${m.dependsOn.join(', ') || 'none'}`)
      .join('\n'),
    codeRules: config.codeRules.map((r) => `- ${r}`).join('\n'),
    testRules: config.testRules.map((r) => `- ${r}`).join('\n'),
  };
}

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z.]*)\s*\}\}/g;

/**
 * Replaces `{{name}}` in one pass over the template text. Values are inserted
 * as they are and never scanned again (AC-027). A name that is unknown, or a
 * known name with no value, fails with a TemplateError naming the template.
 */
export function renderPlaceholders(text: string, values: PlaceholderValues, templatePath: string): string {
  return text.replace(PLACEHOLDER, (_match, name: string) => {
    if (!(name in values)) {
      throw new TemplateError(templatePath, `unknown placeholder "{{${name}}}"`);
    }
    const value = values[name];
    if (value === undefined) {
      throw new TemplateError(templatePath, `placeholder "{{${name}}}" has no value`);
    }
    return value;
  });
}
