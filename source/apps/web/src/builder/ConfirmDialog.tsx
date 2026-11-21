import { useId } from 'react';
import { Box, Button, Dialog, Typography, useTheme } from '@mui/material';
import { getConfirmDialogStyles } from './confirmDialogStyles.js';

// The confirmation of a delete in the builder (F-11 AC-018, AC-029, screen 04). It is centred over the
// screen and dims it. Cancel closes it and changes nothing; the confirming button calls `onConfirm`, and
// the caller then makes the change. Used for Delete flow and Delete connection.

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly text: string;
  readonly confirmLabel: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ConfirmDialog({ open, title, text, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const styles = getConfirmDialogStyles(useTheme());
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby={titleId} slotProps={{ paper: { sx: styles.paper } }}>
      <Typography id={titleId} component="h3" sx={styles.title}>
        {title}
      </Typography>
      <Typography component="p" sx={styles.text}>
        {text}
      </Typography>
      <Box sx={styles.actions}>
        <Button variant="outlined" onClick={onCancel} sx={styles.cancel}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} sx={styles.confirm}>
          {confirmLabel}
        </Button>
      </Box>
    </Dialog>
  );
}
