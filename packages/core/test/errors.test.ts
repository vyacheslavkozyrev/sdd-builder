import { describe, expect, it } from 'vitest';
import { InvalidConfigError, TemplateError, templateSourceFromRecord } from '../src/index.js';

describe('F-02 T004 errors and template source', () => {
  it('F-02 AC-011 InvalidConfigError carries every problem in one error', () => {
    const error = new InvalidConfigError(['duplicate id "plan"', 'unknown step "verfy"', 'cycle: a -> b -> a']);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidConfigError');
    expect(error.problems).toHaveLength(3);
    expect(error.message).toContain('3 problems');
    expect(error.message).toContain('duplicate id "plan"');
    expect(error.message).toContain('cycle: a -> b -> a');
  });

  it('F-02 AC-011 singular wording for one problem', () => {
    expect(new InvalidConfigError(['only one']).message).toContain('(1 problem)');
  });

  it('TemplateError names the template path', () => {
    const error = new TemplateError('templates/steps/plan/command.md', 'missing');
    expect(error.name).toBe('TemplateError');
    expect(error.templatePath).toBe('templates/steps/plan/command.md');
    expect(error.message).toBe('templates/steps/plan/command.md: missing');
  });

  it('a template source returns text for known paths and undefined otherwise', () => {
    const source = templateSourceFromRecord({ 'steps/plan/command.md': 'Plan it.' });
    expect(source.get('steps/plan/command.md')).toBe('Plan it.');
    expect(source.get('steps/nope/command.md')).toBeUndefined();
  });
});
