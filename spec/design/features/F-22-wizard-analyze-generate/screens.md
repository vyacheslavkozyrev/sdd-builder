# UX screens — Project wizard step 4: analyze and generate (F-22)

Scope: step 4 of the wizard, the last step. The frame, the stepper and Back are F-05's (`spec/design/features/F-05-project-brief-form/`); step 4 has no Next. Desktop, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

Stories: `spec/specifications/F-22-wizard-analyze-generate/stories.md` (15 criteria).

## Layout grid

Shared with F-05 and F-21: top bar 0–56; stepper; card x 40–1240, y 152–776; content x 72–1208, y 248–684; footer divider y 700; footer buttons y 716–756. Back at the footer's left edge; the action at its right edge. Step 4 is numbered in order: 1 Analyze, 2 Generate, 3 Files.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-analyze-generate.svg` | 1 Analyze: brief summary, privacy notice, checkbox ticked, Analyze, findings as plain text. 2 Generate: Generate enabled, with the reason. 3 Files: the tree, rule files marked. Footer: Download zip disabled, with the reason | AC-001, AC-002, AC-003, AC-007, AC-008, AC-009, AC-012, AC-015 | Analysis with a warning and no blocker: Generate enabled; tree shown before Generate; Download zip disabled until generated |
| 02 | `02-analyze-states.svg` | Left: checkbox not ticked, Analyze disabled with the reason; a refused brief (422) listing every problem by path. Right: last analysis with the review skipped; analysis out of date after an edit, so Generate and Download zip are disabled | AC-001, AC-004, AC-005, AC-006, AC-014 | Checkbox not ticked; refusal listing paths; review skipped; out of date |
| 03 | `03-generate-states.svg` | Left: a blocker finding with its path and the fix; Generate disabled with the reason; a failed Generate (429) with its message. Right: generating (one request, Generate off); generated (the zip name, what it holds, Generate again). Footer: Download zip enabled | AC-007, AC-010, AC-011, AC-013, AC-014 | Blocked; failed (429); generating; generated |

Criteria with no screen are not visual: AC-002 (request body), AC-012 (zip paths) and the rest are checked by tests.

## Colours

Rule-file chips (`from rule: …`) are violet (`#8b5cf6`), so that approval gates in the Map tab (F-05, screen 02) keep orange. Decided by the owner on 2026-11-15.

## Decisions these screens take

1. **Generate waits for an analysis** with no blockers. Warnings do not block it. Any edit makes the analysis out of date.
2. **Download zip** is enabled only after a successful Generate, and the zip holds exactly the tree shown. The tree comes from the plan, shown before Generate.
3. **Findings** are plain text, as the analyzer returns them, with no links to steps.
4. **Privacy notice on step 4 only**, with a checkbox that must be ticked before Analyze.

## Open points for the owner

- **A. The 422 on 02.** A 422 at Analyze comes only from the input caps, which the form already enforces. Keep the refusal as the API error display, add a help note, or drop it from this screen?
- **C. Tree names.** The tree on 01 shows `spec/documents/` and `specifications/F-00-template/` in the generated project. Confirm with F-03 that the generator emits these names, and that generated files do not refer to SDDBuilder's own files.
- **D. The 429 message.** It sits under the Analyze column on 03. Move it under Generate, or keep it?
