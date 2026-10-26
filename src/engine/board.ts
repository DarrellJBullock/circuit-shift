import { PORT_DELTA, PORTS, type Port, hasPort, opposite } from './ports';
import { type Tile, isConductive, tileMask } from './tiles';

/** A board is a row-major grid of tiles. Index = y * width + x. */
export interface Board {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
}

export function indexOf(board: Board, x: number, y: number): number {
  return y * board.width + x;
}

export function coordsOf(board: Board, index: number): { x: number; y: number } {
  return { x: index % board.width, y: Math.floor(index / board.width) };
}

/** Index of the neighbour through `port`, or -1 when it would leave the board. */
export function neighborIndex(board: Board, index: number, port: Port): number {
  const { x, y } = coordsOf(board, index);
  const d = PORT_DELTA[port];
  const nx = x + d.dx;
  const ny = y + d.dy;
  if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) return -1;
  return indexOf(board, nx, ny);
}

/**
 * Two tiles are linked through `port` only when the tile at `index` opens on
 * that side AND its neighbour opens on the facing side (reciprocal ports).
 */
export function isLinked(board: Board, index: number, port: Port): boolean {
  const tile = board.tiles[index];
  if (!tile || !isConductive(tile) || !hasPort(tileMask(tile), port)) return false;
  const n = neighborIndex(board, index, port);
  if (n < 0) return false;
  const other = board.tiles[n];
  if (!other || !isConductive(other)) return false;
  return hasPort(tileMask(other), opposite(port));
}

/** Indices of tiles linked to `index`, in N/E/S/W order. */
export function linkedNeighbors(board: Board, index: number): number[] {
  const out: number[] = [];
  for (const p of PORTS) {
    if (isLinked(board, index, p)) out.push(neighborIndex(board, index, p));
  }
  return out;
}

/** Ports of the tile that are open but do not connect to a reciprocal port. */
export function openEndMask(board: Board, index: number): number {
  const tile = board.tiles[index];
  if (!tile || !isConductive(tile)) return 0;
  const mask = tileMask(tile);
  let open = 0;
  for (const p of PORTS) {
    if (hasPort(mask, p) && !isLinked(board, index, p)) open |= p;
  }
  return open;
}

export function withTiles(board: Board, tiles: readonly Tile[]): Board {
  return { width: board.width, height: board.height, tiles };
}
