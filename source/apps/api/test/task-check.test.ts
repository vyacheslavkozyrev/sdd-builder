import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const scriptPath = join(sourceDir, 'scripts', 'task-check.sh');

// A fake npm: it logs every call, fails typecheck or test on demand, and hands `npm pkg` to the real npm.
const fakeNpm = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_NPM_LOG"
if [ "$1" = "pkg" ]; then
  exec "$REAL_NPM" "$@"
fi
if [ "$1" = "run" ] && [ "$2" = "typecheck" ] && [ -n "$FAKE_FAIL_TYPECHECK" ]; then
  echo "error TS1: fake typecheck failure" >&2
  exit 1
fi
if [ "$1" = "test" ] && [ -n "$FAKE_FAIL_TEST" ]; then
  echo "FAIL fake.test.ts > fake case: 1 failed" >&2
  exit 1
fi
echo "fake $*"
exit 0
`;

function findOnPath(name: string): string {
  for (const dir of (process.env['PATH'] ?? '').split(delimiter)) {
    if (dir === '') continue;
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`${name} not found on PATH`);
}

interface Fixture {
  root: string;
  log: string;
}

function makeFixture(scripts: Record<string, string>): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'sddbuilder-f01-task-check-'));
  mkdirSync(join(root, 'scripts'));
  copyFileSync(scriptPath, join(root, 'scripts', 'task-check.sh'));
  chmodSync(join(root, 'scripts', 'task-check.sh'), 0o755);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true, scripts }));
  const binDir = join(root, 'bin');
  mkdirSync(binDir);
  writeFileSync(join(binDir, 'npm'), fakeNpm);
  chmodSync(join(binDir, 'npm'), 0o755);
  return { root, log: join(root, 'npm.log') };
}

function runCheck(fixture: Fixture, failures: { typecheck?: boolean; test?: boolean } = {}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${join(fixture.root, 'bin')}${delimiter}${process.env['PATH'] ?? ''}`,
    FAKE_NPM_LOG: fixture.log,
    REAL_NPM: findOnPath('npm'),
  };
  delete env['FAKE_FAIL_TYPECHECK'];
  delete env['FAKE_FAIL_TEST'];
  if (failures.typecheck) env['FAKE_FAIL_TYPECHECK'] = '1';
  if (failures.test) env['FAKE_FAIL_TEST'] = '1';
  return spawnSync('bash', [join(fixture.root, 'scripts', 'task-check.sh')], {
    cwd: fixture.root,
    env,
    encoding: 'utf8',
    timeout: 60_000,
  });
}

function calls(fixture: Fixture): string[] {
  return existsSync(fixture.log) ? readFileSync(fixture.log, 'utf8').trim().split('\n') : [];
}

const passingScripts = { typecheck: 'tsc', test: 'vitest run' };

describe('F-01 task check script', () => {
  it('F-01 AC-010 runs typecheck, then tests, prints the pass line and exits 0', () => {
    const fixture = makeFixture(passingScripts);
    try {
      const result = runCheck(fixture);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('task check passed');
      expect(calls(fixture)).toEqual(['run typecheck', 'pkg get scripts.test', 'test']);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('F-01 AC-011 a failing typecheck exits non-zero and does not run the tests', () => {
    const fixture = makeFixture(passingScripts);
    try {
      const result = runCheck(fixture, { typecheck: true });

      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('fake typecheck failure');
      expect(result.stdout).not.toContain('task check passed');
      expect(calls(fixture)).not.toContain('test');
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('F-01 AC-012 a failing test exits non-zero and prints the failing test output', () => {
    const fixture = makeFixture(passingScripts);
    try {
      const result = runCheck(fixture, { test: true });

      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('FAIL fake.test.ts > fake case: 1 failed');
      expect(result.stdout).not.toContain('task check passed');
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('F-01 AC-013 a missing root test script exits non-zero, names the script and never reports a pass', () => {
    const fixture = makeFixture({ typecheck: 'tsc' });
    try {
      const result = runCheck(fixture);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("'test' script");
      expect(result.stderr).not.toContain('F-02');
      expect(result.stdout).not.toContain('task check passed');
      expect(calls(fixture)).not.toContain('test');
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
