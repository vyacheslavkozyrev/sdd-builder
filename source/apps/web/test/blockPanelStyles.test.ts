import { describe, expect, it } from 'vitest';
import { getBlockPanelStyles } from '../src/builder/blockPanelStyles.js';
import { getFlowPanelStyles } from '../src/builder/flowPanelStyles.js';
import { theme } from '../src/theme.js';

describe('F-12 (no criterion: Verify device fix 2026-11-23) the End panel dropdown', () => {
  it('takes the select of the F-11 flow panel, so its fields match', () => {
    expect(getBlockPanelStyles(theme).select).toEqual(getFlowPanelStyles(theme).select);
  });

  it('fills the 40 px field and clears the chevron, so a value is not cut off', () => {
    expect(getBlockPanelStyles(theme).select).toMatchObject({
      '& .MuiNativeSelect-select': expect.objectContaining({ height: '100%', pr: 5, pl: 2 }),
    });
  });
});
