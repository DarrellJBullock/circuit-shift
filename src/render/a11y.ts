import { PORTS, PORT_NAME, type SignalColor, type Tile, tileMask } from '@/engine';

const TYPE_LABEL: Readonly<Record<Tile['type'], string>> = {
  empty: 'Empty cell',
  blocked: 'Blocked cell',
  straight: 'Straight wire',
  elbow: 'Corner wire',
  tee: 'Junction wire',
  cross: 'Cross wire',
  source: 'Power source',
  receiver: 'Receiver',
};

export interface TileA11yState {
  readonly x: number;
  readonly y: number;
  readonly color: SignalColor | null;
  readonly shorted: boolean;
  /** For receivers: whether its objective is met. */
  readonly satisfied?: boolean;
}

/** Spoken description, e.g. "Row 1, column 3. Corner wire, open east and south. Powered cyan." */
export function describeTile(tile: Tile, s: TileA11yState): string {
  const parts = [`Row ${s.y + 1}, column ${s.x + 1}.`, TYPE_LABEL[tile.type]];
  const mask = tileMask(tile);
  if (mask !== 0) {
    const open = PORTS.filter((p) => mask & p).map((p) => PORT_NAME[p]);
    parts[1] += `, open ${open.join(' and ')}.`;
  } else {
    parts[1] += '.';
  }
  if (tile.type === 'source') parts.push(`Emits ${tile.meta?.color ?? 'cyan'}.`);
  if (tile.type === 'receiver') {
    parts.push(`Needs ${tile.meta?.color ?? 'cyan'}.`);
    parts.push(s.satisfied ? 'Satisfied.' : 'Not satisfied.');
  } else if (s.shorted) {
    parts.push('Short circuit: mixed signals.');
  } else if (s.color) {
    parts.push(`Powered ${s.color}.`);
  }
  if (tile.locked && tile.type !== 'empty' && tile.type !== 'blocked') parts.push('Locked.');
  return parts.join(' ');
}
