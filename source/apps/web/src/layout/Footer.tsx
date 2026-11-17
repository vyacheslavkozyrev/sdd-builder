import { Box, Typography } from '@mui/material';

// The application footer (F-07 AC-004, AC-005, AC-014).
// A 48 px white bar with a top divider. It holds the not-saved note on the left
// and no button or link (ui.md §1.2).

const FOOTER_NOTE = 'The work is not saved. It is lost when the browser is refreshed.';

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        height: 48,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        px: 3,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" component="p" sx={{ m: 0, color: '#64748b' }}>
        {FOOTER_NOTE}
      </Typography>
    </Box>
  );
}
