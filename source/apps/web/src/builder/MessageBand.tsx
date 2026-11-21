import { Box, useTheme } from '@mui/material';
import { getMessageBandStyles } from './builderStyles.js';

// The message band at the top centre of the builder (F-11 AC-014). It shows one line: the reason of a
// refused drag or repoint, shown while it applies. Blockers and warnings are not shown here; they are
// collected in the error panel (ErrorPanel). With no refusal it draws nothing.

export interface MessageBandProps {
  // The reason of the last refused drag or repoint, or null when there is none to show.
  readonly refusal: string | null;
}

export function MessageBand({ refusal }: MessageBandProps) {
  const styles = getMessageBandStyles(useTheme());
  if (refusal === null) {
    return null;
  }
  return (
    <Box role="status" sx={styles.root}>
      <Box sx={styles.message}>{`Refused · ${refusal}`}</Box>
    </Box>
  );
}
