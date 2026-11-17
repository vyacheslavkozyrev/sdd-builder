import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const defaultPath = resolve(sourceDir, 'templates', 'pipeline', 'default.json');

describe('F-02 AC-033 the exported default pipeline equals default.json', () => {
  it('F-02 AC-033 deep-equals the parsed content of templates/pipeline/default.json', () => {
    const fromFile: unknown = JSON.parse(readFileSync(defaultPath, 'utf8'));
    expect(defaultPipeline).toEqual(fromFile);
  });
});
