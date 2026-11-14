import { describe, expect, it } from 'vitest';
import { projectValues, renderConditionals, renderTemplate, TemplateError } from '../src/index.js';
import { baseConfig } from './fixtures.js';

const scope = { enabled: new Set(['implement', 'commit']), known: new Set(['implement', 'commit', 'e2e-tests', 'plan']) };
const values = projectValues(baseConfig());

describe('F-02 T011 conditional sections', () => {
  it('F-02 AC-025 keeps the content of an enabled step and drops the markers', () => {
    expect(renderConditionals('a{{#step:implement}}X{{/step:implement}}b', scope, 't.md')).toBe('aXb');
  });

  it('F-02 AC-025 removes the content, markers included, for a disabled or absent step', () => {
    expect(renderConditionals('a{{#step:e2e-tests}}X{{/step:e2e-tests}}b', scope, 't.md')).toBe('ab');
    expect(renderConditionals('a{{#step:plan}}X{{/step:plan}}b', scope, 't.md')).toBe('ab');
  });

  it('F-02 AC-026 a nested conditional is refused', () => {
    expect(() => renderConditionals('{{#step:implement}}{{#step:commit}}x{{/step:commit}}{{/step:implement}}', scope, 't.md')).toThrow(
      'nested conditional: "commit" opens inside "implement"',
    );
  });

  it('F-02 AC-026 an unclosed conditional is refused', () => {
    expect(() => renderConditionals('{{#step:implement}}x', scope, 't.md')).toThrow('unclosed conditional "implement"');
  });

  it('F-02 AC-026 a mismatched closing marker is refused', () => {
    expect(() => renderConditionals('{{#step:implement}}x{{/step:commit}}', scope, 't.md')).toThrow(
      'mismatched conditional: "implement" is closed by "commit"',
    );
  });

  it('F-02 AC-026 a closing marker with no opening marker is refused', () => {
    expect(() => renderConditionals('x{{/step:commit}}', scope, 't.md')).toThrow('closing marker for "commit" has no opening marker');
  });

  it('F-02 AC-026 a conditional naming an unknown step is refused', () => {
    expect(() => renderConditionals('{{#step:nope}}x{{/step:nope}}', scope, 't.md')).toThrow('conditional names unknown step "nope"');
  });

  it('F-02 AC-026 a malformed or unterminated marker never reaches the output', () => {
    expect(() => renderTemplate('{{ oops', { values, scope, templatePath: 't.md' })).toThrow(TemplateError);
    expect(() => renderTemplate('{{#step:nothing', { values, scope, templatePath: 't.md' })).toThrow(TemplateError);
  });

  it('F-02 AC-027 a value that contains placeholder text is inserted literally after the checks', () => {
    const literal = projectValues(baseConfig({ idea: 'Use {{#step:x}} in ideas.' }));
    expect(renderTemplate('{{idea}}', { values: literal, scope, templatePath: 't.md' })).toBe('Use {{#step:x}} in ideas.');
  });
});
