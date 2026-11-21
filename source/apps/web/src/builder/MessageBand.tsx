import { Box, useTheme } from '@mui/material';
import { getMessageBandStyles } from './builderStyles.js';

// The message band at the top centre of the builder (F-11 AC-014, AC-035). It shows a refused drag or
// repoint with its reason, and a blocker's message. Each line starts with its kind: "Refused ·" or
// "Blocker ·". With no message it draws nothing.

export type BandMessage =
  | { readonly kind: 'refused'; readonly text: string }
  | { readonly kind: 'blocker'; readonly text: string };

export interface MessageBandProps {
  readonly messages: readonly BandMessage[];
}

const kindLabels: Record<BandMessage['kind'], string> = {
  refused: 'Refused',
  blocker: 'Blocker',
};

export function MessageBand({ messages }: MessageBandProps) {
  const styles = getMessageBandStyles(useTheme());
  if (messages.length === 0) {
    return null;
  }
  return (
    <Box role="status" sx={styles.root}>
      {messages.map((message, index) => (
        <Box key={`${message.kind}-${index}`} sx={styles.message}>
          {`${kindLabels[message.kind]} · ${message.text}`}
        </Box>
      ))}
    </Box>
  );
}
