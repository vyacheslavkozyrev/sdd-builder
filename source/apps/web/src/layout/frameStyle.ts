// Sizing of the shared frame (F-07 AC-009, AC-010). Pure: returns the style
// object, no React. The frame fills the window, keeps a minimum width of
// 1024 px and a minimum height of the full window; it never sets a maximum
// width and never hides overflow, so a narrower window scrolls.

export const FRAME_MIN_WIDTH_PX = 1024;

// The width both frame modes share: the full window width, never narrower than the minimum.
const SHARED_WIDTH = {
  width: '100%',
  minWidth: `${FRAME_MIN_WIDTH_PX}px`,
} as const;

export interface FrameStyle {
  readonly width: '100%';
  readonly minWidth: `${number}px`;
  readonly minHeight: '100vh';
}

export function frameStyle(): FrameStyle {
  return {
    ...SHARED_WIDTH,
    minHeight: '100vh',
  };
}

export interface FillFrameStyle {
  readonly width: '100%';
  readonly minWidth: `${number}px`;
  readonly height: '100vh';
  readonly overflowY: 'hidden';
}

// The frame of a step that fills the window (F-11 step 3, layout points 2 and 3): the height is the window's,
// so the page never scrolls vertically and only the cards' own content scrolls. overflowY hidden keeps a short
// window from scrolling the page; a window narrower than the minimum width still scrolls sideways.
export function fillFrameStyle(): FillFrameStyle {
  return {
    ...SHARED_WIDTH,
    height: '100vh',
    overflowY: 'hidden',
  };
}
