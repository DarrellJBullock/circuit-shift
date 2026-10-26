import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { useSettings } from '@/state/settingsStore';

/**
 * Sound-effect adapter. Effects are original, synthesized by
 * `scripts/synthesize-sfx.ts`. The session is "ambient": it respects the
 * silent switch and mixes with the player's own music. Any audio failure
 * disables sound for the session instead of surfacing an error.
 */
export type SoundCue = 'rotate' | 'locked' | 'connect' | 'win' | 'tap';

const SOURCES: Readonly<Record<SoundCue, number>> = {
  rotate: require('../../assets/audio/rotate.wav'),
  locked: require('../../assets/audio/locked.wav'),
  connect: require('../../assets/audio/connect.wav'),
  win: require('../../assets/audio/win.wav'),
  tap: require('../../assets/audio/tap.wav'),
};

const VOLUME: Readonly<Record<SoundCue, number>> = { rotate: 0.5, locked: 0.6, connect: 0.7, win: 0.8, tap: 0.35 };
/** Rotate fires rapidly; a small pool lets clicks overlap instead of cutting off. */
const POOL: Readonly<Record<SoundCue, number>> = { rotate: 3, locked: 1, connect: 2, win: 1, tap: 1 };

let players: Partial<Record<SoundCue, { pool: AudioPlayer[]; next: number }>> = {};
let state: 'idle' | 'ready' | 'disabled' = 'idle';

export async function initAudio(): Promise<void> {
  if (state !== 'idle') return;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
    const created: typeof players = {};
    for (const cue of Object.keys(SOURCES) as SoundCue[]) {
      const pool = Array.from({ length: POOL[cue] }, () => {
        const p = createAudioPlayer(SOURCES[cue]);
        p.volume = VOLUME[cue];
        return p;
      });
      created[cue] = { pool, next: 0 };
    }
    players = created;
    state = 'ready';
  } catch (e) {
    state = 'disabled';
    if (__DEV__) console.warn('[audio] disabled:', e);
  }
}

export function playSound(cue: SoundCue): void {
  if (state !== 'ready' || !useSettings.getState().soundEnabled) return;
  const slot = players[cue];
  if (!slot) return;
  const player = slot.pool[slot.next]!;
  slot.next = (slot.next + 1) % slot.pool.length;
  try {
    player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // Never let audio break gameplay.
  }
}

export function audioState(): typeof state {
  return state;
}
