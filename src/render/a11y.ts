import { type Evaluation, PORTS, PORT_NAME, type SignalColor, type Tile, tileMask } from '@/engine';

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
  /** For receivers: accepted colours (from the level objective). */
  readonly accepts?: readonly SignalColor[];
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
    const accepts = s.accepts ?? [tile.meta?.color ?? 'cyan'];
    parts.push(accepts.length > 1 ? `Accepts ${accepts.join(' or ')}.` : `Needs ${accepts[0]}.`);
    parts.push(s.satisfied ? 'Satisfied.' : 'Not satisfied.');
  } else if (s.shorted) {
    parts.push('Short circuit: mixed signals.');
  } else if (s.color) {
    parts.push(`Powered ${s.color}.`);
  }
  if (tile.locked && tile.type !== 'empty' && tile.type !== 'blocked') parts.push('Locked.');
  return parts.join(' ');
}

/**
 * What changed after a move, phrased for VoiceOver (null = nothing worth
 * announcing). Covers receivers gaining/losing power, new short circuits and
 * completion; the tile's own label already describes its new orientation.
 */
export function describeChange(before: Evaluation, after: Evaluation, stars?: number): string | null {
  if (after.solved && !before.solved) {
    return stars !== undefined ? `Circuit complete. ${stars} of 3 stars.` : 'Circuit complete.';
  }
  const count = (e: Evaluation) => e.objectives.filter((o) => o.satisfied).length;
  const total = after.objectives.length;
  const parts: string[] = [];
  const shorted = (e: Evaluation) => e.power.networks.some((n) => n.shorted);
  if (shorted(after) && !shorted(before)) parts.push('Short circuit: mixed signals.');
  const gained = count(after) - count(before);
  if (gained > 0) parts.push(`${gained === 1 ? 'Receiver' : `${gained} receivers`} powered. ${count(after)} of ${total}.`);
  if (gained < 0) parts.push(`Receiver lost power. ${count(after)} of ${total}.`);
  return parts.length ? parts.join(' ') : null;
}
