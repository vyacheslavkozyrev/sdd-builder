import { describe, expect, it } from 'vitest';
import { getConfirmDialogStyles } from '../src/builder/confirmDialogStyles.js';
import { getConnectionPanelStyles } from '../src/builder/connectionPanelStyles.js';
import { getFlowPanelStyles } from '../src/builder/flowPanelStyles.js';
import { getRowEditorStyles } from '../src/builder/rowEditorStyles.js';
import { getCommonStyles } from '../src/styles/common.js';
import { theme } from '../src/theme.js';

// Button captions in the builder never wrap onto a second line (F-11 AC-006, layout follow-up of Amendment
// 2026-11-21: the properties footer and the confirmation dialogs). The checklist has no device item for this
// point, so the test is the proof. The shared shapes in common.ts carry the rule; each getter takes its button
// from them, so the check reads the shared shape and the getters that use it.

const common = getCommonStyles(theme);

describe('F-11 AC-006 layout follow-up: button captions do not wrap', () => {
  it.each([
    ['danger button', common.dangerButton],
    ['outline button', common.outlineButton],
    ['panel delete button', common.panelDeleteButton],
    ['dialog cancel button', common.dialogCancel],
    ['dialog confirm button', common.dialogConfirm],
    ['plus and minus button', common.plusMinusButton],
  ])('F-11 AC-006 layout follow-up: the shared %s has whiteSpace nowrap', (_name, shape) => {
    expect(shape).toMatchObject({ whiteSpace: 'nowrap' });
  });

  it.each([
    ['danger button', common.dangerButton],
    ['outline button', common.outlineButton],
    ['panel delete button', common.panelDeleteButton],
    ['dialog cancel button', common.dialogCancel],
    ['dialog confirm button', common.dialogConfirm],
    ['plus and minus button', common.plusMinusButton],
  ])('F-11 AC-006 layout follow-up: the shared %s has no fixed width, so the width follows the caption', (_name, shape) => {
    expect(shape).not.toHaveProperty('width');
  });

  it('F-11 AC-006 layout follow-up: the Delete connection button in the connection panel has a minimum width and no wrap', () => {
    const button = getConnectionPanelStyles(theme).deleteButton;
    expect(button).toMatchObject({ whiteSpace: 'nowrap', minWidth: 130, height: 40 });
    expect(button).not.toHaveProperty('width');
  });

  it('F-11 AC-006 layout follow-up: the Delete flow button in the flow panel has a minimum width and no wrap', () => {
    const button = getFlowPanelStyles(theme).deleteButton;
    expect(button).toMatchObject({ whiteSpace: 'nowrap', minWidth: 130, height: 40 });
    expect(button).not.toHaveProperty('width');
  });

  it('F-11 AC-006 layout follow-up: the Cancel and confirming buttons of the dialog have a minimum width and no wrap', () => {
    const styles = getConfirmDialogStyles(theme);
    expect(styles.cancel).toMatchObject({ whiteSpace: 'nowrap', minWidth: 120, height: 40 });
    expect(styles.confirm).toMatchObject({ whiteSpace: 'nowrap', minWidth: 120, height: 40 });
    expect(styles.cancel).not.toHaveProperty('width');
    expect(styles.confirm).not.toHaveProperty('width');
  });

  it('F-11 AC-006 layout follow-up: the plus and minus controls keep a 28 px minimum and do not wrap', () => {
    const styles = getRowEditorStyles(theme);
    expect(styles.addButton).toMatchObject({ whiteSpace: 'nowrap', minWidth: 28, height: 28 });
    expect(styles.minusButton).toMatchObject({ whiteSpace: 'nowrap', minWidth: 28, height: 28 });
  });
});
