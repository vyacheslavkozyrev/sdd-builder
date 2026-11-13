# Manual checklist — API: analyze and generate, zip download (F-07)

Every `[device]` criterion of `stories.md` is confirmed here. Only AC-029 is `[device]`: it needs a real model provider call, so no automated test covers it.

## Before you start

- Node 20 or later, the repository at `main`, and `npm install` run once.
- A real Anthropic API key, set in the shell only. Never paste it into a file, a commit or a chat.
- The project has no TypeScript runner of its own. The commands below use `npx tsx`, which fetches the runner on first use.
- Sample configuration: `spec/specifications/F-07-api-and-zip-download/device-config.json` (the four default workflows and their connections, with `targets: ["claude"]`).

## AC-029 `[device]`: a real `/generate` call returns a usable Claude Code project

Steps:

1. Start the server in one terminal, from the repository root:

   ```
   ANTHROPIC_API_KEY=<your key> npx tsx apps/api/src/server.ts
   ```

   Expect one start-up line that contains `event=server_started` and no key value. The server listens on port 3000 unless `PORT` is set.

2. In a second terminal, from the repository root, send the sample configuration:

   ```
   curl -sS -D - -X POST http://localhost:3000/generate \
     -H 'content-type: application/json' \
     --data-binary @spec/specifications/F-07-api-and-zip-download/device-config.json \
     -o "$HOME/sddbuilder-project.zip"
   ```

   Expect `HTTP/1.1 200`, `content-type: application/zip` and `content-disposition: attachment; filename="sddbuilder-project.zip"`. The call may take a minute or more.

3. Unpack the zip into an empty folder:

   ```
   rm -rf "$HOME/sddbuilder-check" && mkdir -p "$HOME/sddbuilder-check" && unzip -q "$HOME/sddbuilder-project.zip" -d "$HOME/sddbuilder-check"
   ```

4. Check that the project is usable:

   - `CLAUDE.md` and `spec/documents/process.md` exist and read as project instructions, with no empty section.
   - Four workflow commands exist, one per enabled default workflow (Specify, Implement, Verify, Release), and each lists its steps in order.
   - The step files the workflows call exist (commands, agents, scripts and rule files), and each reads as a usable instruction.
   - The spec template folder `spec/specifications/F-00-template/` exists with `stories.md`, `plan.md` and `progress.md`.

5. Check that nothing refers to SDDBuilder:

   ```
   grep -ril "sddbuilder\|apps/web\|apps/api\|packages/core" "$HOME/sddbuilder-check" ; echo "matches: $?"
   ```

   Expect no matching file (`matches: 1`).

6. Check that no template placeholder was left in the text:

   ```
   grep -rn "{{" "$HOME/sddbuilder-check" ; echo "matches: $?"
   ```

   Expect no matching line (`matches: 1`).

7. Stop the server with Ctrl-C in the first terminal.

Pass: every step above gives the expected result.
Fail: any step gives a different result. Record which step, and what you saw.
Not run: the steps were not carried out.

## Result

Record the result in `progress.md` under Test Results. Do not write the key into any file.

| Criterion | Result | What happened |
|---|---|---|
| AC-029 `[device]` | passed (after T020) | First run failed at step 3 (502: zero-width spaces in the model's reply keys), fixed by T020. Re-run: step 2 returned 200 with the zip; the unpacked project had 20 files, no SDDBuilder reference and no `{{` placeholder; the user reviewed the files and confirmed the result (2026-11-13). |
