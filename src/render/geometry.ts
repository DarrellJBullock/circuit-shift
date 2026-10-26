import { EAST, NORTH, PORTS, type Port, SOUTH, WEST, hasPort } from '@/engine';

/** Cell-local edge midpoint for each port; the cell spans [0, size]. */
function edgePoint(port: Port, size: number): [number, number] {
  const h = size / 2;
  switch (port) {
    case NORTH:
      return [h, 0];
    case EAST:
      return [size, h];
    case SOUTH:
      return [h, size];
    case WEST:
      return [0, h];
  }
}

/**
 * SVG path of wire segments from the cell centre to each open port, in the
 * tile's *base* orientation. Rotation is applied by the renderer so it can be
 * animated.
 */
export function wirePath(baseMask: number, size: number, fromRadius = 0): string {
  const c = size / 2;
  const parts: string[] = [];
  for (const p of PORTS) {
    if (!hasPort(baseMask, p)) continue;
    const [ex, ey] = edgePoint(p, size);
    const len = Math.hypot(ex - c, ey - c);
    const t = len === 0 ? 0 : fromRadius / len;
    const sx = c + (ex - c) * t;
    const sy = c + (ey - c) * t;
    parts.push(`M${round(sx)} ${round(sy)}L${round(ex)} ${round(ey)}`);
  }
  return parts.join('');
}

/**
 * Wire path oriented for flow: the inflow segment runs edge → centre, all
 * others centre → edge, so a dash pattern advancing along the path reads as
 * current flowing away from the source. `inPort` is in base orientation
 * (0 = none, e.g. a source).
 */
export function flowPath(baseMask: number, inPort: number, size: number, fromRadius = 0): string {
  const c = size / 2;
  const parts: string[] = [];
  for (const p of PORTS) {
    if (!hasPort(baseMask, p)) continue;
    const [ex, ey] = edgePoint(p, size);
    const len = Math.hypot(ex - c, ey - c);
    const t = len === 0 ? 0 : fromRadius / len;
    const sx = round(c + (ex - c) * t);
    const sy = round(c + (ey - c) * t);
    parts.push(p === inPort ? `M${round(ex)} ${round(ey)}L${sx} ${sy}` : `M${sx} ${sy}L${round(ex)} ${round(ey)}`);
  }
  return parts.join('');
}

/** Diamond glyph used to mark violet signals so colour is never the only cue. */
export function diamondPath(cx: number, cy: number, r: number): string {
  return `M${round(cx)} ${round(cy - r)}L${round(cx + r)} ${round(cy)}L${round(cx)} ${round(cy + r)}L${round(cx - r)} ${round(cy)}Z`;
}

/** Diagonal hatch for blocked cells. */
export function hatchPath(size: number, step: number, inset: number): string {
  const parts: string[] = [];
  const lo = inset;
  const hi = size - inset;
  for (let d = lo - (hi - lo); d < hi; d += step) {
    const x1 = Math.max(lo, d);
    const y1 = lo + (x1 - d);
    const x2 = Math.min(hi, d + (hi - lo));
    const y2 = lo + (x2 - d);
    if (x2 > x1) parts.push(`M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}`);
  }
  return parts.join('');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BoardLayout {
  readonly cell: number;
  readonly width: number;
  readonly height: number;
}

/** Largest square cell that fits, capped for very small boards. */
export function layoutBoard(
  cols: number,
  rows: number,
  availWidth: number,
  availHeight: number,
  maxCell = 96,
): BoardLayout {
  const cell = Math.floor(Math.max(0, Math.min(availWidth / cols, availHeight / rows, maxCell)));
  return { cell, width: cell * cols, height: cell * rows };
}
