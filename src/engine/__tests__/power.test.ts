import { isLinked, openEndMask } from '../board';
import { EAST, NORTH, SOUTH, WEST } from '../ports';
import { computePower, isPowered } from '../power';
import { at, board } from './helpers';

describe('reciprocal connections', () => {
  it('links two tiles only when both ports face each other', () => {
    // Source faces east, straight is horizontal: linked both ways.
    const b = board(['S1 I1']);
    expect(isLinked(b, 0, EAST)).toBe(true);
    expect(isLinked(b, 1, WEST)).toBe(true);
  });

  it('does not link when only one side faces the other', () => {
    // Source faces east, straight is vertical: no reciprocal port.
    const b = board(['S1 I0']);
    expect(isLinked(b, 0, EAST)).toBe(false);
    expect(isLinked(b, 1, WEST)).toBe(false);
    expect(isPowered(computePower(b), 1)).toBe(false);
  });

  it('never links through the board edge, blocked or empty tiles', () => {
    const b = board(['S0 # .', 'I1 I1 I1']);
    expect(isLinked(b, 0, NORTH)).toBe(false); // edge
    expect(openEndMask(b, 0)).toBe(NORTH);
    const c = board(['S1 #', 'S1 .']);
    expect(isLinked(c, 0, EAST)).toBe(false);
    expect(isLinked(c, 2, EAST)).toBe(false);
  });

  it('reports open ends per tile', () => {
    const b = board(['S1 T1']); // tee E|S|W: west linked, east+south open
    expect(openEndMask(b, 1)).toBe(EAST | SOUTH);
    expect(openEndMask(b, 0)).toBe(0);
  });
});

describe('power propagation', () => {
  it('powers a straight line and reports BFS depth', () => {
    const b = board(['S1 I1 I1 R3']);
    const p = computePower(b);
    expect(p.colorOf).toEqual(['cyan', 'cyan', 'cyan', 'cyan']);
    expect(p.depthOf).toEqual([0, 1, 2, 3]);
    expect(p.networks).toHaveLength(1);
  });

  it('keeps disconnected networks separate and unpowered without a source', () => {
    const b = board(['S1 R3 I1 R3']);
    const p = computePower(b);
    expect(p.networks).toHaveLength(2);
    expect(isPowered(p, 1)).toBe(true);
    expect(isPowered(p, 2)).toBe(false);
    expect(isPowered(p, 3)).toBe(false);
    expect(p.depthOf[3]).toBe(-1);
  });

  it('powers both arms of a branch', () => {
    // Tee in the middle of the top row splits west/east/south.
    const b = board([
      'R1 T1 R3', //
      '.  I0 .',
      '.  S0 .',
    ]);
    const p = computePower(b);
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ] as const) {
      expect(isPowered(p, at(b, x, y))).toBe(true);
    }
  });

  it('merges multiple same-colour sources into one network', () => {
    const b = board(['S1 I1 R0 I1 S3']);
    // Receiver faces north: leaves both straights dangling into it but unlinked.
    const p = computePower(b);
    expect(p.networks.filter((n) => n.sourceIndices.length > 0)).toHaveLength(2);
    const joined = board(['S1 T1 S3', '.  R0 .']);
    const q = computePower(joined);
    const net = q.networks[q.networkOf[1]!]!;
    expect(net.sourceIndices).toEqual([0, 2]);
    expect(net.shorted).toBe(false);
    expect(isPowered(q, at(joined, 1, 1))).toBe(true);
  });

  it('feeds multiple receivers from one source', () => {
    const b = board(['R1 T1 R3', '.  S0 .']);
    const p = computePower(b);
    expect(isPowered(p, 0)).toBe(true);
    expect(isPowered(p, 2)).toBe(true);
  });

  it('cross tiles join all four sides into one network', () => {
    const b = board(['.  R2 .', 'S1 X  R3', '.  R0 .']);
    const p = computePower(b);
    expect([1, 3, 4, 5, 7].every((i) => isPowered(p, i))).toBe(true);
  });
});

describe('coloured signals', () => {
  it('propagates a violet source colour', () => {
    const b = board(['S1v I1 R3v']);
    expect(computePower(b).colorOf).toEqual(['violet', 'violet', 'violet']);
  });

  it('shorts a network that mixes incompatible colours and powers nothing in it', () => {
    const b = board(['S1 T1 S3v', '.  R0 .']);
    const p = computePower(b);
    const net = p.networks[p.networkOf[1]!]!;
    expect(net.shorted).toBe(true);
    expect(net.color).toBeNull();
    expect(net.colors).toEqual(['cyan', 'violet']);
    expect(p.colorOf.every((c) => c === null)).toBe(true);
    expect(p.shortedOf[at(b, 1, 1)]).toBe(true);
  });

  it('allows different colours in separate networks', () => {
    const b = board(['S1 R3', 'S1v R3v']);
    const p = computePower(b);
    expect(p.colorOf).toEqual(['cyan', 'cyan', 'violet', 'violet']);
    expect(p.networks.some((n) => n.shorted)).toBe(false);
  });

  it('is deterministic', () => {
    const b = board(['S1 T1 R3', '.  I0 .', 'S1v L3 R3v']);
    expect(computePower(b)).toEqual(computePower(b));
    expect(SOUTH).toBe(4);
  });
});

describe('inflowPort (flow animation direction)', () => {
  it('points each powered tile back toward the source', () => {
    const { inflowPort } = jest.requireActual('../power') as typeof import('../power');
    // Source → straight → elbow (turns south) → receiver below.
    const b = board(['S1 I1 L2', '.  .  R0']);
    const p = computePower(b);
    expect(inflowPort(b, p, 0)).toBe(0); // source
    expect(inflowPort(b, p, 1)).toBe(WEST);
    expect(inflowPort(b, p, 2)).toBe(WEST);
    expect(inflowPort(b, p, 5)).toBe(NORTH);
    expect(inflowPort(b, p, 3)).toBe(0); // empty
  });

  it('is 0 for unpowered tiles and shorted networks', () => {
    const { inflowPort } = jest.requireActual('../power') as typeof import('../power');
    const dark = board(['S1 I0 R3']);
    expect(inflowPort(dark, computePower(dark), 1)).toBe(0);
    const short = board(['S1 T1 S3v', '.  R0 .']);
    expect(inflowPort(short, computePower(short), 1)).toBe(0);
  });
});
