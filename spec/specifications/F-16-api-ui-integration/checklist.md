# Manual Checklist — API and UI integration (F-16)

Owner's end-to-end check in a browser with a real provider key. Each item: run the steps, compare with the expected result, then mark Pass or Fail.

Setup (once, from the repository root): `cd source && npm install`.
Terminal A starts the API: `cd source/apps/api && npm start` (API on port 3000 unless `PORT` is set).
Terminal B starts the dev server: `cd source/apps/web && npm run dev` (Vite prints its URL, normally `http://localhost:5173`).
Use the same terminal for each API start: set `ANTHROPIC_API_KEY=<your key>` in Terminal A before `npm start` when the item says "with the key", and leave it unset when the item says "without the key".

---

### 1. AC-005 — Analyze with the key shows the API's findings `[device]`

1. In Terminal A, run `ANTHROPIC_API_KEY=<your key> npm start` in `source/apps/api`. Wait for the start message.
2. In Terminal B, run `npm run dev` in `source/apps/web`. Open the URL Vite prints.
3. Fill in all four wizard steps of the brief with a valid project description.
4. Open the analyze step and press Analyze.
5. Observe: the structural findings appear first, then the review findings. Each finding has text from the API.
6. Observe: no text reading "not found" appears anywhere on the page.

Expected: the findings list shows the structural findings followed by the review findings, both from the running API; no "not found" text.

Result: [ ] Pass  [ ] Fail  Notes:

---

### 2. AC-006 — Without the key, Analyze shows structural findings and the "did not finish" note `[device]`

1. Stop the API (Ctrl+C in Terminal A).
2. Start it again without the key: `npm start` in `source/apps/api` with `ANTHROPIC_API_KEY` unset (run `unset ANTHROPIC_API_KEY` first in that terminal).
3. Keep the dev server from item 1 running. Reload the browser page and fill in the brief again.
4. Open the analyze step and press Analyze.
5. Observe: the structural findings are shown.
6. Observe: the "did not finish" note (F-13 AC-009) is shown beside the review part.
7. Observe: the Generate button is disabled and its reason is shown next to it.

Expected: structural findings shown; "did not finish" note shown; Generate disabled with a visible reason.

Result: [ ] Pass  [ ] Fail  Notes:

---

### 3. AC-007 — Generate with a green analysis downloads the zip `[device]`

1. Restart the API with `ANTHROPIC_API_KEY` set (as in item 1).
2. In the browser, fill in the brief and press Analyze until the result is green (no blocking findings).
3. Press Generate.
4. Press Download when it appears.
5. Observe: the browser saves a file named `sddbuilder-project.zip` to the downloads folder.

Expected: the browser saves `sddbuilder-project.zip` through its download.

Result: [ ] Pass  [ ] Fail  Notes:

---

### 4. AC-008 — The saved zip matches the project preview `[device]`

1. Use the zip saved in item 3. Before unpacking, open the project preview (the file tree) in the browser and write down the file list in order.
2. Unzip `sddbuilder-project.zip` into an empty new folder (for example `~/Desktop/f16-check`).
3. Compare the unpacked file list with the list from step 1: same files, same order, same paths.
4. Open each file in a text editor and check it has text. Note any file that is empty.

Expected: the unpacked files and paths are the same as the preview, in the same order; every file has text (none empty).

Result: [ ] Pass  [ ] Fail  Notes:

---

### 5. AC-009 — With the API stopped, Analyze shows a network error and keeps the values `[device]`

1. Fill in the brief in the browser (note two or three values you typed).
2. Stop the API (Ctrl+C in Terminal A). Leave the dev server running.
3. Press Analyze.
4. Observe: a network error message appears as text beside the Analyze control (F-13 AC-010). The page does not go blank.
5. Observe: the values you typed in step 1 are still in their fields.
6. Start the API again and reload nothing; press Analyze once more and confirm it works.

Expected: a network error shown as text beside Analyze; the typed values are unchanged; Analyze works again once the API is back.

Result: [ ] Pass  [ ] Fail  Notes:

---

### 6. AC-010 — The owner checks the generated process against the brief `[device]`

1. With the API running with the key and the dev server running, fill in a brief you know well (a real project you own).
2. Press Analyze until the result is green.
3. Press Generate and Download, then unpack the zip.
4. Read the generated process (the commands and blocks it describes) against your brief. Check that each step you asked for is there and that nothing you did not ask for was added.
5. Write a one-line judgement below: what matches, and anything that does not.

Expected: the process the generated project describes matches the brief, in the owner's judgement.

Judgement (owner): ______________________________________________

Result: [ ] Pass  [ ] Fail  Notes:

---

## Status

| Item | Criterion | Result |
| ---- | --------- | ------ |
| 1 | AC-005 | pending |
| 2 | AC-006 | pending |
| 3 | AC-007 | pending |
| 4 | AC-008 | pending |
| 5 | AC-009 | pending |
| 6 | AC-010 | pending |
