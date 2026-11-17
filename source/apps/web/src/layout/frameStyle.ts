// Sizing of the application frame (F-07 AC-009, AC-010).
// Pure: returns plain style values; the React layer applies them.
// The frame fills the window, never goes below 1024 px wide, and never hides
// overflow or narrows to a phone column. Below 1024 px the page scrolls.

export const FRAME_MIN_WIDTH_PX = 1024;

export interface FrameStyle {
  readonly width: '100%';
  readonly minWidth: `${typeof FRAME_MIN_WIDTH_PX}px`;
  readonly minHeight: '100vh';
}

export function frameStyle(): FrameStyle {
  return {
    width: '100%',
    minWidth: `${FRAME_MIN_WIDTH_PX}px`,
    minHeight: '100vh',
  };
}
