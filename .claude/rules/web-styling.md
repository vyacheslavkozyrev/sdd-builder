# Web Styling Rules — `source/apps/web`

Read for any task that touches styles, colours or layout in the web app.

## Style objects
- Every style object is returned by a style getter that takes the theme: `get<Name>Styles(theme)`, for example `getLeftPanelStyles(theme)`. A component reads the theme with `useTheme()`, calls its getter once per render, and passes the result to `sx` (for example `sx={styles.root}`).
- No inline style objects: `sx={{ ... }}` and `style={{ ... }}` are not allowed anywhere in the web app.
- Shared shapes live once in `source/apps/web/src/styles/common.ts` (`getCommonStyles(theme)`). Two components that need the same shape (for example a white card or the outlined button) take it from there. Do not copy a shape into a second component.
- The getter for a component lives in `source/apps/web/src/layout/layoutStyles.ts` (for the shared frame) or next to the feature's own components, following the same pattern.
- Sizing that a test must check is a pure function (`frameStyle()` in `source/apps/web/src/layout/frameStyle.ts`) that the getter calls.

## Colours
- Colours come only from the theme palette in `source/apps/web/src/theme.ts`. A component reads them as `theme.palette.*` (for example `theme.palette.text.secondary`) and never writes a colour value.
- A non-palette visual value that contains a colour (the card shadow) is written once in `theme.ts` as a named export (`cardShadow`) and read from there by `common.ts`. It is not copied into a component.
- No colour literal outside `theme.ts`: no hex (`#FFFFFF`), no `rgb(…)`, `rgba(…)`, `hsl(…)` or modern colour function, and no colour keyword such as `'white'`. A new colour is added to the palette in `theme.ts` first, then used by name.
- Named MUI colour props (`color="primary"`, `color="inherit"`) read the palette and are allowed.

## Enforcement
- `source/apps/web/test/style-rules.test.ts` scans every source file under `src/` and fails on an inline `sx` or `style` object (whitespace-tolerant), on a `styles` object written in a component, on any `sx` value that is not a `styles.` getter, on a file that sets `sx` without a `get<Name>Styles(useTheme())` call, and on a colour literal or colour keyword outside `theme.ts`. It also checks its own patterns against sample lines. Keep the rules passing; do not add exceptions to the test to get around them.
- `source/apps/web/test/layoutStyles.test.ts` proves the getters take their colours from the theme they are given.
