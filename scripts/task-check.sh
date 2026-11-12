#!/usr/bin/env bash
# Task-level check: type check and tests for the whole workspace.
# Run from anywhere; exits non-zero on the first failure.
# A script that is not configured yet is reported as a failure, never a pass.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> typecheck"
npm run typecheck

echo "==> test"
if npm pkg get scripts.test | grep -q '"test"'; then
  npm test
else
  echo "No 'test' script configured in package.json yet (added with F-02)." >&2
  exit 1
fi

echo "==> task check passed"
