// The file tree of the project preview (F-13 AC-021, AC-022, AC-024). Pure: no React, no I/O, no request. The
// files come from core's `listFiles`, so the tree shows the files that Generate would write. A rule block whose id
// is refused (`ruleIdProblem` is not `none`) or shared with another rule block gets no file: it is removed before
// `listFiles` sees the configuration, so an unsafe or clashing path never reaches it and the preview does not fail
// while the user types a duplicate name (the analysis reports the duplicate).

import { pipeline } from '@sddbuilder/core';
import { ruleIdProblem } from '../wizard/technical.js';

type ProjectConfig = pipeline.ProjectConfig;
type GenerationTemplates = Parameters<typeof pipeline.listFiles>[1];

export interface TreeFile {
  readonly kind: 'file';
  readonly name: string;
  readonly path: string;
  // True when the file is written from a rule block (AC-022).
  readonly rule: boolean;
}

export interface TreeFolder {
  readonly kind: 'folder';
  readonly name: string;
  readonly path: string;
  readonly children: readonly TreeNode[];
}

export type TreeNode = TreeFile | TreeFolder;

// The path of one rule block's file, as `listFiles` plans it for a configuration with only that block (F-16 AC-029).
// A single block cannot clash with itself, so the call does not throw.
function ruleFilePath(config: ProjectConfig, rule: ProjectConfig['rules'][number], templates: GenerationTemplates): string {
  const planned = pipeline.listFiles({ ...config, rules: [rule] }, templates).find((file) => file.source.kind === 'rule');
  return planned?.path ?? '';
}

// The tree of the files of the configuration. Folders come first on each level, then the rest, each group by name.
export function projectTree(config: ProjectConfig, templates: GenerationTemplates): TreeNode[] {
  // Two rule blocks with the same file name are both left out (F-16 AC-029). The file name is the one `listFiles` plans,
  // so each valid rule block is planned alone to get its path; titles that differ in the wizard's ASCII id but give one
  // file name then cannot reach `listFiles` together.
  const valid = config.rules.filter((rule) => ruleIdProblem(rule.title) === 'none');
  const paths = new Map(valid.map((rule) => [rule, ruleFilePath(config, rule, templates)] as const));
  const counts = new Map<string, number>();
  for (const path of paths.values()) {
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  const usable: ProjectConfig = {
    ...config,
    rules: valid.filter((rule) => counts.get(paths.get(rule) ?? '') === 1),
  };
  const root: MutableFolder = { kind: 'folder', name: '', path: '', children: new Map() };
  for (const file of pipeline.listFiles(usable, templates)) {
    addFile(root, file);
  }
  return sortLevel(root.children);
}

interface MutableFolder {
  readonly kind: 'folder';
  readonly name: string;
  readonly path: string;
  readonly children: Map<string, MutableFolder | TreeFile>;
}

// Adds one planned file under its folders. A folder and a file with the same name at one level is a programmer
// error (a planned path is both a file and a folder) and throws.
function addFile(root: MutableFolder, file: pipeline.ListedFile): void {
  const segments = file.path.split('/');
  let folder = root;
  for (let depth = 0; depth < segments.length - 1; depth += 1) {
    const segment = segments[depth] ?? '';
    const path = segments.slice(0, depth + 1).join('/');
    const existing = folder.children.get(segment);
    if (existing === undefined) {
      const created: MutableFolder = { kind: 'folder', name: segment, path, children: new Map() };
      folder.children.set(segment, created);
      folder = created;
    } else if (existing.kind === 'folder') {
      folder = existing;
    } else {
      throw new Error(`the planned path ${file.path} runs through the file ${path}`);
    }
  }
  const name = segments[segments.length - 1] ?? '';
  if (folder.children.has(name)) {
    throw new Error(`two planned files have the path ${file.path}`);
  }
  folder.children.set(name, {
    kind: 'file',
    name,
    path: file.path,
    rule: file.source.kind === 'rule',
  });
}

function sortLevel(children: Map<string, MutableFolder | TreeFile>): TreeNode[] {
  const nodes = [...children.values()].map((child): TreeNode => {
    if (child.kind === 'file') return child;
    return { kind: 'folder', name: child.name, path: child.path, children: sortLevel(child.children) };
  });
  return nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}
