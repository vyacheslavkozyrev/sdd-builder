# UX screens — Analyze and generate step (UI only) (F-13)

Feature entry: `spec/documents/features.md` → F-13. Rules: `spec/documents/ui.md` §1.3, §2 (step 4) and §6. Model: `spec/documents/architecture.md` §3 (the generated file tree) and §4 (the analysis result and its statuses).

Status: 11 screens (`01-` to `11-` in this folder, with `index.html`). Revised 2026-11-19 for owner decision (architecture decision 41): a failed analysis is an error; generation writes the file contents with the model. Drawn for owner review; not yet approved. Wireframes in SVG; the wording is a first draft. Revised 2026-11-24 to the F-13 stories (specification of 2026-11-24): screens 09 (422 problem list), 10 (out of date) and 11 (warning only) added.

Scope: step 4 of the wizard only. The left panel, footer note and caption come from the approved frame (F-07, F-08 screen 04). No code, no request, no data.

## Layout grid

Each SVG is 1280 × 800 (the reference size; no screen needed more height).

- **Left panel** x 0–260, as F-08 screen 04: wordmark, **New project**, the stepper with Project, Technical details and Workflow done and **Analyze and generate** current (step 4), **Prev** enabled at x 24–124 and **Next** disabled at x 136–236, y 728–768.
- **Content card** x 284–1256, y 24–728, white, 12 px radius. Inside it, 24 px padding: content x 308–1232, y 48–704.
- **Two columns** inside the card, 24 px apart:
  - **Analyze** column x 308–848 (540 px): heading at y 66; privacy notice at y 100–192; checkbox row at y 208; **Analyze** button x 308–428, y 240–280; the status note (amber, 44 px) at y 300–344 or the error (red, 44 px) at y 300–344; **Findings** label at y 320 (or 366 when a note sits above); finding rows 56 px high, 8 px apart.
  - **Project preview** column x 872–1232 (360 px): heading at y 66; the tree panel y 104–528 (scrolls); **Show full tree** x 872–1232, y 544–580; **Generate and download** y 604–644 (screen 08: pending label, progress line at y 654–658); its reason line at y 664; the note "Contents are written by the model when you generate." at y 684.
- **Footer note** inside the grey area, baseline y 766: "The work is not saved. It is lost when the browser is refreshed."; caption at x 1256, anchored right: "F-13 · screen N · step 4 of 4 · 1280 × 800".
- **Dialog** (screen 06) centred on the content area (x 470–1070, y 110–690, centre x 770), dimming the whole screen, left panel and footer included.

## Screens

| # | File | State | What it shows |
|---|---|---|---|
| 01 | `01-privacy-analyze-disabled.svg` | Before any analysis | Checkbox unticked; Analyze disabled, reason "Tick the box to analyse"; "No analysis has run on this brief yet."; Generate and download disabled, reason "Run Analyze first" |
| 02 | `02-privacy-ticked.svg` | Box ticked | Analyze enabled (primary); no findings yet; Generate disabled, reason "Run Analyze first" |
| 03 | `03-analysis-blocker-warning-info.svg` | Analysis with a blocker, a warning and an info | Three finding rows: Blocker (Brief · Idea), Warning (Technical details · Rules), Info (Flow · verify), each with subject and message; result line; Generate disabled, reason "Fix the blocker to generate" |
| 04 | `04-analysis-info-only.svg` | Only info findings | Two info rows; result "no blocker and no warning" in success green; Generate enabled (primary) |
| 05 | `05-analysis-failed.svg` | Analysis failed (an error) | Amber note "The analysis did not finish. Analyze again."; one structural info finding kept; Generate disabled, reason "Analysis failed. Analyze again to generate." |
| 06 | `06-project-files-expanded.svg` | Full file list | Dialog "Project files" over the step: the full tree (31 rows) in a scrollable panel, rule files marked; Close |
| 07 | `07-analysis-error-500.svg` | Service error | Red text "Analysis could not run (500): the service returned an error. Try again later."; checkbox still ticked; Analyze enabled; Generate disabled, reason "Run Analyze first"; the preview lists 21 files as the app renders them |
| 08 | `08-generate-pending.svg` | Generate pending | Generate and download reads "Writing the files with the model…" with a progress line under it; Analyze, the checkbox and Show full tree disabled; the file list still visible |
| 09 | `09-analysis-422-problems.svg` | Configuration over a limit (422) | Error "Analysis could not run (422): the configuration is over a limit." with one line per problem (idea, architecture, rules); Analyze enabled; values kept |
| 10 | `10-analysis-out-of-date.svg` | Analysis out of date | Amber note "The project changed since the last analysis. Analyze again."; earlier finding shown as not current; Generate and download disabled, reason Run Analyze first |
| 11 | `11-analysis-warning-only.svg` | Warning only | Finding row "Warning · Technical details · Rules" with its message; result line says a warning is present; Generate and download disabled, reason "Fix the warning to generate" |

## The file tree (preview)

The tree is the generated project for the default pipeline, with the user's rule files. It is computed in the browser; the sample lists 23 files:

- `.claude/agents/`: commit, complete, implement, plan, review, specify, test, ux, verify (one per Agent block).
- `.claude/commands/`: build, complete, pipeline, plan, specify, ux, verify (`pipeline.md` and one per flow).
- `.claude/rules/`: general.md, typescript.md (sample rule files, marked "rule").
- `CLAUDE.md`.
- `spec/documents/process.md`.
- `spec/specifications/F-00-template/`: plan.md, progress.md, stories.md.

Folders are listed first in code-point order, as the generator sorts the files (`architecture.md` §3; `source/templates/README.md`). Files are shown in monospace.

## Decisions these screens take

1. **Two columns on the step.** Analyze (the privacy notice, the checkbox, Analyze and the findings) is on the left; the project preview (tree, expand, Generate and download) is on the right. Both sit in one card, so the step fits 800 px without scrolling. The order follows the flow: privacy, then analysis, then generation. The right column stays at the same place in every state.
2. **Disabled controls keep a visible reason beside them** (AC of `ui.md` §2 and the F-11 rule). Analyze gives "Tick the box to analyse"; Generate gives "Run Analyze first", "Fix the blocker to generate" or "Analysis failed. Analyze again to generate." (changed 2026-11-24: this is the reason drawn on screen 05 and in the plan; the earlier sentence "The review did not run. Analyze again later." is withdrawn). The reason is grey text, so it does not look like an error.
3. **Green means "run and no blocker or warning"** (`ui.md` §2, D8). A failed analysis is an error (owner decision, architecture decision 41): Generate stays disabled even when the structural checks are clean, and the note asks the user to Analyze again (screen 05). The line "Result: no blocker and no warning" appears only on a complete analysis.
4. **Severity has a text pill and a colour.** Blocker: red text (#BB241A) on #FEF3F2. Warning: amber text (#B84D05) on #FFFAEA. Info: grey text (#636B74) on #F0F4F8. The word carries the meaning, so colour is not the only cue.
5. **The privacy notice is a grey box, not amber.** Amber is kept for warnings and for the review note on screen 05, so the notice does not look like a finding.
6. **Errors are text in a red box and keep the values.** The checkbox stays ticked and Analyze stays enabled, so the user can try again without re-entering anything (`ui.md` §2).
7. **The tree panel scrolls in the column and in the dialog.** The column shows about 20 rows and a thumb on its right edge; the dialog shows about 21 rows. Rows cut at the bottom edge are the scroll cue.
8. **Rule files are marked with a small "rule" tag** in violet on a pale violet pill, so the user can see what came from their own rule blocks (`ui.md` §2).
9. **"Show full tree" opens a dialog, not a new page.** It follows the F-11 dialog rule: centred on the content area, dimming the screen.
10. **The sample findings are plain and short** and map to the structural rules (`architecture.md` §4): a blank idea is a blocker; an empty rules list is a warning; a flow with approval and no check, a missing model and a missing check on a flow are info.

## Open points

1. **Privacy notice wording.** Decided 2026-11-24 (owner): the notice says "the model provider", as AC-004 requires. Screens 01, 02, 07 and 09 to 11 carry the wording "Analyze sends the brief and the pipeline to the model provider for review." The server does not store or log the brief.
2. **File-tree contents.** The sample lists the default pipeline's 9 agents, 7 commands and 2 sample rule files. The owner should confirm: (a) the agent names; (b) whether `spec/` shows the F-00 template folder or the spec folder only; (c) whether `.claude/rules/` shows the sample names or the user's own; (d) whether the tree shows the file count in the heading (drawn as "23 files").
4. **Analysis out of date.** Drawn as screen 10: the note "The project changed since the last analysis. Analyze again.", the earlier result shown as not current, and Generate disabled with the reason Run Analyze first. Owner to confirm: keep the earlier result visible (greyed), or hide it.
5. **Analyze while pending.** `ui.md` §2 says Analyze is disabled while the request is pending. No pending screen is drawn for Analyze; only Generate has one (screen 08). A spinner or a text for Analyze is not decided.
6. **Error wording for other codes.** Drawn: 500 (screen 07, the pattern for every error reply and the network failure, and the 404 shown during the device check) and 422 (screen 09, one line per problem). The 429 wording is no longer drawn; it is covered by the automated test for AC-012. Not yet drawn or written: 400, 500, 502 and the network failure sentence. Owner to confirm the sentences.
7. **Preview on a blank or invalid brief.** The structural blockers show in Findings only; the tree is still drawn. Owner to confirm the tree is shown even when a blocker exists (the draft says yes).
8. **Caption and screen count.** Eight screens are drawn; the caption uses "screen N" as F-11 does.
9. **Generate pending and the contents.** Screen 08 shows the file list while the model writes the contents. The wording "Writing the files with the model…" and the note "Contents are written by the model when you generate." are drafts. Owner to confirm, and whether the list should show each file as it is written.

## Checks

| Check | Result |
|---|---|
| XML: all seven SVGs pass `xmllint --noout` | Pass |
| Render: each SVG rendered in headless Chrome at 1280 × 800 into the scratchpad (`f13/`) | Pass. No height change was needed |
| Text fit: finding rows, the privacy notice, notes, the reasons, the tree rows and the dialog | Fit. The longest line (the 429 error, the result line on screen 03) ends inside its box |
| Colour: the red, amber and green texts are set as inline styles; the stylesheet's text colour would otherwise override them | Fixed after the first render (screens 03, 04, 05, 07) |
| Grid: card at x 284–1256, y 24–728; columns at x 308–848 and x 872–1232; buttons 8 px radius; 24 px between sections | Pass |
| States: each screen has one state in the table; Generate is enabled only on 04 and 06 | Pass |
| Revision 2026-11-19: screen 05 wording, the preview note on every screen, and screen 08 (pending). Render checked for 05 and 08; the overlapping checkbox on 08 was fixed by drawing the privacy box first | Pass |

## Owner decisions applied (2026-11-19)

- Inline error text (screens 05 and 07) is 11 px, #BB241A, in the error box; it was 13 px.
- Danger colour #BB241A (redOrange 700) for the Blocker text.
- Screen 06 (project files) stays a list dialog, 600 px wide, one Close button; its size is unchanged.

## Story coverage (criteria of `stories.md`)

| Criterion | Screen(s) or how it is shown |
|---|---|
| AC-001, AC-002, AC-004 | 01 (unticked, Analyze disabled, notice text); 02 (ticked, Analyze enabled) |
| AC-003 | 01 (Analyze disabled with its reason; no request is sent while unticked) |
| AC-005 | 02 (Analyze enabled, the request it sends is the configuration; not visible otherwise) |
| AC-006 | 08 (Analyze disabled while a request is pending; the same disabled control) |
| AC-007, AC-008 | 03, 04 (severity, subject, message; structural then review order) |
| AC-009 | 05 (failed review: error note, structural finding kept, Generate disabled) |
| AC-010, AC-013, AC-028, AC-031 | 07 (error pattern: text, values kept; the 404 shown during the device check uses this pattern) |
| AC-011, AC-029 | 09 (422, one line per problem) |
| AC-012 | not drawn since the 2026-11-24 render; the 429 wording is an automated test (owner to decide whether to draw it again) |
| AC-014 | no separate state; a new result replaces 03, 04, 05 or 11 |
| AC-015, AC-016 | 04 (green, result line, Generate enabled) |
| AC-017 | 01 (Run Analyze first, Tick the box), 03 (Fix the blocker), 11 (Fix the warning), 05 (Analysis failed), 07 (error, Run Analyze first) |
| AC-018, AC-019 | 10 (out of date) |
| AC-020 | the footer note on every screen (nothing is saved) |
| AC-021, AC-022, AC-024 | the tree on every screen (rule files tagged on 07 and 06); AC-024 has no separate state |
| AC-023 | 06 (full list in the dialog); 01 (Show full tree control) |
| AC-025 | 03, 04 (Generate enabled only on 04) |
| AC-026 | 08 (pending) |
| AC-027 | no visual state; the saved file name is an automated test |
| AC-030 | device: all screens at 1280 × 800; 04 is the reference |
| AC-031 | device: the 07 pattern in a running browser |

## Reviews

- Usability review (`usability` agent): skipped at the owner's request on 2026-11-24. The screens were rendered and checked by the owner. A run that had started was stopped before it changed any file.
- Visual review (`visual` agent): skipped at the owner's request on 2026-11-24, for the same reason.
- XML: all 11 SVGs pass `xmllint --noout`.
- Coverage: the story coverage table above lists every criterion of `stories.md`.

## Render alignment (2026-11-24)

Screen 07 was redrawn to match the app as rendered: the 500 error text, the 21-file tree of the default project (no rule files, folders first on each level, CLAUDE.md after spec/). Screens 01 to 06 and 08 to 11 still show the 23-file sample tree with two rule files; they match the app once the same change is applied to them.
