import { useEffect } from 'react';
import { type SharedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

export interface ClockState {
  readonly clock: number;
  readonly offset: number;
  readonly reanchor: boolean;
}

/** One frame of the pausable clock (pure; also runs as a worklet). */
export function clockStep(s: ClockState, timeSinceFirstFrame: number): ClockState {
  'worklet';
  const offset = s.reanchor ? s.clock - timeSinceFirstFrame : s.offset;
  return { clock: timeSinceFirstFrame + offset, offset, reanchor: false };
}

/**
 * A pausable millisecond clock for ambient board animation (pulses, flow).
 * Unlike Skia's `useClock`, it stops driving frames when `active` is false
 * (reduced motion, paused game), so an idle board does not redraw at 60 fps.
 * Pausing keeps the last value, so resuming continues smoothly.
 */
export function useAnimationClock(active: boolean): SharedValue<number> {
  const clock = useSharedValue(0);
  const offset = useSharedValue(0);
  // A separate flag (not a sentinel offset: valid offsets are often negative).
  const reanchor = useSharedValue(true);
  const frame = useFrameCallback((info) => {
    'worklet';
    const next = clockStep({ clock: clock.value, offset: offset.value, reanchor: reanchor.value }, info.timeSinceFirstFrame);
    clock.value = next.clock;
    offset.value = next.offset;
    reanchor.value = next.reanchor;
  }, active);
  useEffect(() => {
    if (active) reanchor.set(true); // continue from the last value on resume
    frame.setActive(active);
  }, [active, frame, reanchor]);
  return clock;
}
