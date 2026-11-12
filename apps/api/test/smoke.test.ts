import { describe, expect, it } from 'vitest';
import { validateConfig } from '@sddbuilder/core';

describe('F-04 smoke', () => {
  it('F-04 smoke: the API workspace can import the core package', () => {
    expect(validateConfig).toBeTypeOf('function');
  });
});
