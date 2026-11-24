import { Box, useTheme } from '@mui/material';
import { getProjectPreviewStyles } from './projectPreviewStyles.js';
import type { TreeNode } from './tree.js';

// The rows of the file tree (F-13 AC-022; screens 01 and 06): one flat row per folder and file, a rule file with the
// "rule" tag. The pure helpers beside the list are shared by the preview and the dialog.

interface TreeRow {
  readonly path: string;
  readonly depth: number;
  readonly name: string;
  readonly folder: boolean;
  readonly rule: boolean;
}

// The rows of the tree in the order they are shown: each folder, then its children.
export function treeRows(nodes: readonly TreeNode[], depth = 0): TreeRow[] {
  return nodes.flatMap((node) =>
    node.kind === 'folder'
      ? [
          { path: node.path, depth, name: `${node.name}/`, folder: true, rule: false },
          ...treeRows(node.children, depth + 1),
        ]
      : [{ path: node.path, depth, name: node.name, folder: false, rule: node.rule }],
  );
}

// The number of files in the tree. Folders are not counted.
export function countFiles(nodes: readonly TreeNode[]): number {
  return nodes.reduce((total, node) => total + (node.kind === 'file' ? 1 : countFiles(node.children)), 0);
}

// "1 file" or "23 files", with the order the project writes them (screen 01).
export function fileCountText(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}, in the order the project writes them.`;
}

export interface ProjectTreeListProps {
  readonly nodes: readonly TreeNode[];
}

export function ProjectTreeList({ nodes }: ProjectTreeListProps) {
  const styles = getProjectPreviewStyles(useTheme());
  return (
    <Box component="ul" sx={styles.list}>
      {treeRows(nodes).map((row) => (
        <Box component="li" key={row.path} sx={styles.row(row.depth, row.folder)}>
          <Box component="span">{row.name}</Box>
          {row.rule ? <Box component="span" sx={styles.tag}>rule</Box> : null}
        </Box>
      ))}
    </Box>
  );
}
