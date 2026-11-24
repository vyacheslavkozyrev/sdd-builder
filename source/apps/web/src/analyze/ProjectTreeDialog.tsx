import { useId } from 'react';
import { Box, Button, Dialog, Typography, useTheme } from '@mui/material';
import { getProjectPreviewStyles } from './projectPreviewStyles.js';
import { countFiles, fileCountText, ProjectTreeList } from './ProjectTreeList.js';
import type { TreeNode } from './tree.js';

// The full list of the project files (F-13 AC-023; screen 06): a dialog over the step with the whole tree and Close.

export interface ProjectTreeDialogProps {
  readonly open: boolean;
  readonly tree: readonly TreeNode[];
  readonly onClose: () => void;
}

export function ProjectTreeDialog({ open, tree, onClose }: ProjectTreeDialogProps) {
  const styles = getProjectPreviewStyles(useTheme());
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} slotProps={{ paper: { sx: styles.dialogPaper } }}>
      <Typography id={titleId} component="h2" sx={styles.dialogTitle}>
        Project files
      </Typography>
      <Typography component="p" sx={styles.dialogCount}>
        {`${fileCountText(countFiles(tree))} Rule files are marked.`}
      </Typography>
      <Box sx={styles.dialogPanel}>
        <ProjectTreeList nodes={tree} />
      </Box>
      <Box sx={styles.dialogActions}>
        <Button variant="outlined" onClick={onClose} sx={styles.close}>
          Close
        </Button>
      </Box>
    </Dialog>
  );
}
