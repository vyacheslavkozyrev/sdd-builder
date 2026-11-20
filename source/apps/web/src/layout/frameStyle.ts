// Sizing of the shared frame (F-07 AC-009, AC-010). Pure: returns the style
// object, no React. The frame fills the window, keeps a minimum width of
// 1024 px and a minimum height of the full window; it never sets a maximum
// width and never hides overflow, so a narrower window scrolls.

export const FRAME_MIN_WIDTH_PX = 1024;

export interface FrameStyle {
  readonly width: '100%';
  readonly minWidth: `${number}px`;
  readonly minHeight: '100vh';
}

export function frameStyle(): FrameStyle {
  return {
    width: '100%',
    minWidth: `${FRAME_MIN_WIDTH_PX}px`,
    minHeight: '100vh',
  };
}
