# Manual Checklist — Analyzer: structural checks and LLM review (F-04)

Criteria covered here: AC-021 `[device]` (the review with a real model provider on the reference process). All other criteria are `[auto]` and are covered by tests (see `progress.md`, Test Results).

This check is not automated, and it is not a pass until a person records a result below. It calls the real Anthropic API, so it costs a small amount and needs network access.

## Before you start

1. The repository is on `main` with a clean tree, and `npm install` has run.
2. An Anthropic API key is available. Export it in the shell only. Do not write it to a file, a log or a commit.
   `export ANTHROPIC_API_KEY=<your key>`
3. Optional: `export SDDBUILDER_ANALYZER_MODEL=<model id>`. When it is unset, the model is `claude-sonnet-5-5`.
4. There is no HTTP route yet (`POST /analyze` is F-07). Use a one-off script outside the repository, or a file you delete afterwards, that does the following:
   - Builds a `ProjectConfig` from the reference process: `DEFAULT_WORKFLOWS`, `DEFAULT_CONNECTIONS` and `DEFAULT_STEP_CATALOG` from `@sddbuilder/core` (`packages/core/src/catalog.ts`, building-blocks §4). Take the brief fields (name, idea, stack, modules, rules) from `sampleConfig` in `apps/api/test/analyze.test.ts`.
   - Calls `analyze(config, createAnthropicReviewModel(fromProcessEnv()))` from `apps/api/src/analyze.ts` and `apps/api/src/review/anthropic-model.ts`.
   - Also calls `analyzeStructure(config)` on the same config, and prints the JSON of both results.

## Check 1 — The review ran against the real provider

1. Run the script once.
2. Look at `review.status` in the printed result.
   - Expected: `ok`.
   - If it is `failed`, record a fail and paste the error line (it must not contain the key).

## Check 2 — The review names at least one real gap

1. Read each entry in `review.findings`.
2. Expected: at least one entry names a gap or contradiction that is really in the brief or the process. Examples: a gap in the idea, a rule that cannot be checked, a test rule that names a tool outside the stack, or a step the process seems to lack.
3. A made-up gap, or advice about something not in the brief or process, does not count.

## Check 3 — No review finding repeats a structural finding

1. Compare each entry in `review.findings` with each entry in `findings` (the structural list).
2. Expected: no review entry says the same problem about the same subject as a structural entry. Different wording of the same problem is a repeat.

## Check 4 — The review does not change the structure or the severity

1. Compare `findings` in the printed result with the output of `analyzeStructure(config)` on the same config.
2. Expected: the two lists are identical, in the same order.
3. Expected: every entry in `review.findings` has severity `warning` or `info`. None has `blocker`.
4. Expected: every entry in `review.findings` has a non-empty `subject` and `message`.

## Check 5 — No secret in the output

1. Search the printed output for the value of `ANTHROPIC_API_KEY`.
2. Expected: it is not present.

## Recording the result

Write the result under each check, and under the overall result at the bottom. Use `pass` or `fail`, the date, and the tester's name or initials. For a fail, say which check failed and what was printed (without the key). Then tell the caller, who collects the results and records AC-021 in `progress.md`.

- Check 1 result (pass / fail): pass (review.status ok on the live run, 2026-11-12)
- Check 2 result (pass / fail): pass (12 findings; they name real gaps: the one-sentence idea, React with no UI module, a non-testable codeRules rule, the disabled e2e loop, an undefined diff-size unit, and gates with unclear meaning)
- Check 3 result (pass / fail): pass (no finding restates the three structural retry warnings; review-clean and approve-plan findings are about who decides the gate, not the missing round limit)
- Check 4 result (pass / fail): pass (structure identical to analyzeStructure; review severities warning or info; subject and message non-empty)
- Check 5 result (pass / fail): pass (key value not in the printed output)
- Notes: three earlier live runs failed Check 1 before this pass. Causes found and fixed: the reply was cut off at the 2048-token limit (now 8192), and the review repeated structural findings (fixed by AC-022 and T016, see progress.md amendment).
- Tester and date: project owner (ran the script), 2026-11-12

### Overall AC-021 result (pass / fail): pass
