// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivacyNotice } from '../src/analyze/PrivacyNotice.js';
import { theme } from '../src/theme.js';

afterEach(cleanup);

interface Handlers {
  pending?: boolean;
  onTickedChange?: (v: boolean) => void;
  onAnalyze?: () => void;
}

function notice(ticked: boolean, handlers: Handlers = {}) {
  return (
    <ThemeProvider theme={theme}>
      <PrivacyNotice
        ticked={ticked}
        pending={handlers.pending ?? false}
        onTickedChange={handlers.onTickedChange ?? (() => {})}
        onAnalyze={handlers.onAnalyze ?? (() => {})}
      />
    </ThemeProvider>
  );
}

function renderNotice(ticked: boolean, handlers: Handlers = {}) {
  return render(notice(ticked, handlers));
}

function checkbox(): HTMLInputElement {
  return screen.getByRole('checkbox', { name: 'I have read the notice. Send the brief for review.' }) as HTMLInputElement;
}

function analyzeButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement;
}

describe('F-13 AC-001 privacy notice when the step opens', () => {
  it('shows the notice above the Analyze button, with the checkbox unticked and Analyze disabled', () => {
    renderNotice(false);
    const notice = screen.getByText('Privacy notice');
    const button = analyzeButton();
    expect(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checkbox().checked).toBe(false);
    expect(button.disabled).toBe(true);
  });
});

describe('F-13 AC-002 the tick enables and disables Analyze', () => {
  it('reports a tick and enables Analyze when the box is ticked', () => {
    const onTickedChange = vi.fn();
    const { rerender } = renderNotice(false, { onTickedChange });
    fireEvent.click(checkbox());
    expect(onTickedChange).toHaveBeenCalledWith(true);

    rerender(notice(true, { onTickedChange }));
    expect(checkbox().checked).toBe(true);
    expect(analyzeButton().disabled).toBe(false);
  });

  it('reports an untick and disables Analyze again when the box is unticked', () => {
    const onTickedChange = vi.fn();
    const { rerender } = renderNotice(true, { onTickedChange });
    fireEvent.click(checkbox());
    expect(onTickedChange).toHaveBeenCalledWith(false);

    rerender(notice(false, { onTickedChange }));
    expect(analyzeButton().disabled).toBe(true);
  });

  it('shows the reason beside Analyze only while the box is unticked', () => {
    const { unmount } = renderNotice(false);
    const reason = screen.getByText('Tick the box to analyse');
    expect(analyzeButton().getAttribute('aria-describedby')).toBe(reason.id);
    unmount();

    renderNotice(true);
    expect(screen.queryByText('Tick the box to analyse')).toBeNull();
    expect(analyzeButton().getAttribute('aria-describedby')).toBeNull();
  });
});

describe('F-13 AC-003 an unticked box sends nothing', () => {
  it('does not call onAnalyze when Analyze is clicked with the box unticked', () => {
    const onAnalyze = vi.fn();
    renderNotice(false, { onAnalyze });
    fireEvent.click(analyzeButton());
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it('calls onAnalyze once when Analyze is clicked with the box ticked', () => {
    const onAnalyze = vi.fn();
    renderNotice(true, { onAnalyze });
    fireEvent.click(analyzeButton());
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });
});

describe('F-13 AC-004 the notice states the provider and that nothing is stored', () => {
  it('says the brief and the pipeline go to the model provider, and that the server does not store or log the brief', () => {
    renderNotice(false);
    expect(
      screen.getByText('Analyze sends the brief and the pipeline to the model provider for review.'),
    ).toBeTruthy();
    expect(screen.getByText('The server does not store or log the brief.')).toBeTruthy();
  });
});

describe('F-13 AC-006 Analyze is disabled and shows progress while the request is pending', () => {
  it('disables Analyze and marks it busy while pending', () => {
    renderNotice(true, { pending: true });
    expect(analyzeButton().disabled).toBe(true);
    expect(analyzeButton().getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeTruthy();
  });
});
