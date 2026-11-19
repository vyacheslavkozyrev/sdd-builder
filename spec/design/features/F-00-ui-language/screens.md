# UI language reference (F-00)

Scope: the single reference for every UI element used in SDDBuilder. Future screens and cosmetic fixes take their values from here. It is a design reference, not a feature: it has no stories, no acceptance criteria and no application code.

Sheets (SVG, one per group): `01-palette.svg`, `02-type.svg`, `03-buttons.svg`, `04-inputs.svg`, `05-rows.svg`, `06-cards-tabs.svg`, `07-stepper-frame.svg`, `08-canvas.svg`, `09-notices.svg`, `10-dialogs.svg`, `11-lists-files.svg`. Gallery: `index.html`.

Source screens (the values were copied from these; the approved set as listed in the brief):

- F-07 `01-frame-desktop.svg` (frame)
- F-08 `01-step-project.svg` (stepper, empty state)
- F-09 `03-project-limit.svg` (fields, counter at limit, amber note)
- F-10 `01-technical-values.svg`, `04-rule-remove-confirm.svg` (fields, title row, rule block, dialog)
- F-11 `01-pipeline-default.svg`, `03-flow-properties.svg`, `04-delete-flow-confirm.svg`, `07-properties-refused.svg`, `08-connection-point-drag.svg` (tabs, rows, artifact block, check row, refused field, dialog, Delete flow)
- F-12 `01-flow-canvas.svg` (canvas, Start and End, Agent, Condition, arrows, toolbox)
- F-13 `03-analysis-blocker-warning-info.svg`, `08-generate-pending.svg` (status pills, findings, file tree, grey note, pending state)

Derived items (no approved screen shows them; built from the same tokens and marked as derived in the sheets): the top-centre error notice (09), the read-only field (04, from the unused `ro` class in F-12 01), the focus state (not drawn: no approved focus screen).

## Components and their sheet

| Component | Sheet | Source screen(s) |
|---|---|---|
| Palette: primary, tint, ring, white, page, ink, secondary, disabled, border, divider, done, done label, box, amber text and fill, error text and fill, danger, amber border, scrim | 01 | F-07 01, F-08 01, F-10 01, F-11 01, F-11 04, F-12 01, F-13 03 |
| Type scale: H5 24/500, brand 18/500, panel title 14/500, button 14/500, body 13/400, current step 13/500, label, help, footer, counter, error, pill, rule tag, file tree | 02 | as above |
| Primary, secondary, danger, disabled buttons (40 px high, radius 8) | 03 | F-07 01, F-10 01, F-11 03, F-13 03 |
| Prev and Next (100 × 40 at y 728) | 03, 07 | F-07 01, F-08 01, F-09 03, F-10 01, F-13 03 |
| Dialog pair (120 × 40) | 03, 10 | F-10 04, F-11 04 |
| Icon-only minus and plus (24 px) | 03, 05 | F-11 01, 03, 04, 07, 08, F-12 01 |
| Single-line field (40 px, radius 8, 1 px #CDD7E1) | 04 | F-09 03, F-10 01 |
| Text area with counter | 04 | F-09 03, F-11 01 (counter) |
| Dropdown (▾) | 04, 05 | F-11 01, F-12 01 |
| Checkbox (16 px, radius 3) | 04, 05 | F-11 03, 04, 08; F-13 03, 08 |
| Refused field and reason | 04 | F-11 07, F-12 01 |
| Read-only field (derived) | 04 | F-12 01 (class `ro`, not drawn) |
| Label above the field, help line, required mark | 04, 06 | F-09 03, F-10 01, F-11 01, F-13 03 |
| Argument row, dropdown row | 05 | F-11 01, 03, 04, 07, 08, F-12 01 |
| Title row with plus | 05 | F-11 01 (Arguments, Outcome artifacts), F-10 01 (Rule blocks) |
| Block title row with minus | 05 | F-10 01 (Rule block 1) |
| Rule tag (chip) | 05, 11 | F-13 03, 08 |
| Artifact block (label field + minus, template text area, help) | 05 | F-11 01, 03 |
| Check row (Checks (0), checkbox label) | 05 | F-11 03, 04, 08 |
| White card (12 px, 1 px #DDE7EE, shadow) | 06 | all screens |
| Tab row (32 px high) | 06 | F-11 01, 03, 04, 07, 08; F-12 01 |
| Grid (two 208 px columns, 16 px apart) | 06 | F-10 01 |
| Left panel 260 px, logo, New project | 07 | F-07 01 |
| Stepper: done, current, to do; connectors | 07 | F-08 01, F-10 01, F-11 01, F-13 03 |
| Footer note and caption | 07 | all screens |
| Start circle, End circle | 08 | F-12 01 |
| Agent box (normal, selected, blocked) | 08 | F-12 01; blocked: F-11 08 |
| Condition diamond, true and false labels | 08 | F-12 01 |
| Return arrow (dashed, round limit label) | 08 | F-12 01 |
| Plain arrow, selected arrow | 08 | F-12 01; F-11 02 |
| Floating toolbox | 08 | F-12 01 |
| Error notice (top centre) | 09 | derived; refused note style from F-11 08 |
| Amber note | 09 | F-09 03 |
| Grey note | 09 | F-13 03, 08 |
| Status pills (Blocker, Warning, Info) | 09, 11 | F-13 03, 08 |
| Empty state | 09 | F-07 01 (title), F-08 01 (icon) |
| Pending state (button and progress line) | 09 | F-13 08 |
| Compact confirmation dialog | 10 | F-10 04, F-11 04 |
| Findings list item | 11 | F-13 03 |
| File tree (monospace, folder and file rows) | 11 | F-13 03 |

## Values by source

Key values, copied from the source screens (where two screens differ the chosen value is in the differences list below):

- Colours: primary #635BFF (F-07 01, all); tint #ECF0FF (F-11 01, F-12 01, F-13 03); ring #DDE3FF 4 px (F-07 01); done #15B79F and done label #107569 (F-08 01, F-10 01); ink #32383E; secondary #636B74; disabled #9FA6AD; border #CDD7E1; divider #DDE7EE; page and disabled fill #F0F4F8; box #FBFCFE (F-11 01); error text #DE3024 (F-11 07, F-12 01); error fill #FEF3F2 (F-11 08, F-13 03); amber text #B84D05 and fill #FFFAEA (F-09 03, F-13 03); amber edge #FCD34D (F-09 03); scrim #32383E at 35% (F-10 04, F-11 04).
- Shadows: card 1 px, #32383E 12%, offset 1, blur 2 (F-07 01). Toolbox: offset 2, blur 4, 16% (F-12 01).
- Type: H5 24/500 (F-10 04); brand 18/500 (F-07 01); panel title 14/500 (F-10 01); button 14/500 (F-07 01); body 13/400 (F-09 03); current step 13/500 #635BFF (F-08 01); label 12/400 #636B74 (F-11 01, chosen); help 12/400 #636B74 (F-09 03, F-10 01); done label 12/500 #107569 (F-08 01); footer 12/400 (F-07 01); counter 11/400 #636B74 (F-11 01); counter at limit 12/500 #B84D05 (F-09 03); error 11/400 #DE3024 (F-11 07); pill 12/500 (F-13 03); rule tag 10/500 #635BFF (F-13 03); monospace 12 px (F-13 03).
- Layout: left panel 260 px, border at x 259 (F-07 01); logo 24 px, radius 6, at 24,24; New project 212 × 40 at 24,72 (F-07 01); stepper nodes at y 164, 228, 292, 356, node radius 12, current ring radius 18 (F-08 01); Prev 100 × 40 at 24,728 and Next at 136,728 (F-07 01); content card x 284 to 1256, y 24 to 728, radius 12 (F-07 01); content inset 24 px (F-10 01); footer note at x 284, y 766 (F-07 01); caption right edge 1256, 11 px (F-07 01).
- Fields: 40 px high, radius 8, 1 px #CDD7E1, text 13 px inset 12 px (F-09 03, F-10 01); two-column fields 208 px at x 308 and 532 (F-10 01); full width 924 px (F-09 03); side panel fields 224 px in a 272 px card at x 1008 (F-11 01).
- Dialog: 400 × 168 at 570,316, radius 12, 1 px #CDD7E1, title baseline 46 px below the top, muted line 76 px, buttons at 72 px and 208 px from the left edge, 104 px from the top (F-10 04).
- Canvas: Agent box 140 × 72, radius 8 (F-12 01); diamond half-diagonal 30 (F-12 01); Start and End radius 22 (F-12 01); toolbox 208 × 44 radius 10 (F-12 01).
- Pills: 76 × 20, radius 10 (F-13 03). Rule tag 44 × 16, radius 8 (F-13 03). Tab 32 px high, radius 8 (F-11 01). File row height 20 px, 16 px indent (F-13 03). Findings row 540 × 56, radius 8 (F-13 03).

## Spacing grid

- Base unit 8 px. Controls are 40 px high (24 px for icon-only buttons, 32 px for tabs, 28 px in one screen, see differences).
- Card padding: 24 px (F-10 01, F-09 03, F-11 01).
- Between sections: 24 px (F-10 01 Stack and Rule blocks).
- Footer gap: the footer note sits below the card at y 766 (card bottom 728, so 24 px to the text box top, baseline 766 in the sources).
- Label to field: label baseline 12 px above the field top (about 8 px of clear space). Field to next label: 32 px at the grid row gap (field bottom 144, next field top 176 in F-10 01).
- Button pair: 16 px apart. Tabs: 8 px apart.
- Stepper spacing: 64 px between node centres; connectors edge to edge (40 px long).
- Side panel: 24 px gutters inside the 260 px panel (logo at 24, New project 212 wide).
- Checkbox to label: 12 px.

## Differences between screens and the value chosen

Rule: where two or more screens use different values for the same element, the value used on the most screens is chosen. Ties are noted.

1. Danger button fill: #DE3024 (F-11 03, 04, 07, 08; the dialog in F-11 04) against #DE3024 (F-10 04 Remove, F-12 01 Delete block). Chosen: #DE3024 (4 screens against 2). Note: white on #DE3024 is 3.76:1, below the 4.5:1 needed for text; white on #DE3024 is 4.61:1. Owner decision needed (see below).
2. Danger button label size: 13 px (F-11 03, 04, 07, 08; F-12 01) against 14 px (F-10 04). Chosen: 13 px in the form footer. Dialog pair: 14 px (tie, F-10 04 and F-11 04 each one; chosen to match the other button labels).
3. Prev and Next label: 14 px (F-07 01, F-08 01, F-09 03, F-10 01 and 04, F-13 03 and 08: 7 screens) against 13 px (F-11 01, 03, 04, 07, 08 and F-12 01: 6 screens). Chosen: 14 px.
4. Field label: 12 px, weight 400, #636B74 (F-11 01, 03, 04, 07, 08 and F-12 01: 6 screens) against 12 px, weight 500, #32383E (F-09 03 and F-10 01: 2 screens). Chosen: 12 px 400 grey. Owner decision needed: this changes the look of the wizard screens F-09 and F-10, which use the dark 500 label.
5. Help line under a field: 12 px #636B74 (F-09 03, F-10 01, F-13 03 and 08: 4 screens) against 11 px (F-11 07 hint). The brief asks for 11 px. Chosen: 12 px.
6. Panel subtitle and hint: 11 px (F-11 01, 03, 04, 07, 08 and F-12 01: 6 screens) against 12 px (F-13 03 and 08: 2 screens). Chosen: 11 px.
7. Counter: 11 px #636B74 in its normal state (F-11 01, 03, 04, 07, 08: 5 screens). At its limit: 12 px 500 #B84D05 (F-09 03). Over the limit: 11 px #DE3024 (F-11 07). Chosen per state (three states, one size each). The brief asks for 11 px for all states; the at-limit state is 12 px in the approved screen.
8. Icon-only minus and plus: 24 px, radius 8, grey #CDD7E1 outline, 16 px glyph (F-11 01, 03, 04, 07, 08 and F-12 01: 6 screens) against 28 px, radius 6, primary outline with an 18 px plus (F-10 01: 1 screen). Chosen: 24 px. The brief asks for 28 px with a primary outline. Owner decision needed. The 28 px version is kept on 03-buttons.svg for comparison.
9. Stepper connectors: edge to edge (F-10 01, F-11 01, 03, 04, 07, 08, F-12 01, F-13 03 and 08: 9 screens) against inset 8 px at each end (F-07 01, F-08 01, F-09 03: 3 screens). Chosen: edge to edge.
10. Checkbox corner radius: 3 px (F-11, 5 screens) against 4 px (F-13 03 and 08). Chosen: 3 px.
11. Checkbox label size: 11 px (F-11 03, 04, 08: 3 screens) against 13 px (F-13 03 and 08: 2 screens). Chosen: 11 px.
12. Empty state title: 14 px 500 (F-07 01 centre title, 1 screen) against 16 px 500 (F-08 01, 1 screen). Tie. Chosen: 14 px, the panel title size from the type scale.
13. Amber note box: 12 px 500 #B84D05 on #FFFAEA with a 1 px #FCD34D edge and radius 6 (F-09 03) against 11 px regular, no edge, radius 8 (F-12 01 Draft note). Tie. Chosen: the F-09 style.
14. Dialog muted line: 13 px #636B74 (F-10 04) against 12 px (F-11 04). Tie. Chosen: 13 px, the body size.
15. Dialog scrim: 35% in both dialog screens (F-10 04, F-11 04). F-12 01 defines a 45% scrim class but draws no dialog. Chosen: 35%.
16. Refused field border: #DE3024 1.5 px (F-11 07 and F-12 01) against #DE3024 (defined in F-13 03 but not drawn). Chosen: #DE3024.
17. Tab text: unselected 12 px #32383E on white with a #DDE7EE edge, selected 13 px 500 white on #635BFF (the tab row in F-11 and F-12 01). No conflict; recorded for completeness.

## Open decisions for the owner

- Danger colour: #DE3024 (chosen by the rule, 4 screens) fails the 4.5:1 text contrast with white (3.76:1). #DE3024 passes (4.61:1). Either change the danger fill in the approved screens or accept the fail; the sheet records both.
- Field label: 12 px grey 400 (chosen by the rule) or 12 px dark 500 (F-09, F-10). The grey label passes contrast (5.40:1) but reads lighter than the wizard's current labels.
- Icon-only buttons: 24 px grey outline (chosen by the rule) or the 28 px primary-outline plus in the brief.
- The top-centre error notice, the read-only field and the focus state have no approved screen. Their look is derived from the tokens above and needs a screen if the owner wants them to be final.

## Contrast of the pairs used

See 01-palette.svg for the full table. Fails: white on #DE3024 (3.76:1, 14 px text), #DE3024 on #FEF3F2 (4.24:1, 11 px error text), #15B79F under the white check in the done node (2.53:1, graphic: needs 3:1). Passes: white on #635BFF (4.70:1), #107569 on white (5.57:1), #636B74 on white (5.40:1), #B84D05 on #FFFAEA (4.90:1), #DE3024 on white (4.61:1). The disabled pair #9FA6AD on #F0F4F8 (2.23:1) is exempt by the WCAG rules for inactive controls.

## Palette source and credit

Palette source: Material Kit React by Devias IO (github.com/devias-io/material-kit-react), MIT licence. The credit is kept on 01-palette.svg. The repository does not contain that source; the colour values are taken from the approved screens, not from a copy of the template.

## Render check

Each SVG passes `xmllint --noout`. Each was rendered in headless Chrome at its own size (1280 wide, height as in the file). Text was checked for overlap and overflow, and every swatch was checked to show. Inter is loaded from Google Fonts in the SVGs when the network allows it; otherwise the system sans-serif is used and widths may differ slightly.
