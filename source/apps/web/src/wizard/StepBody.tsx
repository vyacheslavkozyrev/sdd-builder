import { useId } from 'react';
import { Box, Typography } from '@mui/material';

// The step body (F-08 AC-013, AC-015). It shows the placeholder line only: no
// step title, no step counter and no input (F-08 adds no field). The stepper
// names the step. The real content of each step comes in F-09 to F-13.
// The body fills the space below the stepper row, on a white card.

export const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

const CARD_SX = {
  position: 'relative',
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  bgcolor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.12)',
  overflow: 'hidden',
} as const;

const ACCENT_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 6,
  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
} as const;

const MARK_SX = {
  width: 88,
  height: 88,
  borderRadius: '50%',
  bgcolor: '#ffffff',
  border: '2px solid #a5b4fc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

// A decorative sparkle drawn inline, so no icon library is added (architecture.md §5).
// The gradient id is unique per instance, so two rendered bodies never share one.
function SparkleIcon({ gradientId }: { gradientId: string }) {
  return (
    <svg width="52" height="52" viewBox="614 384 52 52" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M640 384 L646 404 L666 410 L646 416 L640 436 L634 416 L614 410 L634 404 Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

export function StepBody() {
  const gradientId = useId();
  return (
    <Box sx={CARD_SX}>
      <Box aria-hidden="true" sx={ACCENT_SX} />
      <Box sx={MARK_SX}>
        <SparkleIcon gradientId={gradientId} />
      </Box>
      <Typography sx={{ fontSize: 17, fontWeight: 600, color: '#4338ca' }}>
        {PLACEHOLDER_LINE}
      </Typography>
    </Box>
  );
}
