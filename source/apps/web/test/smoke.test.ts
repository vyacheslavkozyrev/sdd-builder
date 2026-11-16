import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';

describe('F-05 smoke', () => {
  it('F-05 smoke: the web workspace runs under Vitest and resolves @sddbuilder/core', () => {
    expect(pipeline.defaultProjectConfig.pipeline.blocks.length).toBeGreaterThan(0);
  });
});
