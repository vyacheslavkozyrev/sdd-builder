import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppFrame } from '../src/layout/AppFrame.js';

// Markup tests run in the Node environment; the frame is static markup, so no DOM is needed.
const noop = (): void => undefined;

function markup(children?: string): string {
  return renderToStaticMarkup(
    children === undefined ? (
      <AppFrame onNewProject={noop} />
    ) : (
      <AppFrame onNewProject={noop}>
        <p>{children}</p>
      </AppFrame>
    ),
  );
}

describe('F-07 AC-006 frame order: left panel, centre area, footer', () => {
  it('F-07 AC-006 renders the left panel before the centre area', () => {
    const html = markup();
    const panel = html.indexOf('SDDBuilder');
    const centre = html.indexOf('<main');
    expect(panel).toBeGreaterThan(-1);
    expect(centre).toBeGreaterThan(panel);
  });

  it('F-07 AC-006 renders the centre area before the footer', () => {
    const html = markup();
    const centre = html.indexOf('<main');
    const footer = html.indexOf('<footer');
    expect(centre).toBeGreaterThan(-1);
    expect(footer).toBeGreaterThan(centre);
  });

  it('F-07 AC-006 renders the left panel, centre area and footer in that order', () => {
    const html = markup('CONTENT');
    const panel = html.indexOf('SDDBuilder');
    const centre = html.indexOf('<main');
    const footer = html.indexOf('<footer');
    expect(panel).toBeGreaterThan(-1);
    expect(centre).toBeGreaterThan(panel);
    expect(footer).toBeGreaterThan(centre);
  });

  it('F-07 AC-006 negative case: the footer note does not come before the left panel', () => {
    const html = markup();
    expect(html.indexOf('The work is not saved.')).toBeGreaterThan(html.indexOf('SDDBuilder'));
  });
});

describe('F-07 AC-007 centre area holds the children', () => {
  it('F-07 AC-007 renders the children inside the centre area', () => {
    const html = markup('CONTENT');
    const open = html.indexOf('<main');
    const close = html.indexOf('</main>');
    const child = html.indexOf('CONTENT');
    expect(child).toBeGreaterThan(open);
    expect(child).toBeLessThan(close);
  });

  it('F-07 AC-007 with no children the centre area is empty', () => {
    expect(markup()).toMatch(/<main class="[^"]*"><\/main>/);
  });

  it('F-07 AC-007 with no children the left panel still renders', () => {
    const html = markup();
    expect(html).toContain('SDDBuilder');
    expect(html).toMatch(/<button\b[^>]*>New project<\/button>/);
  });

  it('F-07 AC-007 with no children the footer still renders', () => {
    expect(markup()).toContain('The work is not saved.');
  });

  it('F-07 AC-007 negative case: the children are rendered once, only inside the centre area', () => {
    const html = markup('CONTENT');
    expect(html.split('CONTENT')).toHaveLength(2);
    expect(html.indexOf('<footer')).toBeGreaterThan(html.indexOf('</main>'));
  });
});

describe('F-08 AC-004 stepper and navigation go to the left panel, children to the centre area', () => {
  function slotted(): string {
    return renderToStaticMarkup(
      <AppFrame onNewProject={noop} stepper={<p>STEPPER</p>} navigation={<p>NAVIGATION</p>}>
        <p>BODY</p>
      </AppFrame>,
    );
  }

  it('F-08 AC-004 renders the stepper inside the left panel, below New project', () => {
    const html = slotted();
    const newProject = html.indexOf('New project');
    const stepper = html.indexOf('STEPPER');
    expect(stepper).toBeGreaterThan(newProject);
    expect(stepper).toBeLessThan(html.indexOf('<main'));
  });

  it('F-08 AC-004 renders the navigation inside the left panel, before the centre area', () => {
    const html = slotted();
    const navigation = html.indexOf('NAVIGATION');
    expect(navigation).toBeGreaterThan(html.indexOf('STEPPER'));
    expect(navigation).toBeLessThan(html.indexOf('<main'));
  });

  it('F-08 AC-004 renders the children inside the centre area, after the left panel', () => {
    const html = slotted();
    const open = html.indexOf('<main');
    const close = html.indexOf('</main>');
    expect(html.indexOf('BODY')).toBeGreaterThan(open);
    expect(html.indexOf('BODY')).toBeLessThan(close);
  });

  it('F-08 AC-004 negative case: without the slots the left panel renders as in F-07', () => {
    const html = markup();
    expect(html).not.toContain('STEPPER');
    expect(html).not.toContain('NAVIGATION');
    expect(html).toMatch(/<button\b[^>]*>New project<\/button>/);
  });
});
