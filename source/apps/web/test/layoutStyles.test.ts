import { createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme.js';
import { getAppFrameStyles, getFooterStyles, getLeftPanelStyles } from '../src/layout/layoutStyles.js';

// The style getters read their colours from the theme they are given (.claude/rules/web-styling.md).
// The component tests render without the app theme, so these tests prove the palette is the source:
// a different palette changes the output, and the app theme gives the approved values.

describe('style getters read colours from the theme palette', () => {
  const other = createTheme({
    palette: {
      background: { default: '#000001', paper: '#000002' },
      text: { primary: '#000003', secondary: '#000004' },
      divider: '#000005',
      grey: { 300: '#000006' },
    },
  });

  it('the left panel uses the theme divider, paper and text colours', () => {
    const styles = getLeftPanelStyles(other);
    expect(styles.root).toMatchObject({ borderRight: '1px solid #000005', bgcolor: '#000002' });
    expect(styles.wordmark).toMatchObject({ color: '#000003' });
    expect(styles.newProjectButton).toMatchObject({ borderColor: '#000006', color: '#000003', bgcolor: '#000002' });
  });

  it('the app frame uses the theme page and paper colours', () => {
    const styles = getAppFrameStyles(other);
    expect(styles.root).toMatchObject({ bgcolor: '#000001' });
    expect(styles.main).toMatchObject({ bgcolor: '#000002', border: '1px solid #000005' });
  });

  it('the footer note uses the theme secondary text colour', () => {
    expect(getFooterStyles(other).note).toMatchObject({ color: '#000004' });
  });

  it('the app theme gives the approved Material Kit values for the frame and the note', () => {
    expect(getLeftPanelStyles(theme).root).toMatchObject({ borderRight: '1px solid #DDE7EE', bgcolor: '#FFFFFF' });
    expect(getAppFrameStyles(theme).root).toMatchObject({ bgcolor: '#F0F4F8' });
    expect(getFooterStyles(theme).note).toMatchObject({ color: '#636B74' });
  });

  it('the card shadow is the approved soft shadow, not the default MUI shadow', () => {
    expect(getAppFrameStyles(theme).main).toMatchObject({ boxShadow: '0 1px 4px rgba(50, 56, 62, 0.12)' });
  });
});
