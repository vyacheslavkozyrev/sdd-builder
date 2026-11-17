# Implementation Plan — UI layout template (F-07)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Build] [Docs] Add `@mui/material` 9.5.0, `@emotion/react` 11.14.0 and `@emotion/styled` 11.14.1 to `source/apps/web` (exact pins, lockfile synced); record Emotion in `architecture.md` §5 — `source/apps/web/package.json`, `source/package-lock.json`, `spec/documents/architecture.md` — covers none (enabler for AC-013, AC-014)
- [x] T002 [Web] Frame sizing as a pure style function: width 100%, minimum width 1024 px, minimum height full window, no hidden overflow — `source/apps/web/src/layout/frameStyle.ts`, `source/apps/web/test/frameStyle.test.ts` — covers AC-009, AC-010
- [x] T003 [Web] Header: text wordmark `SDDBuilder` on the left, `New project` button on the right calling `onNewProject`, no other control — `source/apps/web/src/layout/Header.tsx`, `source/apps/web/test/Header.test.tsx` — covers AC-001, AC-002, AC-003, AC-013
- [x] T004 [Web] Footer: the not-saved note, no button or link, built from Material UI — `source/apps/web/src/layout/Footer.tsx`, `source/apps/web/test/Footer.test.tsx` — covers AC-004, AC-005, AC-014
- [ ] T005 [Web] Frame: header, centre area with the children, footer, in that order, styled by `frameStyle` — `source/apps/web/src/layout/AppFrame.tsx`, `source/apps/web/test/AppFrame.test.tsx` — covers AC-006, AC-007
- [ ] T006 [Web] Application root renders the frame with a centre placeholder; `main.tsx` mounts it and the hello-world placeholder is removed — `source/apps/web/src/App.tsx`, `source/apps/web/src/main.tsx`, `source/apps/web/test/App.test.tsx` — covers AC-008

## Rationale

- **Order.** T001 comes first: every later component imports Material UI, and the Emotion decision must be in `architecture.md` §5 before code depends on it (`general.md` architecture rule). T002 is a pure function with no React, so its tests need nothing else. T003 and T004 are the two leaf components; T005 composes them with the frame style; T006 is the application root that uses the frame, so it comes last.
- **Testing without a DOM.** The web package has no DOM or browser test library (`architecture.md` §5, F-01 T004). Component tests render with `react-dom/server` (`renderToStaticMarkup`) under Vitest's default Node environment and check the markup for text, order and Material UI class names (`MuiAppBar-root`, `MuiButton-root`, `Mui` prefix). The click in AC-002 is checked by calling the component function, finding the `New project` element in the returned React element tree and invoking its `onClick`; no event is dispatched.
- **Demo and footer buttons.** AC-003 and AC-005 are negative checks on the rendered markup and the element tree, so they fail if a control is added later.
- **Device criteria.** AC-011 and AC-012 are `[device]` and are not tasks. They are checked on the running app at 1280 × 800 and at 1024 px, in the manual checklist of Verify. The behaviour they check is built by T002 (sizing) and T005 (frame order).
- **Scope.** No wizard, stepper or Demo button (F-08, F-23). The centre area shows only a placeholder from T006; the wizard replaces it in F-08.
- **Libraries.** Only `@mui/material` is in `architecture.md` §5. Its peer dependencies `@emotion/react` and `@emotion/styled` are not listed there; they are raised for the user's approval before T001 (see the approval step).

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Web]` | `source/apps/web`: layout components, style functions, the application root |
| `[Docs]` | Documentation changes required by the feature |
