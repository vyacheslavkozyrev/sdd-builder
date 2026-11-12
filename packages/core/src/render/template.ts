import { checkNoStrayMarkers, renderConditionals, type StepScope } from './conditionals.js';
import { renderPlaceholders, type PlaceholderValues } from './placeholders.js';

export interface TemplateContext {
  values: PlaceholderValues;
  scope: StepScope;
  templatePath: string;
}

/**
 * Renders one template: conditional sections first, then a check for stray
 * markers, then placeholders in one pass. Values are inserted last and never
 * rendered again.
 */
export function renderTemplate(text: string, context: TemplateContext): string {
  const afterConditionals = renderConditionals(text, context.scope, context.templatePath);
  checkNoStrayMarkers(afterConditionals, context.templatePath);
  return renderPlaceholders(afterConditionals, context.values, context.templatePath);
}
