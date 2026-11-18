import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

// The confirmation before a delete on the Pipeline tab (F-11 AC-016, AC-031; screens 02 and 05). Cancel only closes it:
// the caller changes the pipeline on Confirm and never before, so Cancel leaves the pipeline as it was.

const TITLE_ID = 'confirm-dialog-title';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly children: ReactNode;
}

export function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Dialog open onClose={onCancel} aria-labelledby={TITLE_ID} fullWidth maxWidth="xs">
      <DialogTitle id={TITLE_ID}>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
