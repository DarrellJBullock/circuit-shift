import { hashSeed } from '@/engine';

import type { Level } from './schema';

/**
 * Stable fingerprint of a level's playable layout. Saved sessions store it and
 * are discarded if the level changes, so a snapshot is never replayed onto a
 * different board.
 */
export function levelFingerprint(level: Level): string {
  const tiles = level.tiles
    .map((t) => `${t.type}:${t.baseMask}:${t.rotation}:${t.locked ? 1 : 0}:${t.meta?.color ?? ''}`)
    .join(',');
  const objectives = level.receiverObjectives.map((o) => `${o.receiverId}=${o.accepts.join('+')}`).join(',');
  const c = level.constraints;
  const text = `${level.width}x${level.height}|${tiles}|${objectives}|${c.noOpenEnds ? 1 : 0}${c.allTilesPowered ? 1 : 0}`;
  return hashSeed(text).toString(16).padStart(8, '0');
}
