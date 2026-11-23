import { useId, useState } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import type { Arrow } from './connect.js';
import { removeConnection } from './connect.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { getConnectionPanelStyles } from './connectionPanelStyles.js';
import { arrowPanel } from './panel.js';
import type { Pipeline } from './fields.js';

// The connection panel of the Pipeline tab (F-11 AC-017, AC-018, screen 02). It shows the source and the
// target of the selected arrow as read-only names: there is no field that changes them, and an arrow is
// repointed only by a drag on the canvas (AC-016). Its footer holds Delete connection, which asks first
// (AC-018). Only Confirm removes the link, through removeConnection: the source's next flow is cleared and
// the target flow and every other field stay as they are. Cancel keeps the arrow.

// The note under the read-only names: where the artifacts and the approval of the connection are edited.
const SOURCE_NOTE = "Artifacts and approval are in the source flow's panel.";

export interface ConnectionPanelProps {
  readonly pipelineState: Pipeline;
  readonly arrow: Arrow;
  readonly onDelete: (pipelineState: Pipeline) => void;
}

export function ConnectionPanel({ pipelineState, arrow, onDelete }: ConnectionPanelProps) {
  const styles = getConnectionPanelStyles(useTheme());
  const [confirming, setConfirming] = useState(false);
  const names = arrowPanel(pipelineState, arrow);
  const sourceLabelId = useId();
  const targetLabelId = useId();

  return (
    <Box sx={styles.root}>
      <Box sx={styles.fields}>
        <Box sx={styles.group}>
          <Typography id={sourceLabelId} component="p" sx={styles.label}>
            Source · read only
          </Typography>
          <Box aria-labelledby={sourceLabelId} sx={styles.readOnly}>
            {names.sourceName}
          </Box>
        </Box>

        <Box sx={styles.group}>
          <Typography id={targetLabelId} component="p" sx={styles.label}>
            Target · read only
          </Typography>
          <Box aria-labelledby={targetLabelId} sx={styles.readOnly}>
            {names.targetName}
          </Box>
        </Box>

        <Typography component="p" sx={styles.note}>
          {SOURCE_NOTE}
        </Typography>
      </Box>

      <Box sx={styles.footer}>
        <Button
          variant="contained"
          onClick={() => {
            setConfirming(true);
          }}
          sx={styles.deleteButton}
        >
          Delete connection
        </Button>
      </Box>

      <ConfirmDialog
        open={confirming}
        title="Delete connection?"
        text="Are you sure you want to delete this connection?"
        confirmLabel="Delete connection"
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          const result = removeConnection(pipelineState, arrow.source);
          if (!result.ok) {
            // The arrow was checked by arrowPanel above, so a refusal here is a programmer error.
            throw new Error(`F-11: ${result.reason}`);
          }
          onDelete(result.pipeline);
        }}
      />
    </Box>
  );
}
