import {
  EAST,
  NORTH,
  SOUTH,
  WEST,
  distinctRotationCount,
  normalizeRotation,
  opposite,
  portCount,
  rotateMask,
} from '../ports';
import { CANONICAL_BASE_MASK } from '../tiles';

describe('rotateMask', () => {
  it('rotates a single port clockwise through all four directions', () => {
    expect(rotateMask(NORTH, 0)).toBe(NORTH);
    expect(rotateMask(NORTH, 1)).toBe(EAST);
    expect(rotateMask(NORTH, 2)).toBe(SOUTH);
    expect(rotateMask(NORTH, 3)).toBe(WEST);
    expect(rotateMask(WEST, 1)).toBe(NORTH);
  });

  it('rotates an elbow N|E through E|S, S|W, W|N', () => {
    const elbow = NORTH | EAST;
    expect(rotateMask(elbow, 1)).toBe(EAST | SOUTH);
    expect(rotateMask(elbow, 2)).toBe(SOUTH | WEST);
    expect(rotateMask(elbow, 3)).toBe(WEST | NORTH);
  });

  it('rotates a tee and keeps port count', () => {
    const tee = NORTH | EAST | SOUTH;
    expect(rotateMask(tee, 1)).toBe(EAST | SOUTH | WEST);
    expect(rotateMask(tee, 2)).toBe(SOUTH | WEST | NORTH);
    expect(rotateMask(tee, 3)).toBe(WEST | NORTH | EAST);
    for (let r = 0; r < 4; r++) expect(portCount(rotateMask(tee, r))).toBe(3);
  });

  it('is the identity after four turns and handles negative / large turns', () => {
    for (let m = 0; m < 16; m++) {
      expect(rotateMask(m, 4)).toBe(m);
      expect(rotateMask(m, -1)).toBe(rotateMask(m, 3));
      expect(rotateMask(m, 9)).toBe(rotateMask(m, 1));
      expect(rotateMask(rotateMask(m, 1), 3)).toBe(m);
    }
  });

  it('normalizes rotations into 0..3', () => {
    expect(normalizeRotation(-1)).toBe(3);
    expect(normalizeRotation(4)).toBe(0);
    expect(normalizeRotation(7)).toBe(3);
  });

  it('computes opposite ports', () => {
    expect(opposite(NORTH)).toBe(SOUTH);
    expect(opposite(EAST)).toBe(WEST);
    expect(opposite(SOUTH)).toBe(NORTH);
    expect(opposite(WEST)).toBe(EAST);
  });
});

describe('rotational symmetry', () => {
  it('collapses symmetric pieces to their distinct orientations', () => {
    expect(distinctRotationCount(CANONICAL_BASE_MASK.empty!)).toBe(1);
    expect(distinctRotationCount(CANONICAL_BASE_MASK.cross!)).toBe(1);
    expect(distinctRotationCount(CANONICAL_BASE_MASK.straight!)).toBe(2);
    expect(distinctRotationCount(CANONICAL_BASE_MASK.elbow!)).toBe(4);
    expect(distinctRotationCount(CANONICAL_BASE_MASK.tee!)).toBe(4);
    expect(distinctRotationCount(NORTH)).toBe(4);
  });

  it('straight pieces repeat every two turns', () => {
    const s = CANONICAL_BASE_MASK.straight!;
    expect(rotateMask(s, 2)).toBe(s);
    expect(rotateMask(s, 1)).toBe(EAST | WEST);
  });
});
