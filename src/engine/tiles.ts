import { EAST, NORTH, SOUTH, WEST, type Rotation, rotateMask } from './ports';

export type TileType =
  | 'empty'
  | 'blocked'
  | 'straight'
  | 'elbow'
  | 'tee'
  | 'cross'
  | 'source'
  | 'receiver';

export const TILE_TYPES: readonly TileType[] = [
  'empty',
  'blocked',
  'straight',
  'elbow',
  'tee',
  'cross',
  'source',
  'receiver',
];

/** Signal colours. Chapters 1–2 use only `cyan`; chapter 3 introduces `violet`. */
export type SignalColor = 'cyan' | 'violet';
export const SIGNAL_COLORS: readonly SignalColor[] = ['cyan', 'violet'];

export interface TileMeta {
  /** Emitted colour for sources. Defaults to `cyan`. */
  readonly color?: SignalColor;
}

/**
 * Immutable tile. Position is implied by its index in the board's row-major
 * tile array; rotating produces a new Tile object.
 */
export interface Tile {
  readonly id: string;
  readonly type: TileType;
  readonly baseMask: number;
  readonly rotation: Rotation;
  readonly locked: boolean;
  readonly meta?: TileMeta;
}

/**
 * Canonical base masks for wire pieces. Sources and receivers may use any
 * non-empty mask (usually a single port); empty and blocked tiles have none.
 */
export const CANONICAL_BASE_MASK: Readonly<Partial<Record<TileType, number>>> = {
  empty: 0,
  blocked: 0,
  straight: NORTH | SOUTH,
  elbow: NORTH | EAST,
  tee: NORTH | EAST | SOUTH,
  cross: NORTH | EAST | SOUTH | WEST,
};

export function tileMask(tile: Tile): number {
  return rotateMask(tile.baseMask, tile.rotation);
}

/** Whether the player can rotate this tile. */
export function isRotatable(tile: Tile): boolean {
  return !tile.locked && tile.type !== 'empty' && tile.type !== 'blocked' && tile.baseMask !== 0;
}

/** Whether the tile participates in the circuit graph at all. */
export function isConductive(tile: Tile): boolean {
  return tile.type !== 'empty' && tile.type !== 'blocked' && tile.baseMask !== 0;
}

export function sourceColor(tile: Tile): SignalColor {
  return tile.meta?.color ?? 'cyan';
}

export function withRotation(tile: Tile, rotation: Rotation): Tile {
  return rotation === tile.rotation ? tile : { ...tile, rotation };
}
