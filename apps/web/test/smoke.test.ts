import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOWS } from '@sddbuilder/core';

describe('F-05 smoke', () => {
  it('F-05 smoke: the web workspace runs under Vitest and resolves @sddbuilder/core', () => {
    expect(DEFAULT_WORKFLOWS.length).toBeGreaterThan(0);
  });
});
