import { type SoundCue, playSound } from './audio';
import { haptic } from './haptics';

/** One call per game event: plays the matching sound and haptic (each respects its own toggle). */
export function feedback(cue: SoundCue): void {
  playSound(cue);
  if (cue !== 'tap') haptic(cue);
}
