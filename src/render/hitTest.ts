/** Pure helpers for board touch handling (no React Native imports). */

/** Max finger travel (pt) for a touch to still count as a tap. */
export const TAP_SLOP = 12;
/** Longer presses are treated as a hold, not a tap. */
export const TAP_MAX_MS = 800;

export interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/** Row-major cell index at board-local (x, y), or -1 outside the board. */
export function cellIndexAt(x: number, y: number, cell: number, cols: number, rows: number): number {
  if (!(cell > 0) || x < 0 || y < 0) return -1;
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  if (cx >= cols || cy >= rows) return -1;
  return cy * cols + cx;
}

export function isTap(start: TouchPoint, end: TouchPoint): boolean {
  return (
    Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP && end.t - start.t >= 0 && end.t - start.t <= TAP_MAX_MS
  );
}

/**
 * The cell a tap lands on. Uses the touch-down position so a small drift
 * across a cell border still rotates the tile the finger started on.
 */
export function tappedCell(
  start: TouchPoint,
  end: TouchPoint,
  cell: number,
  cols: number,
  rows: number,
): number {
  return isTap(start, end) ? cellIndexAt(start.x, start.y, cell, cols, rows) : -1;
}
