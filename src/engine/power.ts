import { type Board, linkedNeighbors, openEndMask } from './board';
import { type SignalColor, isConductive, sourceColor } from './tiles';

/**
 * A connected component of linked conductive tiles.
 *
 * MVP colour rule: a network carries at most one signal colour. If sources of
 * two different colours end up in the same network it is `shorted` and powers
 * nothing; the renderer shows it as a fault.
 */
export interface Network {
  readonly id: number;
  readonly tileIndices: readonly number[];
  readonly sourceIndices: readonly number[];
  readonly colors: readonly SignalColor[];
  readonly shorted: boolean;
  /** Signal colour when powered and not shorted, otherwise null. */
  readonly color: SignalColor | null;
}

export interface PowerState {
  readonly networks: readonly Network[];
  /** Network id per tile index, or -1 for non-conductive tiles. */
  readonly networkOf: readonly number[];
  /** Colour reaching each tile, or null when unpowered or shorted. */
  readonly colorOf: readonly (SignalColor | null)[];
  /** True when the tile belongs to a shorted network. */
  readonly shortedOf: readonly boolean[];
  /** BFS hop distance from the nearest source in its network; -1 if unpowered. */
  readonly depthOf: readonly number[];
  /** Open (unconnected) port mask per tile. */
  readonly openEndsOf: readonly number[];
}

export function isPowered(power: PowerState, index: number): boolean {
  return power.colorOf[index] != null;
}

/** Deterministic: components are discovered in ascending tile-index order. */
export function computePower(board: Board): PowerState {
  const n = board.tiles.length;
  const networkOf = new Array<number>(n).fill(-1);
  const colorOf = new Array<SignalColor | null>(n).fill(null);
  const shortedOf = new Array<boolean>(n).fill(false);
  const depthOf = new Array<number>(n).fill(-1);
  const openEndsOf = new Array<number>(n).fill(0);
  const neighbors: number[][] = [];
  const networks: Network[] = [];

  for (let i = 0; i < n; i++) {
    neighbors.push(linkedNeighbors(board, i));
    openEndsOf[i] = openEndMask(board, i);
  }

  for (let start = 0; start < n; start++) {
    const startTile = board.tiles[start];
    if (!startTile || !isConductive(startTile) || networkOf[start] !== -1) continue;

    const id = networks.length;
    const members: number[] = [];
    const sources: number[] = [];
    const queue = [start];
    networkOf[start] = id;
    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q]!;
      members.push(cur);
      if (board.tiles[cur]!.type === 'source') sources.push(cur);
      for (const nb of neighbors[cur]!) {
        if (networkOf[nb] === -1) {
          networkOf[nb] = id;
          queue.push(nb);
        }
      }
    }

    const colors = [...new Set(sources.map((s) => sourceColor(board.tiles[s]!)))].sort();
    const shorted = colors.length > 1;
    const color = colors.length === 1 ? colors[0]! : null;

    if (shorted) {
      for (const m of members) shortedOf[m] = true;
    }
    if (color) {
      // Multi-source BFS for propagation depth (drives the power-flow animation).
      const bfs = [...sources];
      for (const s of sources) depthOf[s] = 0;
      for (let q = 0; q < bfs.length; q++) {
        const cur = bfs[q]!;
        colorOf[cur] = color;
        for (const nb of neighbors[cur]!) {
          if (depthOf[nb] === -1) {
            depthOf[nb] = depthOf[cur]! + 1;
            bfs.push(nb);
          }
        }
      }
    }

    networks.push({
      id,
      tileIndices: members.sort((a, b) => a - b),
      sourceIndices: sources.sort((a, b) => a - b),
      colors,
      shorted,
      color,
    });
  }

  return { networks, networkOf, colorOf, shortedOf, depthOf, openEndsOf };
}
