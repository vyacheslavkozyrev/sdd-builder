import type { Theme } from '@mui/material/styles';
import { getCommonStyles } from '../styles/common.js';
import type { StyleObject } from '../styles/common.js';

// Style getter for the confirmation dialog (.claude/rules/web-styling.md). The dialog shapes are the
// shared ones of common.ts, the same as the Remove dialog of the technical details step, so this getter
// only names them for ConfirmDialog.

export interface ConfirmDialogStyles {
  readonly paper: StyleObject;
  readonly title: StyleObject;
  readonly text: StyleObject;
  readonly actions: StyleObject;
  readonly cancel: StyleObject;
  readonly confirm: StyleObject;
}

export function getConfirmDialogStyles(theme: Theme): ConfirmDialogStyles {
  const common = getCommonStyles(theme);
  return {
    paper: common.dialogPaper,
    title: common.dialogTitle,
    text: common.dialogText,
    actions: common.dialogActions,
    cancel: common.dialogCancel,
    confirm: common.dialogConfirm,
  };
}
