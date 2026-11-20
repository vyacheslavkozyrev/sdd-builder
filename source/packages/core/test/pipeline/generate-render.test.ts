import { describe, expect, it } from 'vitest';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';

const PATH = '.claude/commands/flow-plan.md';

describe('F-04 renderLayout', () => {
  it('F-04 AC-012 replaces each placeholder with its value from the values', () => {
    const layout = 'Flow {{flowId}}: {{flowName}}. Again {{flowId}}.';
    const values = { flowId: 'plan', flowName: 'Planning' };
    expect(renderLayout(layout, values, PATH)).toBe('Flow plan: Planning. Again plan.');
  });

  it('F-04 AC-012 returns a layout with no placeholder unchanged', () => {
    expect(renderLayout('No placeholder here.', {}, PATH)).toBe('No placeholder here.');
  });

  it('F-04 AC-013 throws a GenerationError naming the unknown placeholder and the path', () => {
    let caught: unknown;
    try {
      renderLayout('Hello {{missing}}', { flowId: 'plan' }, PATH);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GenerationError);
    expect((caught as Error).message).toContain('{{missing}}');
    expect((caught as Error).message).toContain(PATH);
  });

  it.each([
    ['a placeholder with spaces inside', 'x {{ flowId }} y', '{{ flowId }}'],
    ['a placeholder holding a brace', 'x {{a{b}}} y', '{{a{b}}'],
    ['an opening {{ before a valid placeholder', 'x {{ {{flowId}}', '{{ {{flowId}}'],
    ['an opening {{ with no closing }}', 'x {{ flowId', 'opening {{ with no closing }}'],
  ])('F-04 AC-013 throws a GenerationError for %s and never leaves it in the text', (_label, layout, fragment) => {
    let caught: unknown;
    try {
      renderLayout(layout, { flowId: 'plan' }, PATH);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GenerationError);
    expect((caught as Error).message).toContain(fragment);
    expect((caught as Error).message).toContain(PATH);
  });

  it('F-04 AC-012 substitutes an empty value as an empty text', () => {
    expect(renderLayout('a{{x}}b', { x: '' }, PATH)).toBe('ab');
  });

  it('F-04 AC-013 names the placeholder and the path in the message of a missing value', () => {
    expect(() => renderLayout('{{unknownName}}', {}, PATH)).toThrow(GenerationError);
    expect(() => renderLayout('{{unknownName}}', {}, PATH)).toThrow(`the layout of ${PATH} uses the placeholder {{unknownName}}, which has no value`);
  });

  it('F-04 AC-014 copies a value that holds placeholder text as written, without rendering it again', () => {
    const layout = 'Rule: {{ruleText}}';
    const values = { ruleText: 'Use {{flowId}} when {{other}} is set', flowId: 'plan' };
    expect(renderLayout(layout, values, PATH)).toBe('Rule: Use {{flowId}} when {{other}} is set');
  });

  it('F-04 AC-014 does not render a value that is itself a known placeholder name', () => {
    const layout = '{{a}}|{{b}}';
    const values = { a: '{{b}}', b: 'B' };
    expect(renderLayout(layout, values, PATH)).toBe('{{b}}|B');
  });

  it('F-04 AC-014 is deterministic: rendering twice gives the same text', () => {
    const layout = 'A {{x}} B {{y}}';
    const values = { x: '1', y: '2' };
    expect(renderLayout(layout, values, PATH)).toBe(renderLayout(layout, values, PATH));
  });
});
