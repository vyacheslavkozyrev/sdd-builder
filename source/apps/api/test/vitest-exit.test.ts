import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const vitestBin = join(sourceDir, 'node_modules', 'vitest', 'vitest.mjs');

const failingTest = `import { expect, it } from 'vitest';

it('F-01 AC-009 fixture that always fails', () => {
  expect(1).toBe(2);
});
`;

describe('F-01 failing tests fail the run', () => {
  it('F-01 AC-009 a failing test makes vitest run exit non-zero', () => {
    expect(existsSync(vitestBin)).toBe(true);
    const fixture = mkdtempSync(join(tmpdir(), 'sddbuilder-f01-'));
    try {
      symlinkSync(join(sourceDir, 'node_modules'), join(fixture, 'node_modules'), 'dir');
      writeFileSync(join(fixture, 'fail.test.ts'), failingTest);

      // Drop the variables that Vitest sets for its own workers, so the child run starts clean.
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')),
      );
      const result = spawnSync(process.execPath, [vitestBin, 'run'], {
        cwd: fixture,
        env,
        encoding: 'utf8',
        timeout: 120_000,
      });

      expect(result.error).toBeUndefined();
      // Exit code 1 is Vitest's failed-tests code; a null status means the child was killed, which must not count as a pass.
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/1 failed/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }, 150_000);
});
