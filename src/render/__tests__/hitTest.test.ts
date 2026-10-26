import { TAP_MAX_MS, TAP_SLOP, cellIndexAt, isTap, tappedCell } from '../hitTest';

describe('cellIndexAt', () => {
  it('maps board-local points to row-major indices', () => {
    expect(cellIndexAt(0, 0, 50, 4, 3)).toBe(0);
    expect(cellIndexAt(49.9, 49.9, 50, 4, 3)).toBe(0);
    expect(cellIndexAt(50, 0, 50, 4, 3)).toBe(1);
    expect(cellIndexAt(199, 149, 50, 4, 3)).toBe(11);
  });

  it('returns -1 outside the board or for a zero cell size', () => {
    expect(cellIndexAt(-1, 10, 50, 4, 3)).toBe(-1);
    expect(cellIndexAt(200, 10, 50, 4, 3)).toBe(-1);
    expect(cellIndexAt(10, 150, 50, 4, 3)).toBe(-1);
    expect(cellIndexAt(10, 10, 0, 4, 3)).toBe(-1);
  });
});

describe('tap classification', () => {
  const start = { x: 60, y: 60, t: 1000 };

  it('accepts short, still touches', () => {
    expect(isTap(start, { x: 61, y: 62, t: 1080 })).toBe(true);
    expect(isTap(start, { x: 60 + TAP_SLOP, y: 60, t: 1000 + TAP_MAX_MS })).toBe(true);
  });

  it('rejects drags, long holds and out-of-order timestamps', () => {
    expect(isTap(start, { x: 60 + TAP_SLOP + 1, y: 60, t: 1050 })).toBe(false);
    expect(isTap(start, { x: 60, y: 60, t: 1000 + TAP_MAX_MS + 1 })).toBe(false);
    expect(isTap(start, { x: 60, y: 60, t: 999 })).toBe(false);
  });

  it('uses the touch-down cell when the finger drifts over a border', () => {
    expect(tappedCell({ x: 48, y: 10, t: 0 }, { x: 55, y: 10, t: 50 }, 50, 4, 3)).toBe(0);
    expect(tappedCell(start, { x: 120, y: 60, t: 1050 }, 50, 4, 3)).toBe(-1);
  });
});
