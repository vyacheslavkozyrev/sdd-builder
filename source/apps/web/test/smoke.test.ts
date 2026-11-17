import { describe, expect, it } from 'vitest';

describe('F-01 smoke', () => {
  it('F-01 AC-007 @sddbuilder/web entry module loads', async () => {
    const entry = await import('../src/index.js');
    expect(entry).toBeTypeOf('object');
  });
});
