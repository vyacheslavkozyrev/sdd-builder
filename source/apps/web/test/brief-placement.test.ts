import { describe, expect, it } from 'vitest';
import type { ConfigProblem } from '@sddbuilder/core';
import { isShownBeside, messagesAt } from '../src/brief/placement.js';

describe('F-05 AC-010 AC-027 problem placement beside a field', () => {
  it.each<[string, boolean]>([
    ['name', true],
    ['stack.framework', true],
    ['architecture.modules', true],
    ['architecture.modules[0].name', true],
    ['architecture.modules[0].layer', true],
    ['architecture.modules[0].responsibility', false],
    ['architecture.modules[0].dependsOn[1]', false],
    ['workflows[0].steps[1].enabled', false],
  ])('routes %s beside a field: %s', (path, shown) => {
    expect(isShownBeside(path)).toBe(shown);
  });

  it('returns only the reasons at exactly that path, in order', () => {
    const problems: ConfigProblem[] = [
      { path: 'idea', reason: 'is required' },
      { path: 'architecture.modules[0].layer', reason: 'module 1 layer must be a whole number of 0 or more' },
      { path: 'idea', reason: 'must be at most 8,000 characters' },
    ];
    expect(messagesAt(problems, 'idea')).toEqual(['is required', 'must be at most 8,000 characters']);
    expect(messagesAt(problems, 'architecture.modules')).toEqual([]);
  });
});
