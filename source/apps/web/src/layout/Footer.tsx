import { Box, Typography, useTheme } from '@mui/material';
import { getFooterStyles } from './layoutStyles.js';

// The footer of the shared frame (F-07 AC-004, AC-005, AC-014). It is a note only:
// the work is not saved and is lost when the browser is refreshed. It holds no button
// and no link, so there is no save, download or persistence control here.
// Sizes: note at x 284 (24 px in from the panel edge), 12 px text, 12 px gap above the note
// (below the content card) and 12 px below it, as the owner asked (the approved screens
// draw 24 px). The gap above is part of the footer, so the frame does not need to add it.

export function Footer() {
  const styles = getFooterStyles(useTheme());
  return (
    <Box component="footer" sx={styles.root}>
      <Typography component="p" sx={styles.note}>
        The work is not saved. It is lost when the browser is refreshed.
      </Typography>
    </Box>
  );
}
