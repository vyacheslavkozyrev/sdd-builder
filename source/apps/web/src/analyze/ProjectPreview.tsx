import { useState } from 'react';
import { Box, Button, LinearProgress, Typography, useTheme } from '@mui/material';
import { isGreen, type AnalysisState } from './analysisState.js';
import type { GenerateState } from './generate.js';
import { generateDisabledReason } from './generateReason.js';
import { getProjectPreviewStyles } from './projectPreviewStyles.js';
import { ProjectTreeDialog } from './ProjectTreeDialog.js';
import { countFiles, fileCountText, ProjectTreeList } from './ProjectTreeList.js';
import { errorMessage, problemLines } from './reply.js';
import type { TreeNode } from './tree.js';

// The project preview column of step 4 (F-13 AC-022, AC-023, AC-025, AC-026, AC-028, AC-029): the tree, Show full tree
// and Generate and download with its reason. The view sends no request: a click calls onGenerate, and the step's action
// sends it. Generate is enabled only on a green analysis of the current configuration (AC-025) and not while the files
// are written (AC-026); a failed generate shows its text and every 422 problem line (AC-028, AC-029).

const PENDING_LABEL = 'Writing the files with the model…';

export interface ProjectPreviewProps {
  readonly tree: readonly TreeNode[];
  readonly state: AnalysisState;
  readonly configKey: string;
  readonly generation: GenerateState;
  readonly onGenerate: () => void;
}

export function ProjectPreview({ tree, state, configKey, generation, onGenerate }: ProjectPreviewProps) {
  const styles = getProjectPreviewStyles(useTheme());
  const [fullOpen, setFullOpen] = useState(false);
  const pending = generation.kind === 'pending';
  const enabled = isGreen(state, configKey) && !pending;
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
      <Button variant="outlined" disabled={pending} onClick={() => setFullOpen(true)} sx={styles.fullTree}>
        Show full tree
      </Button>
      <Button variant="contained" disableElevation disabled={!enabled} onClick={onGenerate} sx={styles.generate}>
        {pending ? PENDING_LABEL : 'Generate and download'}
      </Button>
      {pending ? <LinearProgress aria-label={PENDING_LABEL} sx={styles.progress} /> : null}
      {reason === null || pending ? null : (
        <Typography component="p" sx={styles.reason}>
          {reason}
        </Typography>
      )}
      {generation.kind === 'error' ? (
        <Box role="alert" sx={styles.error}>
          <Typography component="p" sx={styles.errorText}>
            {errorMessage(generation.failure)}
          </Typography>
          {problemLines(generation.failure.body).map((line, index) => (
            <Typography key={index} component="p" sx={styles.errorDetail}>
              {line}
            </Typography>
          ))}
        </Box>
      ) : null}
      <Typography component="p" sx={styles.note}>
        Contents are written by the model when you generate.
      </Typography>
      <ProjectTreeDialog open={fullOpen} tree={tree} onClose={() => setFullOpen(false)} />
    </Box>
  );
}
