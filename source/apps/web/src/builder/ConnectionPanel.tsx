import { useId, useState } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import type { Arrow } from './connect.js';
import { removeConnection } from './connect.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { getConnectionPanelStyles } from './connectionPanelStyles.js';
import { arrowPanel } from './panel.js';
import type { Pipeline } from './fields.js';
import { arrowPanel as blockArrowPanel, type BlockArrow } from './blockArrows.js';
import { removeBlockArrow } from './blockLink.js';
import type { Flow } from './model.js';

// The connection panels of the F-11 Pipeline tab (F-11 AC-017, AC-018, screen 02) and of a flow tab (F-12 AC-021).
// They show the source and the target of the selected arrow as read-only names: there is no field that changes
// them, and an arrow is repointed only by a drag on the canvas (AC-016). Their footer holds Delete connection,
// which asks first (AC-018). Only Confirm removes the link: the pipeline's link through removeConnection, a block
// arrow through removeBlockArrow, which clears the route and leaves the other arrows as they are. Cancel keeps the arrow.

// The note under the read-only names: where the artifacts and the approval of the connection are edited.
const SOURCE_NOTE = "Artifacts and approval are in the source flow's panel.";

interface ArrowDeleteViewProps {
  readonly sourceName: string;
  readonly targetName: string;
  readonly note?: string;
  readonly onConfirm: () => void;
}

// The fields and the footer shared by both connection panels: the source and target names read-only, an optional
// note, and Delete connection, which asks first. Only Confirm calls `onConfirm`.
function ArrowDeleteView({ sourceName, targetName, note, onConfirm }: ArrowDeleteViewProps) {
  const styles = getConnectionPanelStyles(useTheme());
  const [confirming, setConfirming] = useState(false);
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
            {sourceName}
          </Box>
        </Box>

        <Box sx={styles.group}>
          <Typography id={targetLabelId} component="p" sx={styles.label}>
            Target · read only
          </Typography>
          <Box aria-labelledby={targetLabelId} sx={styles.readOnly}>
            {targetName}
          </Box>
        </Box>

        {note === undefined ? null : (
          <Typography component="p" sx={styles.note}>
            {note}
          </Typography>
        )}
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
          onConfirm();
        }}
      />
    </Box>
  );
}

export interface ConnectionPanelProps {
  readonly pipelineState: Pipeline;
  readonly arrow: Arrow;
  readonly onDelete: (pipelineState: Pipeline) => void;
}

export function ConnectionPanel({ pipelineState, arrow, onDelete }: ConnectionPanelProps) {
  const names = arrowPanel(pipelineState, arrow);

  return (
    <ArrowDeleteView
      sourceName={names.sourceName}
      targetName={names.targetName}
      note={SOURCE_NOTE}
      onConfirm={() => {
        const result = removeConnection(pipelineState, arrow.source);
        if (!result.ok) {
          // The arrow was checked by arrowPanel above, so a refusal here is a programmer error.
          throw new Error(`F-11: ${result.reason}`);
        }
        onDelete(result.pipeline);
      }}
    />
  );
}

export interface BlockArrowPanelProps {
  readonly flow: Flow;
  readonly arrow: BlockArrow;
  readonly onDelete: (flow: Flow) => void;
}

// The panel of an arrow between two blocks of a flow (F-12 AC-021): the names of its blocks, read-only, and Delete
// connection. Confirm clears the route of the arrow's output through removeBlockArrow and reports the new flow; the
// blocks keep their properties and no other arrow changes. The arrow's panel has no note.
export function BlockArrowPanel({ flow, arrow, onDelete }: BlockArrowPanelProps) {
  const names = blockArrowPanel(flow, arrow);

  return (
    <ArrowDeleteView
      sourceName={names.source}
      targetName={names.target}
      onConfirm={() => {
        onDelete(removeBlockArrow(flow, arrow.fromId, arrow.output));
      }}
    />
  );
}
