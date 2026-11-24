import { useState } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import type { AnalysisState } from './analysisState.js';
import { generateDisabledReason } from './generateReason.js';
import { getProjectPreviewStyles } from './projectPreviewStyles.js';
import { ProjectTreeDialog } from './ProjectTreeDialog.js';
import { countFiles, fileCountText, ProjectTreeList } from './ProjectTreeList.js';
import type { TreeNode } from './tree.js';

// The project preview column of step 4 (F-13 AC-022, AC-023, AC-025): the tree, Show full tree and Generate and
// download with its reason. It sends no request. Generate stays disabled until its action is wired (F-13 T012).

export interface ProjectPreviewProps {
  readonly tree: readonly TreeNode[];
  readonly state: AnalysisState;
  readonly configKey: string;
}

export function ProjectPreview({ tree, state, configKey }: ProjectPreviewProps) {
  const styles = getProjectPreviewStyles(useTheme());
  const [fullOpen, setFullOpen] = useState(false);
  const reason = generateDisabledReason(state, configKey);
  return (
    <Box sx={styles.root}>
      <Typography component="h2" sx={styles.heading}>
        Project preview
      </Typography>
      <Typography component="p" sx={styles.count}>
        {fileCountText(countFiles(tree))}
      </Typography>
      <Box sx={styles.panel}>
        <ProjectTreeList nodes={tree} />
      </Box>
      <Button variant="outlined" onClick={() => setFullOpen(true)} sx={styles.fullTree}>
        Show full tree
      </Button>
      <Button variant="contained" disableElevation disabled sx={styles.generate}>
        Generate and download
      </Button>
      {reason === null ? null : (
        <Typography component="p" sx={styles.reason}>
          {reason}
        </Typography>
      )}
      <Typography component="p" sx={styles.note}>
        Contents are written by the model when you generate.
      </Typography>
      <ProjectTreeDialog open={fullOpen} tree={tree} onClose={() => setFullOpen(false)} />
    </Box>
  );
}
