import { contrastRatio } from '../contrast';
import { colors } from '../theme';

/**
 * WCAG 2.2: text ≥ 4.5:1 (1.4.3); essential graphics ≥ 3:1 (1.4.11).
 * Decorative graphics are exempt and deliberately subtle: tile outlines
 * (`tileEdge`) and the blocked-cell hatch. Tiles and blocked cells are already
 * distinguishable by fill and by whether they carry wires.
 */
describe('colour contrast', () => {
  const text: [string, string, string][] = [
    ['text on background', colors.text, colors.background],
    ['text on tile', colors.text, colors.tile],
    ['muted text on background', colors.textMuted, colors.background],
    ['muted text on tile/card', colors.textMuted, colors.tile],
    ['cyan accent text on background', colors.electricity, colors.background],
    ['amber accent text on background', colors.source, colors.background],
    ['primary button label', colors.background, colors.electricity],
    ['error text on background', colors.error, colors.background],
  ];
  it.each(text)('%s ≥ 4.5:1', (_, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  const graphics: [string, string, string][] = [
    ['unpowered wire on tile', colors.wireIdle, colors.tile],
    ['unpowered wire on locked tile', colors.wireIdle, colors.tileLocked],
    ['powered cyan wire on tile', colors.electricity, colors.tile],
    ['violet wire on tile', colors.secondary, colors.tile],
    ['source body on tile', colors.source, colors.tile],
    ['short-circuit wire on tile', colors.error, colors.tile],
  ];
  it.each(graphics)('%s ≥ 3:1', (_, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it('computes known reference ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(() => contrastRatio('red', '#000000')).toThrow();
  });
});
