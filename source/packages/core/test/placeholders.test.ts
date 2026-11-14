import { describe, expect, it } from 'vitest';
import { projectValues, renderPlaceholders, TemplateError } from '../src/index.js';
import { baseConfig } from './fixtures.js';

describe('F-02 T010 placeholder values', () => {
  const values = projectValues(baseConfig({ codeRules: ['No any at boundaries'], architecture: { style: 'layered', modules: [{ name: 'core', layer: 0, responsibility: 'Domain', dependsOn: [] }] } }));

  it('F-02 AC-024 known placeholders are replaced with the project values', () => {
    expect(renderPlaceholders('{{projectName}}: {{stack.language}} / {{stack.testFramework}}', values, 't.md')).toBe('Demo project: TypeScript / Vitest');
  });

  it('F-02 AC-024 list placeholders render as bullets and modules as lines', () => {
    expect(renderPlaceholders('{{codeRules}}', values, 't.md')).toBe('- No any at boundaries');
    expect(renderPlaceholders('{{modules}}', values, 't.md')).toBe('- core (layer 0): Domain; depends on: none');
  });

  it('F-02 AC-024 a placeholder with no value, used by the template, is refused', () => {
    expect(() => renderPlaceholders('framework: {{stack.framework}}', values, 'steps/plan/command.md')).toThrow(TemplateError);
    expect(() => renderPlaceholders('framework: {{stack.framework}}', values, 'steps/plan/command.md')).toThrow(
      'steps/plan/command.md: placeholder "{{stack.framework}}" has no value',
    );
  });

  it('F-02 AC-026 an unknown placeholder is refused, naming the template', () => {
    expect(() => renderPlaceholders('{{nope}}', values, 'x.md')).toThrow('x.md: unknown placeholder "{{nope}}"');
  });

  it('F-02 AC-027 a value that contains placeholder text is inserted literally', () => {
    const literal = projectValues(baseConfig({ idea: 'Write {{projectName}} in the idea.' }));
    expect(renderPlaceholders('{{idea}}', literal, 't.md')).toBe('Write {{projectName}} in the idea.');
  });
});
