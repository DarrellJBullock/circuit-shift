/// <reference types="node" />
/**
 * Synthesizes the game's original sound effects into assets/audio/*.wav.
 * Everything is generated from sine partials, pitch sweeps and seeded noise,
 * so the audio is Evercrest-owned with no third-party licensing.
 * Deterministic: re-running produces identical files.
 *
 * Usage: npm run synthesize-sfx
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createRng } from '../src/engine/rng';

const RATE = 44_100;
const OUT = join(__dirname, '..', 'assets', 'audio');

type Voice = (t: number) => number;

function render(seconds: number, voice: Voice): Float32Array {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = voice(i / RATE);
  // 2 ms fade-in and 8 ms fade-out avoid clicks at the edges.
  const fadeIn = Math.round(0.002 * RATE);
  const fadeOut = Math.round(0.008 * RATE);
  for (let i = 0; i < fadeIn && i < n; i++) out[i]! *= i / fadeIn;
  for (let i = 0; i < fadeOut && i < n; i++) out[n - 1 - i]! *= i / fadeOut;
  return out;
}

function normalize(samples: Float32Array, peakDb: number): Float32Array {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? 10 ** (peakDb / 20) / peak : 1;
  return samples.map((s) => s * gain);
}

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const TAU = Math.PI * 2;
const decay = (t: number, k: number) => Math.exp(-t * k);
/** Sine whose frequency glides exponentially from f0 to f1 over `glide` seconds. */
function sweep(f0: number, f1: number, glide: number): Voice {
  let phase = 0;
  let last = 0;
  return (t) => {
    const f = t >= glide ? f1 : f0 * (f1 / f0) ** (t / glide);
    phase += TAU * f * (t - last);
    last = t;
    return Math.sin(phase);
  };
}

const noise = (() => {
  const rng = createRng(0xc1c5);
  return () => rng.next() * 2 - 1;
})();

const SOUNDS: Record<string, () => Float32Array> = {
  // Soft mechanical click: bright tick over a small body.
  rotate: () => {
    const body = sweep(720, 520, 0.03);
    return render(0.06, (t) => 0.6 * Math.sin(TAU * 2400 * t) * decay(t, 180) + 0.5 * body(t) * decay(t, 70));
  },
  // Dull blocked thud for tapping a locked tile.
  locked: () => {
    const thud = sweep(150, 85, 0.08);
    return render(0.12, (t) => thud(t) * decay(t, 32) + 0.08 * noise() * decay(t, 60));
  },
  // Receiver powered: a clean fifth with light vibrato.
  connect: () =>
    render(0.42, (t) => {
      const vib = 1 + 0.004 * Math.sin(TAU * 6 * t);
      return (Math.sin(TAU * 880 * vib * t) + 0.6 * Math.sin(TAU * 1320 * vib * t) + 0.2 * Math.sin(TAU * 2640 * t)) * decay(t, 9);
    }),
  // Level complete: rising arpeggio C5–E5–G5–C6 with a soft shimmer tail.
  win: () => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    return render(1.3, (t) => {
      let s = 0;
      notes.forEach((f, i) => {
        const start = i * 0.09;
        if (t < start) return;
        const u = t - start;
        s += (Math.sin(TAU * f * u) + 0.35 * Math.sin(TAU * f * 2 * u)) * decay(u, i === 3 ? 3.2 : 7);
      });
      return s + 0.05 * Math.sin(TAU * 3136 * t) * Math.sin(TAU * 11 * t) * decay(t, 3);
    });
  },
  // UI button tick.
  tap: () => render(0.035, (t) => Math.sin(TAU * 1650 * t) * decay(t, 140)),
};

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const samples = normalize(make(), name === 'win' || name === 'connect' ? -4 : -6);
  const file = join(OUT, `${name}.wav`);
  writeFileSync(file, wav(samples));
  console.log(`✔ ${name}.wav ${(samples.length / RATE).toFixed(2)}s`);
}
