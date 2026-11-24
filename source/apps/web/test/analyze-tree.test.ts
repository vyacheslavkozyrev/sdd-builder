import { pipeline } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildProjectConfig } from '../src/analyze/config.js';
import { projectTree, type TreeNode } from '../src/analyze/tree.js';
import { loadGenerationTemplates } from '../src/analyze/templates.js';
import { defaultPipelineValue, type WizardValues } from '../src/wizard/state.js';

function valuesWith(rules: { name: string; description: string }[]): WizardValues {
  return {
    name: 'Shop',
    idea: 'A shop for books.',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    architecture: 'Layers: web, api, core.',
    rules,
    pipeline: defaultPipelineValue(),
  };
}

function configWith(rules: { name: string; description: string }[]): pipeline.ProjectConfig {
  return buildProjectConfig(valuesWith(rules));
}

const TWO_RULES = [
  { name: 'Code Style', description: 'Use two spaces.' },
  { name: 'Error handling', description: 'Throw for bugs.' },
];

// The leaves of a tree, depth first, as paths with their rule mark.
function leaves(nodes: readonly TreeNode[]): { path: string; rule: boolean }[] {
  return nodes.flatMap((node) =>
    node.kind === 'file' ? [{ path: node.path, rule: node.rule }] : leaves(node.children),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('F-13 AC-021 the preview lists the files of the project', () => {
  it('lists every file that listFiles plans, once each', () => {
    const config = configWith(TWO_RULES);
    const templates = loadGenerationTemplates();
    const planned = pipeline.listFiles(config, templates).map((file) => file.path);
    const shown = leaves(projectTree(config, templates)).map((leaf) => leaf.path);
    expect(shown.slice().sort()).toEqual(planned.slice().sort());
  });

  it('puts the folders first on each level and sorts each group by name', () => {
    const tree = projectTree(configWith(TWO_RULES), loadGenerationTemplates());
    const checkLevel = (nodes: readonly TreeNode[]): void => {
      const folders = nodes.filter((node) => node.kind === 'folder').map((node) => node.name);
      const files = nodes.filter((node) => node.kind === 'file').map((node) => node.name);
      expect(nodes.map((node) => node.kind)).toEqual([
        ...folders.map(() => 'folder'),
        ...files.map(() => 'file'),
      ]);
      expect(folders).toEqual([...folders].sort());
      expect(files).toEqual([...files].sort());
      for (const node of nodes) {
        if (node.kind === 'folder') checkLevel(node.children);
      }
    };
    checkLevel(tree);
  });

  it('is the same tree for the same configuration', () => {
    const config = configWith(TWO_RULES);
    const templates = loadGenerationTemplates();
    expect(projectTree(config, templates)).toEqual(projectTree(config, templates));
  });

  it('sends no request while it is computed', () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('no request expected');
    });
    vi.stubGlobal('fetch', fetchSpy);
    projectTree(configWith(TWO_RULES), loadGenerationTemplates());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses a planned path that runs through a file of the same tree', () => {
    const config = configWith([]);
    const templates = loadGenerationTemplates();
    const clash = {
      ...templates,
      base: [
        { path: 'docs', layout: templates.base[0]?.layout ?? '' },
        { path: 'docs/guide.md', layout: templates.base[0]?.layout ?? '' },
      ],
    };
    expect(() => projectTree(config, clash)).toThrow('runs through the file docs');
  });
});

describe('F-13 AC-022 files from rule blocks are marked', () => {
  it('marks the rule file of each rule block and no other file', () => {
    const tree = projectTree(configWith(TWO_RULES), loadGenerationTemplates());
    const marked = leaves(tree)
      .filter((leaf) => leaf.rule)
      .map((leaf) => leaf.path);
    expect(marked).toEqual(['.claude/rules/code-style.md', '.claude/rules/error-handling.md']);
  });

  it('marks no file when the configuration has no rule block', () => {
    const tree = projectTree(configWith([]), loadGenerationTemplates());
    expect(leaves(tree).some((leaf) => leaf.rule)).toBe(false);
  });
});

describe('F-13 AC-024 the list follows the rule blocks of the configuration', () => {
  it('shows a file for an added rule block and drops the file of a removed one', () => {
    const templates = loadGenerationTemplates();
    const before = leaves(projectTree(configWith(TWO_RULES), templates)).map((leaf) => leaf.path);
    const added = leaves(
      projectTree(configWith([...TWO_RULES, { name: 'Testing', description: 'Test first.' }]), templates),
    ).map((leaf) => leaf.path);
    const removed = leaves(projectTree(configWith([{ name: 'Code Style', description: 'Use two spaces.' }]), templates)).map(
      (leaf) => leaf.path,
    );
    expect(added).toContain('.claude/rules/testing.md');
    expect(added.length).toBe(before.length + 1);
    expect(removed).not.toContain('.claude/rules/error-handling.md');
    expect(removed.length).toBe(before.length - 1);
  });

  it('gives no file to a rule block whose id is refused, and does not fail', () => {
    const templates = loadGenerationTemplates();
    const refused = [
      { name: '2 tests', description: 'Starts with a digit.' },
      { name: '!!!', description: 'No letter or digit.' },
      { name: 'a'.repeat(61), description: 'Too long.' },
    ];
    const tree = projectTree(configWith([...TWO_RULES, ...refused]), templates);
    const paths = leaves(tree).map((leaf) => leaf.path);
    expect(paths.filter((path) => path.startsWith('.claude/rules/'))).toEqual([
      '.claude/rules/code-style.md',
      '.claude/rules/error-handling.md',
    ]);
  });

  it('gives no file to rule blocks that share an id, and does not fail while the user types a duplicate', () => {
    const templates = loadGenerationTemplates();
    const duplicated = [...TWO_RULES, { name: 'code style', description: 'Same id as the first.' }];
    const paths = leaves(projectTree(configWith(duplicated), templates)).map((leaf) => leaf.path);
    expect(paths.filter((path) => path.startsWith('.claude/rules/'))).toEqual(['.claude/rules/error-handling.md']);
  });

  it('keeps the list the same when the refused rule blocks are the only change', () => {
    const templates = loadGenerationTemplates();
    expect(projectTree(configWith(TWO_RULES), templates)).toEqual(
      projectTree(configWith([...TWO_RULES, { name: '2 tests', description: 'x' }]), templates),
    );
  });
});
