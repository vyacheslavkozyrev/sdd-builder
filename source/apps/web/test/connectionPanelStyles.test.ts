import { describe, expect, it } from 'vitest';
import { getConnectionPanelStyles } from '../src/builder/connectionPanelStyles.js';
import { getFlowPanelStyles } from '../src/builder/flowPanelStyles.js';
import { FIELD_HEIGHT, getCommonStyles } from '../src/styles/common.js';
import { theme } from '../src/theme.js';

// The connection panel uses the same shared shapes and spacing as the flow panel (F-11 AC-017, layout
// correction T038). The check reads the getters: the shapes are the ones of common.ts, and the values
// are the flow panel's.

const common = getCommonStyles(theme);
const connection = getConnectionPanelStyles(theme);
const flow = getFlowPanelStyles(theme);

describe('F-11 AC-017 connection panel uses the shared panel shapes and the flow panel spacing', () => {
  it('F-11 AC-017 the fields column, the label groups and the label are the flow panel shapes', () => {
    expect(connection.fields).toEqual(flow.scroll);
    expect(connection.fields).toEqual(common.panelFields);
    expect(connection.group).toEqual(flow.group);
    expect(connection.label).toEqual(flow.fieldLabel);
    expect(connection.fields).toMatchObject({ gap: '24px', px: '16px', overflowY: 'auto' });
    expect(connection.group).toMatchObject({ gap: '8px', flexDirection: 'column' });
    expect(connection.label).toMatchObject({ lineHeight: '16px', mb: 0 });
  });

  it('F-11 AC-017 the read-only box is a 40 px field: the flow field height, outline colour, corner radius and text inset', () => {
    // The flow field's own parts, read from its getter, so the box is checked against the field and not a copy of it.
    const flowField = flow.field as Record<string, Record<string, unknown>>;
    expect(flowField['& .MuiInputBase-root']).toEqual({ height: FIELD_HEIGHT });
    expect(flowField['& .MuiOutlinedInput-notchedOutline']).toEqual({ borderColor: theme.palette.grey[300] });
    expect(connection.readOnly).toMatchObject({
      height: flowField['& .MuiInputBase-root']?.height,
      borderRadius: flowField['& .MuiOutlinedInput-root']?.borderRadius,
      border: `1px solid ${theme.palette.grey[300]}`,
      px: flowField['& .MuiOutlinedInput-input']?.px,
      fontSize: flowField['& .MuiOutlinedInput-input']?.fontSize,
      alignItems: 'center',
    });
    expect(connection.readOnly).toMatchObject({ bgcolor: theme.palette.grey[100], lineHeight: '20px' });
  });

  it('F-11 AC-017 the note is the helper text style of the flow panel footer note', () => {
    expect(connection.note).toEqual(common.secondaryText);
    expect(connection.note).toEqual(flow.footerNote);
  });

  it('F-11 AC-017 the footer and the Delete connection button are the Delete flow shapes, with nowrap captions', () => {
    expect(connection.root).toEqual(flow.root);
    expect(connection.footer).toEqual(flow.footer);
    expect(connection.footer).toEqual(common.panelFooter);
    expect(connection.deleteButton).toEqual(flow.deleteButton);
    expect(connection.deleteButton).toEqual(common.panelDeleteButton);
    expect(connection.deleteButton).toMatchObject({ whiteSpace: 'nowrap', minWidth: 130, height: 40 });
  });

  it('F-11 AC-017 negative case: the read-only box is not a field with a white fill', () => {
    expect(connection.readOnly).not.toHaveProperty('bgcolor', theme.palette.background.paper);
  });
});
