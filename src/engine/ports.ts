/**
 * Port bitmask model.
 *
 * A tile's open sides are a 4-bit mask. Rotation is measured in clockwise
 * quarter turns, so rotating once maps NORTH→EAST→SOUTH→WEST→NORTH, which with
 * this bit order is a 4-bit circular left shift.
 */
export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

export type Port = typeof NORTH | typeof EAST | typeof SOUTH | typeof WEST;
export type Rotation = 0 | 1 | 2 | 3;

export const PORTS: readonly Port[] = [NORTH, EAST, SOUTH, WEST];
export const ALL_PORTS_MASK = 15;

/** Grid offset for each port; y grows downward. */
export const PORT_DELTA: Readonly<Record<Port, { readonly dx: number; readonly dy: number }>> = {
  [NORTH]: { dx: 0, dy: -1 },
  [EAST]: { dx: 1, dy: 0 },
  [SOUTH]: { dx: 0, dy: 1 },
  [WEST]: { dx: -1, dy: 0 },
};

export const PORT_NAME: Readonly<Record<Port, string>> = {
  [NORTH]: 'north',
  [EAST]: 'east',
  [SOUTH]: 'south',
  [WEST]: 'west',
};

export function isRotation(value: unknown): value is Rotation {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

export function normalizeRotation(turns: number): Rotation {
  return (((turns % 4) + 4) % 4) as Rotation;
}

export function opposite(port: Port): Port {
  return rotateMask(port, 2) as Port;
}

/** Rotate a port mask clockwise by `turns` quarter turns. */
export function rotateMask(mask: number, turns: number): number {
  const r = normalizeRotation(turns);
  const m = mask & ALL_PORTS_MASK;
  return ((m << r) | (m >> (4 - r))) & ALL_PORTS_MASK;
}

export function hasPort(mask: number, port: Port): boolean {
  return (mask & port) !== 0;
}

export function portCount(mask: number): number {
  let n = 0;
  for (const p of PORTS) if (mask & p) n++;
  return n;
}

/**
 * Number of visually distinct orientations of a mask (1, 2 or 4).
 * Used to collapse symmetric rotations in the solver: a straight piece has 2,
 * a cross or empty tile has 1.
 */
export function distinctRotationCount(mask: number): 1 | 2 | 4 {
  if (rotateMask(mask, 1) === mask) return 1;
  if (rotateMask(mask, 2) === mask) return 2;
  return 4;
}
