import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '../src/layout/Header.js';

interface ElementProps {
  children?: ReactNode;
  onClick?: () => void;
}

/** Finds the first element in the returned tree whose children are exactly `text`. */
function findByText(node: ReactNode, text: string): ReactElement<ElementProps> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByText(child, text);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<ElementProps>(node)) return undefined;
  if (node.props.children === text) return node;
  return findByText(node.props.children, text);
}

function render(onNewProject: () => void): string {
  return renderToStaticMarkup(<Header onNewProject={onNewProject} />);
}

describe('F-07 header', () => {
  it('F-07 AC-001 places the SDDBuilder wordmark before the New project button', () => {
    const markup = render(() => undefined);
    const wordmark = markup.indexOf('SDDBuilder');
    const button = markup.indexOf('New project');
    expect(wordmark).toBeGreaterThanOrEqual(0);
    expect(button).toBeGreaterThan(wordmark);
  });

  it('F-07 AC-002 calls onNewProject exactly once when New project is clicked', () => {
    const onNewProject = vi.fn();
    const element = Header({ onNewProject });
    const button = findByText(element, 'New project');
    expect(button).toBeDefined();
    button?.props.onClick?.();
    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it('F-07 AC-002 does not call onNewProject until the button is clicked', () => {
    const onNewProject = vi.fn();
    Header({ onNewProject });
    expect(onNewProject).not.toHaveBeenCalled();
  });

  it('F-07 AC-003 contains no Demo control', () => {
    const markup = render(() => undefined);
    expect(markup).not.toMatch(/demo/i);
  });

  it('F-07 AC-003 contains exactly one button, New project', () => {
    const markup = render(() => undefined);
    const buttons = markup.match(/<button\b/g) ?? [];
    expect(buttons).toHaveLength(1);
    expect(markup).toContain('New project');
  });

  it('F-07 AC-001 renders New project as a filled button, as on screen 01', () => {
    const markup = render(() => undefined);
    expect(markup).toContain('MuiButton-contained');
    expect(markup).not.toContain('MuiButton-outlined');
  });

  it('F-07 AC-013 renders a Material UI app bar', () => {
    expect(render(() => undefined)).toContain('MuiAppBar-root');
  });

  it('F-07 AC-013 renders the New project control as a Material UI button', () => {
    expect(render(() => undefined)).toContain('MuiButton-root');
  });
});
