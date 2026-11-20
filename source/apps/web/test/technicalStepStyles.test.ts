import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme.js';
import { getTechnicalStepStyles } from '../src/wizard/technicalStepStyles.js';

// F-10 AC-025 (layout): the divider between the two columns is 1 px wide. MUI's sx reads a bare
// number of 1 or less for a width as a percentage, so a width of 1 would stretch the divider over
// the card and push the rule list out of view.
describe('F-10 AC-025 technical step divider', () => {
  it('the divider width is 1px, not a percentage', () => {
    const divider = getTechnicalStepStyles(theme).divider as { width?: unknown };
    expect(divider.width).toBe('1px');
  });
});
