import { describe, expect, it } from 'vitest';
import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppFrame } from '../src/layout/AppFrame.js';
import { frameStyle } from '../src/layout/frameStyle.js';

const NOTE = 'The work is not saved. It is lost when the browser is refreshed.';
const CONTENT = 'Screen content for the frame test';

function render(children?: string): string {
  const onNewProject = () => undefined;
  return renderToStaticMarkup(<AppFrame onNewProject={onNewProject}>{children}</AppFrame>);
}

/** The markup between the opening and closing centre-area tags. */
function centreMarkup(markup: string): string {
  const match = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(markup);
  if (match === null) throw new Error('centre area <main> not found in markup');
  return match[1] ?? '';
}

describe('F-07 frame', () => {
  it('F-07 AC-006 places the header wordmark, then the centre area, then the footer note', () => {
    const markup = render(CONTENT);
    const wordmark = markup.indexOf('SDDBuilder');
    const centre = markup.indexOf('<main');
    const footer = markup.indexOf('<footer');
    const note = markup.indexOf(NOTE);
    expect(wordmark).toBeGreaterThanOrEqual(0);
    expect(centre).toBeGreaterThan(wordmark);
    expect(footer).toBeGreaterThan(centre);
    expect(note).toBeGreaterThan(footer);
  });

  it('F-07 AC-006 places the centre content between the header and the footer', () => {
    const markup = render(CONTENT);
    const content = markup.indexOf(CONTENT);
    expect(content).toBeGreaterThan(markup.indexOf('New project'));
    expect(content).toBeLessThan(markup.indexOf('<footer'));
  });

  it('F-07 AC-007 renders the children inside the centre area', () => {
    const markup = render(CONTENT);
    expect(centreMarkup(markup)).toContain(CONTENT);
  });

  it('F-07 AC-007 keeps the children out of the header and the footer', () => {
    const markup = render(CONTENT);
    const headerAndFooter = markup.replace(centreMarkup(markup), '');
    expect(headerAndFooter).not.toContain(CONTENT);
  });

  it('F-07 AC-009 styles the outer frame element with the values from frameStyle()', () => {
    const outer = AppFrame({ onNewProject: () => undefined });
    if (!isValidElement<{ sx?: object }>(outer)) throw new Error('AppFrame did not return an element');
    expect(outer.props.sx).toMatchObject(frameStyle());
  });

  it('F-07 AC-007 leaves the centre area empty when there are no children', () => {
    const markup = render();
    expect(centreMarkup(markup).trim()).toBe('');
  });

  it('F-08 AC-015 (style part) makes the centre area a growing flex column; the fill itself is checked on the device at Verify', () => {
    const outer = AppFrame({ onNewProject: () => undefined });
    if (!isValidElement<{ children?: unknown }>(outer)) throw new Error('AppFrame did not return an element');
    const children = Array.isArray(outer.props.children) ? outer.props.children : [outer.props.children];
    const centre = children.find(
      (child): child is ReactElement<{ component?: string; sx?: object }> =>
        isValidElement<{ component?: string }>(child) && child.props.component === 'main',
    );
    if (centre === undefined) throw new Error('centre area <main> not found in the frame element');
    expect(centre.props.sx).toMatchObject({ flexGrow: 1, display: 'flex', flexDirection: 'column' });
  });

  it('F-07 AC-007 still renders the header and the footer when there are no children', () => {
    const markup = render();
    expect(markup).toContain('SDDBuilder');
    expect(markup).toContain('New project');
    expect(markup).toContain('<footer');
    expect(markup).toContain(NOTE);
  });
});
