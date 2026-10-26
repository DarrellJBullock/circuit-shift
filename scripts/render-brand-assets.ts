/// <reference types="node" />
/**
 * Renders Circuit Shift's original brand art with CanvasKit (Skia's WASM
 * build, already a dependency via react-native-skia). Deterministic: same
 * output every run. Replaces the Expo template placeholders.
 *
 *   assets/icon.png                       1024² opaque (App Store: no alpha)
 *   assets/splash-icon.png                1024² transparent glyph
 *   assets/android-icon-foreground.png    1024² glyph in the adaptive safe zone
 *   assets/android-icon-background.png    1024² background
 *   assets/android-icon-monochrome.png    1024² white glyph (themed icons)
 *   assets/favicon.png                    48²
 *
 * Usage: npm run render-brand-assets
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import CanvasKitInit, { type Canvas, type CanvasKit } from 'canvaskit-wasm';

const OUT = join(__dirname, '..', 'assets');
const C = {
  bgInner: '#16233A',
  bg: '#0B1220',
  tileEdge: '#22385A',
  cyan: '#37DDF7',
  amber: '#F8B84E',
  text: '#F1F7FF',
};

interface GlyphOptions {
  /** Scale of the glyph around the canvas centre (1 = full icon layout). */
  readonly scale: number;
  readonly mono?: string;
}

function drawBackground(ck: CanvasKit, canvas: Canvas, size: number) {
  const paint = new ck.Paint();
  paint.setShader(
    ck.Shader.MakeRadialGradient([size / 2, size * 0.42], size * 0.75, [ck.parseColorString(C.bgInner), ck.parseColorString(C.bg)], null, ck.TileMode.Clamp),
  );
  canvas.drawRect(ck.LTRBRect(0, 0, size, size), paint);
  // Faint 3×3 tile grid: the puzzle board, quietly.
  const grid = new ck.Paint();
  grid.setStyle(ck.PaintStyle.Stroke);
  grid.setStrokeWidth(size * 0.006);
  grid.setColor(ck.parseColorString(C.tileEdge));
  grid.setAlphaf(0.55);
  grid.setAntiAlias(true);
  const cell = size * 0.26;
  const start = size / 2 - cell * 1.5;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const inset = size * 0.012;
      canvas.drawRRect(
        ck.RRectXY(ck.LTRBRect(start + x * cell + inset, start + y * cell + inset, start + (x + 1) * cell - inset, start + (y + 1) * cell - inset), size * 0.04, size * 0.04),
        grid,
      );
    }
  }
}

/** Source → stepped wire → receiver, centred on the canvas. */
function drawGlyph(ck: CanvasKit, canvas: Canvas, size: number, opts: GlyphOptions) {
  canvas.save();
  canvas.translate(size / 2, size / 2);
  canvas.scale(opts.scale, opts.scale);
  canvas.translate(-size / 2, -size / 2);
  const u = size / 1024;
  // CanvasKit paths are immutable; build from SVG (same approach as the in-game renderer).
  const wire = ck.Path.MakeFromSVGString(`M${300 * u} ${640 * u}L${512 * u} ${640 * u}L${512 * u} ${384 * u}L${724 * u} ${384 * u}`);
  if (!wire) throw new Error('bad path');

  const stroke = (width: number, color: string, blur = 0, alpha = 1) => {
    const p = new ck.Paint();
    p.setAntiAlias(true);
    p.setStyle(ck.PaintStyle.Stroke);
    p.setStrokeWidth(width * u);
    p.setStrokeCap(ck.StrokeCap.Round);
    p.setStrokeJoin(ck.StrokeJoin.Round);
    p.setColor(ck.parseColorString(opts.mono ?? color));
    p.setAlphaf(alpha);
    if (blur > 0 && !opts.mono) p.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, blur * u, true));
    return p;
  };
  const fill = (color: string, blur = 0, alpha = 1) => {
    const p = new ck.Paint();
    p.setAntiAlias(true);
    p.setColor(ck.parseColorString(opts.mono ?? color));
    p.setAlphaf(alpha);
    if (blur > 0 && !opts.mono) p.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, blur * u, true));
    return p;
  };

  if (!opts.mono) canvas.drawPath(wire, stroke(150, C.cyan, 46, 0.55)); // glow
  canvas.drawPath(wire, stroke(64, C.cyan));
  if (!opts.mono) canvas.drawPath(wire, stroke(18, C.text, 0, 0.75)); // core highlight

  // Receiver ring with lit centre.
  if (!opts.mono) canvas.drawCircle(724 * u, 384 * u, 96 * u, fill(C.cyan, 40, 0.45));
  canvas.drawCircle(724 * u, 384 * u, 74 * u, fill(opts.mono ? C.text : C.bg));
  canvas.drawCircle(724 * u, 384 * u, 74 * u, stroke(26, C.cyan));
  canvas.drawCircle(724 * u, 384 * u, 30 * u, fill(C.cyan));

  // Amber source.
  if (!opts.mono) canvas.drawCircle(300 * u, 640 * u, 120 * u, fill(C.amber, 50, 0.4));
  canvas.drawCircle(300 * u, 640 * u, 92 * u, fill(C.amber));
  canvas.drawCircle(300 * u, 640 * u, 34 * u, fill(opts.mono ? C.text : C.bg, 0, opts.mono ? 0 : 1));
  canvas.restore();
}

function render(ck: CanvasKit, size: number, draw: (canvas: Canvas) => void): Uint8Array {
  const surface = ck.MakeSurface(size, size);
  if (!surface) throw new Error('could not create surface');
  const canvas = surface.getCanvas();
  canvas.clear(ck.TRANSPARENT);
  draw(canvas);
  const png = surface.makeImageSnapshot().encodeToBytes();
  surface.delete();
  if (!png) throw new Error('encode failed');
  return png;
}

/** App Store icons must not contain an alpha channel: round-trip through JPEG with macOS `sips`. */
function writeOpaquePng(file: string, png: Uint8Array) {
  const dir = mkdtempSync(join(tmpdir(), 'cs-icon-'));
  const src = join(dir, 'in.png');
  const jpg = join(dir, 'flat.jpg');
  writeFileSync(src, png);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '100', src, '--out', jpg], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', file], { stdio: 'ignore' });
}

async function main() {
  const ck = await CanvasKitInit({ locateFile: (f) => require.resolve(`canvaskit-wasm/bin/${f}`) });
  const S = 1024;

  writeOpaquePng(join(OUT, 'icon.png'), render(ck, S, (c) => (drawBackground(ck, c, S), drawGlyph(ck, c, S, { scale: 1 }))));
  writeFileSync(join(OUT, 'splash-icon.png'), render(ck, S, (c) => drawGlyph(ck, c, S, { scale: 1 })));
  writeFileSync(join(OUT, 'android-icon-foreground.png'), render(ck, S, (c) => drawGlyph(ck, c, S, { scale: 0.62 })));
  writeFileSync(join(OUT, 'android-icon-background.png'), render(ck, S, (c) => drawBackground(ck, c, S)));
  writeFileSync(join(OUT, 'android-icon-monochrome.png'), render(ck, S, (c) => drawGlyph(ck, c, S, { scale: 0.62, mono: '#FFFFFF' })));
  writeFileSync(join(OUT, 'favicon.png'), render(ck, 48, (c) => (drawBackground(ck, c, 48), drawGlyph(ck, c, 48, { scale: 1 }))));
  console.log('✔ brand assets rendered to assets/');
}

void main();
