// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeftPanel } from '../src/layout/LeftPanel.js';

afterEach(() => {
  cleanup();
});

describe('F-07 AC-002 New project click', () => {
  it('F-07 AC-002 calls the onNewProject handler exactly once when New project is clicked', () => {
    const onNewProject = vi.fn();
    render(<LeftPanel onNewProject={onNewProject} />);

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it('F-07 AC-002 does not call the handler on render, before any click', () => {
    const onNewProject = vi.fn();
    render(<LeftPanel onNewProject={onNewProject} />);

    expect(onNewProject).not.toHaveBeenCalled();
  });
});
