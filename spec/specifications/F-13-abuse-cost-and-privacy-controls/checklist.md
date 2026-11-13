# Manual Checklist — Abuse, cost and privacy controls (F-13)

Covers the `[device]` criteria of `stories.md`. Only one exists: AC-029.

Each run spends one real review call and one real generation call from the in-memory daily ceilings (500 review and 50 generation per UTC day by default). Restarting the server resets them.

Start command: from `apps/api`, `npm start` (runs `vite-node src/server.ts`, added as a chore commit in F-13).

Keep the brief, the server log and the responses in a folder outside the repository. Do not paste the API key into any file that is committed.

---

## AC-029 — Real-key run: no brief text in the server console or the responses

**Before you start**

Use this sentinel brief. The four sentinels appear once each and are unlikely to occur anywhere else:

- project name: `PRIVACY-CHECK-NAME`
- idea text: `PRIVACY-CHECK-IDEA A small tool that tracks spec documents.`
- one module named `PRIVACY-CHECK-MODULE` (layer 0, no dependencies)
- one code rule: `PRIVACY-CHECK-RULE Keep the core free of I/O.`

Build `brief.json` from the `ProjectConfig` object in `apps/api/test/privacy-limits.test.ts` (the `config` constant), with those values put in place of the test sentinels. Keep `workflows` and `connections` as they are.

1. In a terminal, start the API with a real key from `apps/api`. Replace `<KEY>` with your key:
   `cd apps/api && ANTHROPIC_API_KEY=<KEY> PORT=3000 npm start 2>&1 | tee ~/sddbuilder-f13-server.log`
   - Expected: the console shows a `server_started` line. The key does not appear anywhere in the console.
2. In a second terminal, send the brief to `/analyze` and save the response:
   `curl -s -X POST http://localhost:3000/analyze -H 'content-type: application/json' --data @brief.json -o analyze-out.json -w '%{http_code}\n'`
   - Expected: prints `200`. The file `analyze-out.json` holds a JSON result with `review.status` `ok` or `failed`.
3. Check the response for the sentinels:
   `grep -c 'PRIVACY-CHECK' analyze-out.json`
   - Expected: prints `0`.
4. Send the same brief to `/generate` and save the response:
   `curl -s -X POST http://localhost:3000/generate -H 'content-type: application/json' --data @brief.json -o generate-out.zip -w '%{http_code}\n'`
   - Expected: prints `200` (a zip). If it prints `422`, `502` or `503`, write the code in the result line and go on; the check still applies.
   - Note: a successful zip contains framework text written from the brief, so it is not checked for sentinels here. The check on it is the console (step 6). The user confirmed this reading.
5. Send an error request with a sentinel in it, to check error bodies:
   `printf '{"idea":"PRIVACY-CHECK-IDEA not a config"' | curl -s -X POST http://localhost:3000/analyze -H 'content-type: application/json' --data-binary @- -o error-out.json -w '%{http_code}\n'`
   - Expected: prints `400`. Then `grep -c 'PRIVACY-CHECK' error-out.json` prints `0`.
6. Check the server console for every sentinel and for the key prefix. Stop the server with Ctrl-C first, then run:
   `grep -c -E 'PRIVACY-CHECK|sk-ant-' ~/sddbuilder-f13-server.log`
   - Expected: prints `0`.
7. Look at the console lines by eye. Each refusal or failure line should carry only the event name, the route and the status (or the error name). Example of the shape: `event=... route=/analyze status=...`. The client address must not appear.
   - Expected: no line carries brief text, a module name, a rule or a client address.

**Expected result overall:** every check above returns the expected value. The `/analyze` response, the step 5 error response and the console contain no `PRIVACY-CHECK` text and no key.

**Pass / fail:** Pass

**Tester / date / key used (say "a real key" only, never the key):** the project owner, 2026-11-13, a real key.

**Notes:**
- `/analyze` returned `200`; 0 sentinel matches in the response.
- `/generate` returned `502`: the model's reply failed the reply checks (structural, no brief text in the body). Per the checklist, a non-200 result is accepted and the check still applies; the body has no sentinel. The 502 itself is a separate product issue, recorded in progress.md Deferred Findings.
- Error request returned `400`; 0 sentinel matches in the response.
- `server.log`: 0 matches for `PRIVACY-CHECK` or `sk-ant-`; the only line is `event=server_started`, read by eye: no brief text, no client address.
