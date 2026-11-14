import { describe, expect, it } from 'vitest';
import defaultPipeline from '../../../templates/pipeline/default.json' with { type: 'json' };

describe('F-01 T002 build-time JSON import', () => {
  it('imports templates/pipeline/default.json as an object', () => {
    expect(typeof defaultPipeline).toBe('object');
    expect(defaultPipeline).not.toBeNull();
    expect(Array.isArray(defaultPipeline)).toBe(false);
  });
});
