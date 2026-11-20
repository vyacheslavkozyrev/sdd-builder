import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Enforces .claude/rules/web-styling.md over every source file under src/.
// Style rules (no inline style objects, colours only from the theme) carry no feature ID:
// they are repository-wide rules, not an acceptance criterion of one feature.

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(webDir, 'src');
const themeFile = join(srcDir, 'theme.ts');

// The forbidden forms. Whitespace is tolerated around `=` and braces, so `sx = {` and `sx={ {`
// are caught too.
const INLINE_SX = /\bsx\s*=\s*\{(?!\s*styles\.)/;
const INLINE_STYLE = /\bstyle\s*=\s*\{\s*\{/;
const INLINE_STYLES_OBJECT = /\bconst\s+styles\s*=\s*\{/;
const COLOUR_LITERAL = /#[0-9A-Fa-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/;
const NAMED_COLOUR = /['"`](?:white|black|red|green|blue|gray|silver|yellow|orange|purple)['"`]/i;
// A component that uses sx reads its styles from a getter: const styles = getXStyles(useTheme());
const GETTER_CALL = /\bconst styles = get[A-Za-z]+Styles\(useTheme\(\)\);/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

// Every source file except the theme, the only file that may write a colour literal.
const files = sourceFiles(srcDir).filter((path) => path !== themeFile);

function relPath(path: string): string {
  return relative(webDir, path).split(sep).join('/');
}

// Returns "file:line" for every line that matches the pattern.
function hits(pattern: RegExp): string[] {
  return files.flatMap((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) => (pattern.test(line) ? [`${relPath(path)}:${index + 1}`] : [])),
  );
}

// Returns the files whose whole text matches the predicate.
function filesWhere(predicate: (text: string) => boolean): string[] {
  return files.filter((path) => predicate(readFileSync(path, 'utf8'))).map(relPath);
}

describe('style rules (.claude/rules/web-styling.md)', () => {
  it('the scan reaches the component files, so the rules below are not checked over an empty set', () => {
    expect(files.map(relPath)).toEqual(expect.arrayContaining(['src/layout/LeftPanel.tsx', 'src/styles/common.ts']));
  });

  it('the patterns catch every forbidden form and pass the approved one', () => {
    const cases: ReadonlyArray<[RegExp, string, boolean]> = [
      [INLINE_SX, '<Box sx={{ m: 1 }}>', true],
      [INLINE_SX, '<Box sx = { { m: 1 } }>', true],
      [INLINE_SX, '<Box sx={[styles.root]}>', true],
      [INLINE_SX, '<Box sx={sxRoot}>', true],
      [INLINE_SX, '<Box sx={styles.root}>', false],
      [INLINE_STYLE, '<div style={{ margin: 0 }}>', true],
      [INLINE_STYLE, '<div style={ { margin: 0 } }>', true],
      [INLINE_STYLE, '<div style={styles.root}>', false],
      [INLINE_STYLES_OBJECT, 'const styles = { root: {} };', true],
      [INLINE_STYLES_OBJECT, 'const styles = getLeftPanelStyles(useTheme());', false],
      [COLOUR_LITERAL, "color: '#32383E'", true],
      [COLOUR_LITERAL, 'border: 1px solid rgba(0, 0, 0, 0.2)', true],
      [COLOUR_LITERAL, 'color: color-mix(in srgb, red 50%, blue)', true],
      [COLOUR_LITERAL, 'color: theme.palette.text.primary', false],
      [NAMED_COLOUR, "color: 'white'", true],
      [NAMED_COLOUR, 'color="inherit"', false],
      [NAMED_COLOUR, "color: 'primary'", false],
    ];
    for (const [pattern, line, expected] of cases) {
      expect(pattern.test(line), `${pattern} on ${line}`).toBe(expected);
    }
  });

  it('no inline sx object: every sx value is a styles getter result', () => {
    expect(hits(INLINE_SX)).toEqual([]);
  });

  it('no inline style object: style={{ }} is not used', () => {
    expect(hits(INLINE_STYLE)).toEqual([]);
  });

  it('no styles object written in a component: styles come from a getter', () => {
    expect(hits(INLINE_STYLES_OBJECT)).toEqual([]);
  });

  it('every component that sets sx declares its styles with a getter call', () => {
    const withSx = filesWhere((text) => /\bsx\s*=/.test(text));
    expect(withSx.length).toBeGreaterThan(0);
    const withoutGetter = filesWhere((text) => /\bsx\s*=/.test(text) && !GETTER_CALL.test(text));
    expect(withoutGetter).toEqual([]);
  });

  it('no colour literal outside theme.ts: no hex, rgb(), rgba(), hsl(), hsla() or modern colour functions', () => {
    expect(hits(COLOUR_LITERAL)).toEqual([]);
  });

  it('no named colour outside theme.ts: a colour keyword such as white is not used', () => {
    expect(hits(NAMED_COLOUR)).toEqual([]);
  });

  it('theme.ts builds the theme with createTheme and exports it', () => {
    expect(readFileSync(themeFile, 'utf8')).toMatch(/export const theme = createTheme\(/);
  });
});
