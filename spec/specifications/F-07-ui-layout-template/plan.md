# Implementation Plan — UI layout template (F-07)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Web] Frame sizing as a pure style function: width 100%, minimum width 1024 px, minimum height full window, no hidden overflow — `source/apps/web/src/layout/frameStyle.ts`, `source/apps/web/test/frameStyle.test.ts` — covers AC-009, AC-010
- [x] T002 [Web] Left panel: the text wordmark `SDDBuilder` above a `New project` Material UI button that calls `onNewProject` once; no other control — `source/apps/web/src/layout/LeftPanel.tsx`, `source/apps/web/test/LeftPanel.test.tsx` — covers AC-001, AC-002, AC-003, AC-013
- [x] T003 [Web] Footer: the not-saved note, no button or link, built from Material UI — `source/apps/web/src/layout/Footer.tsx`, `source/apps/web/test/Footer.test.tsx` — covers AC-004, AC-005, AC-014
- [x] T004 [Web] Frame: left panel, centre area with the children, footer, in that order, styled by `frameStyle` — `source/apps/web/src/layout/AppFrame.tsx`, `source/apps/web/test/AppFrame.test.tsx` — covers AC-006, AC-007
- [ ] T005 [Web] Application root: `App` renders the frame with an empty centre area; `main.tsx` mounts `App` and the hello-world placeholder is removed — `source/apps/web/src/App.tsx`, `source/apps/web/src/main.tsx`, `source/apps/web/test/App.test.tsx` — covers AC-008

## Rationale

- **Order.** T001 is a pure function with no React, so it needs nothing else. T002 and T003 are the two leaf components and both import Material UI, which is already pinned in `source/apps/web/package.json` and recorded in `architecture.md` §5. T004 composes the three parts with the frame style. T005 is the application root that uses the frame, so it comes last.
- **Re-plan.** The earlier F-07 build was removed by commit `58ef413` (the build restarts from the scaffolding). The old tasks are not reused: the header is now a left panel (approved 2026-11-20), and the Material UI and Emotion pins were already in place, so there is no dependency task.
- **Testing.** Markup tests render with `react-dom/server` (`renderToStaticMarkup`) in Vitest's Node environment and check text, order and the Material UI class names (`Mui` prefix, `MuiButton-root`). The click in AC-002 is a DOM test: the file declares `// @vitest-environment jsdom` and uses `@testing-library/react`, both approved in `architecture.md` §5 for component click tests. AC-002 checks that the handler is called once and that no other handler is called.
- **Negative cases.** AC-003 and AC-005 check the rendered markup and the element list, so they fail if a Demo, save or download control is added later.
- **Device criteria.** AC-011 and AC-012 are `[device]` and are not tasks. They are checked on the running app at 1280 × 800 and at 1024 px in the manual checklist of Verify. The behaviour they check is built by T001 (sizing) and T004 (frame order).
- **Scope.** No stepper, Prev or Next (F-08 adds them to the left panel), no Demo button (F-23). The centre area stays empty in T005; the wizard fills it in F-08.
- **Libraries.** No new library. `@mui/material`, `@emotion/react`, `@emotion/styled`, `jsdom`, `@testing-library/react` and `@testing-library/dom` are all pinned and recorded in `architecture.md` §5.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Web]` | `source/apps/web`: layout components, style functions, the application root |
| `[Docs]` | Documentation changes required by the feature |
