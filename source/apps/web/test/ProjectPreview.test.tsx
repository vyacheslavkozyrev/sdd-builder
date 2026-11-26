// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { analysisError, analysisResult, type AnalysisResult, type AnalysisState } from '../src/analyze/analysisState.js';
import { ProjectPreview } from '../src/analyze/ProjectPreview.js';
import { countFiles, fileCountText } from '../src/analyze/ProjectTreeList.js';
import { getProjectPreviewStyles } from '../src/analyze/projectPreviewStyles.js';
import type { TreeNode } from '../src/analyze/tree.js';
import { theme } from '../src/theme.js';

afterEach(cleanup);

const KEY = 'current-configuration';

// A small tree in the shape projectTree returns: folders first, rule files marked.
const TREE: TreeNode[] = [
  {
    kind: 'folder',
    name: '.claude',
    path: '.claude',
    children: [
      {
        kind: 'folder',
        name: 'rules',
        path: '.claude/rules',
        children: [
          { kind: 'file', name: 'general.md', path: '.claude/rules/general.md', rule: true },
          { kind: 'file', name: 'typescript.md', path: '.claude/rules/typescript.md', rule: true },
        ],
      },
      {
        kind: 'folder',
        name: 'commands',
        path: '.claude/commands',
        children: [{ kind: 'file', name: 'plan.md', path: '.claude/commands/plan.md', rule: false }],
      },
    ],
  },
  { kind: 'file', name: 'CLAUDE.md', path: 'CLAUDE.md', rule: false },
];

function view(state: AnalysisState, tree: TreeNode[] = TREE) {
  return render(
    <ThemeProvider theme={theme}>
      <ProjectPreview tree={tree} state={state} configKey={KEY} generation={{ kind: 'idle' }} onGenerate={() => {}} />
    </ThemeProvider>,
  );
}

function review(status: AnalysisResult['review']['status'], findings: AnalysisResult['findings'] = []): AnalysisResult {
  return { findings, review: { status, findings: [], dropped: 0 } };
}

describe('F-13 AC-022 rule files are marked in the tree', () => {
  it('marks only the rule files with the rule tag', () => {
    view({ kind: 'not-run' });
    expect(screen.getAllByText('rule')).toHaveLength(2);
    const general = screen.getByText('general.md').closest('li');
    expect(within(general as HTMLElement).getByText('rule')).toBeTruthy();
    const plan = screen.getByText('plan.md').closest('li');
    expect(within(plan as HTMLElement).queryByText('rule')).toBeNull();
  });

  it('counts the files, not the folders, in the count line', () => {
    expect(countFiles(TREE)).toBe(4);
    expect(fileCountText(4)).toBe('4 files, in the order the project writes them.');
    expect(fileCountText(1)).toBe('1 file, in the order the project writes them.');
  });
});

describe('F-13 AC-023 the full list opens in a dialog', () => {
  it('shows the tree in a scrolling panel and Close returns to the step', async () => {
    expect(getProjectPreviewStyles(theme).panel).toMatchObject({ overflowY: 'auto' });
    view({ kind: 'not-run' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show full tree' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Project files')).toBeTruthy();
    expect(within(dialog).getByText('typescript.md')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Project preview')).toBeTruthy();
  });
});

describe('F-16 AC-033 the Project files dialog list keeps its height', () => {
  it('keeps the dialog list at 440 px and lets the page panel stay flexible', () => {
    const styles = getProjectPreviewStyles(theme);
    expect(styles.dialogPanel).toMatchObject({ flex: '0 0 auto', height: 440, overflowY: 'auto' });
    expect(styles.dialogPanel).not.toMatchObject({ minHeight: 0 });
    expect(styles.panel).toMatchObject({ flex: '1 1 0' });
  });
});

describe('F-13 AC-025 Generate and download stays disabled with its reason', () => {
  const cases: ReadonlyArray<[string, AnalysisState, string]> = [
    ['not run', { kind: 'not-run' }, 'Run Analyze first'],
    ['out of date', analysisResult('older-configuration', review('ok')), 'Run Analyze first'],
    ['a blocker', analysisResult(KEY, review('ok', [{ severity: 'blocker', subject: 'Idea', message: 'Empty.' }])), 'Fix the blocker to generate'],
    ['a warning', analysisResult(KEY, review('ok', [{ severity: 'warning', subject: 'Rules', message: 'None.' }])), 'Fix the warning to generate'],
    ['a failed review', analysisResult(KEY, review('failed')), 'Analysis failed. Analyze again to generate.'],
    ['an error', analysisError(KEY, 429, {}), 'Run Analyze first'],
  ];

  for (const [name, state, reason] of cases) {
    it(`gives the reason for ${name}`, () => {
      view(state);
      const button = screen.getByRole('button', { name: 'Generate and download' }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(screen.getByText(reason)).toBeTruthy();
    });
  }

  it('shows no reason on a green result', () => {
    view(analysisResult(KEY, review('ok', [{ severity: 'info', subject: 'Flow', message: 'No check is set.' }])));
    expect(screen.queryByText('Run Analyze first')).toBeNull();
    expect(screen.queryByText('Fix the blocker to generate')).toBeNull();
  });
});
