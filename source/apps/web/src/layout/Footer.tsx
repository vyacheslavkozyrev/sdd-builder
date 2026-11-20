import { Box, Typography } from '@mui/material';

// The footer of the shared frame (F-07 AC-004, AC-005, AC-014). It is a note only:
// the work is not saved and is lost when the browser is refreshed. It holds no button
// and no link, so there is no save, download or persistence control here.
// Sizes follow the approved screens: note at x 284 (24 px in from the panel edge),
// 12 px text, 24 px gap above the note (below the content card) and 24 px below it.
// The gap above is part of the footer, so the frame does not need to add it.

export function Footer() {
  return (
    <Box component="footer" sx={{ px: 3, pt: 3, pb: 3, boxSizing: 'border-box' }}>
      <Typography component="p" sx={{ m: 0, fontSize: 12, lineHeight: '20px', color: '#636B74' }}>
        The work is not saved. It is lost when the browser is refreshed.
      </Typography>
    </Box>
  );
}
