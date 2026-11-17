# User Stories — UI layout template (F-07)

Feature entry: `spec/documents/features.md` → F-07
Requirements owned by this feature: the F-07 scope items in `features.md` (header with logo and New project, app footer with the not-saved note, centre content area, Material UI, desktop layout at the 1280 × 800 reference, every screen uses the layout); `ui.md` §1.1, §1.2, §1.3 (frame only), §7; `architecture.md` §5 (Material UI) and decision 31 (desktop only). Owner decisions of 2026-11-17: the logo is a text wordmark; New project calls a handler supplied by the caller; the layout is fluid with a 1024 px minimum width.

## Out of Scope

- The wizard, its steps panel, Prev and Next, and the step bodies (F-08). F-07 renders the centre area from its children only.
- What New project does beyond calling the handler it is given. The handler is wired to the wizard in F-08.
- The Demo button (not in the MVP; F-23).
- A logo image file. The header shows the text wordmark `SDDBuilder`; a real logo is a later change.
- Any save, download or persistence control in the footer. The footer is a note only.
- Phone and tablet layouts (decision 31).
- Theme switching, dark mode and custom colours. Material UI defaults apply.
- Browser (end-to-end) tests. The web package has no DOM test library (T004 of F-01); automated criteria render with `react-dom/server` in the Node environment, and layout sizes are read from a pure style function.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-07 AC-003`).

### US-001: Header with logo and New project

**As a** builder user
**I want to** see the SDDBuilder logo at the top left and a New project button at the top right
**So that** I can recognise the app and start a new project from any screen.

**Requirements:** `ui.md` §1.1

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the header renders the text `SDDBuilder` in its left region and the button `New project` in its right region.
- [ ] AC-002 `[auto]`: clicking `New project` calls the `onNewProject` handler passed to the layout exactly once, and calls no other handler.
- [ ] AC-003 `[auto]`: the header contains no Demo button and no other button besides `New project` (negative case: Demo is not in the MVP).

### US-002: Footer note that the work is not saved

**As a** builder user
**I want to** see a note in the footer that my work is not saved
**So that** I know a browser refresh loses what I have entered.

**Requirements:** `ui.md` §1.2

#### Acceptance Criteria

- [ ] AC-004 `[auto]`: the footer text states that the work is not saved and is lost when the browser is refreshed.
- [ ] AC-005 `[auto]`: the footer contains no button or link (negative case: no save, download or persistence control in the footer).

### US-003: One frame for every screen

**As a** developer
**I want to** render every screen inside one layout frame
**So that** the header, the centre area and the footer look and behave the same on every screen.

**Requirements:** `ui.md` §1 (frame), `features.md` F-07 ("every screen uses it")

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: the layout renders the header, then the centre area, then the footer, in that order in the markup.
- [ ] AC-007 `[auto]`: the children passed to the layout appear inside the centre area; with no children the centre area is empty and the header and footer still render.
- [ ] AC-008 `[auto]`: the application root renders the layout frame, so the header and footer appear on the first screen.

### US-004: Desktop sizing

**As a** builder user on a desktop browser
**I want to** the layout to fill the browser window, with a minimum width of 1024 px
**So that** the reference layout of 1280 × 800 is usable and the page does not squeeze into a narrow column.

**Requirements:** `ui.md` §1, §7; `architecture.md` decision 31

#### Acceptance Criteria

- [ ] AC-009 `[auto]`: the frame style sets the width to 100% of the window, a minimum width of 1024 px and a minimum height of the full window height.
- [ ] AC-010 `[auto]`: the frame style does not hide overflow and does not set a narrow maximum width (negative case: below 1024 px the page scrolls; it does not clip or reflow to a phone column).
- [ ] AC-011 `[device]`: at a window of 1280 × 800 the header, the centre area and the footer are all visible without scrolling the page vertically, and the footer sits at the bottom of the window.
- [ ] AC-012 `[device]`: at a window of 1024 px wide the header, centre area and footer stay in one column with no overlap; narrower than 1024 px the page scrolls horizontally.

### US-005: Material UI components

**As a** developer
**I want to** build the header, the footer and the frame from Material UI components
**So that** the app uses the look and feel chosen for the MVP (`architecture.md` §5).

**Requirements:** `architecture.md` §5 (component library); `ui.md` intro

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: the rendered header contains a Material UI app bar (class `MuiAppBar-root`) and the New project control is a Material UI button (class `MuiButton-root`).
- [ ] AC-014 `[auto]`: the rendered footer contains a Material UI element (class prefixed `Mui`).

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| F-07 header: logo | AC-001 |
| F-07 header: New project | AC-001, AC-002, AC-003 |
| F-07 app footer with the not-saved note | AC-004, AC-005 |
| F-07 centre content area | AC-006, AC-007 |
| F-07 every screen uses the layout | AC-006, AC-008 |
| F-07 Material UI | AC-013, AC-014 |
| F-07 desktop layout 1280 × 800 | AC-009, AC-010, AC-011, AC-012 |
| `ui.md` §1.1 header | AC-001, AC-002, AC-003 |
| `ui.md` §1.2 footer | AC-004, AC-005 |
| `ui.md` §7 desktop only | AC-009, AC-010, AC-012 |
