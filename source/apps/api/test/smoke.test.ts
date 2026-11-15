import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';

describe('F-04 smoke', () => {
  it('F-04 smoke: the API workspace can import the core package', () => {
    expect(pipeline.configProblems).toBeTypeOf('function');
  });
});
