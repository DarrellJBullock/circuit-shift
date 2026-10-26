import { EAST, NORTH, SOUTH, WEST } from '@/engine';

import { flowPath, layoutBoard, wirePath } from '../geometry';

describe('wire geometry', () => {
  it('draws one centre-to-edge segment per open port', () => {
    expect(wirePath(NORTH | SOUTH, 100)).toBe('M50 50L50 0M50 50L50 100');
  });

  it('orients the inflow segment edge → centre and the rest centre → edge', () => {
    // Elbow N|E with power arriving from the north.
    expect(flowPath(NORTH | EAST, NORTH, 100)).toBe('M50 0L50 50M50 50L100 50');
    // Source (no inflow): everything flows outward, starting at the body radius.
    expect(flowPath(EAST, 0, 100, 20)).toBe('M70 50L100 50');
    expect(flowPath(WEST | SOUTH, WEST, 100)).toBe('M50 50L50 100M0 50L50 50');
  });

  it('lays out the largest square cell that fits', () => {
    expect(layoutBoard(7, 8, 343, 500)).toEqual({ cell: 49, width: 343, height: 392 });
    expect(layoutBoard(3, 3, 400, 400)).toEqual({ cell: 96, width: 288, height: 288 });
    expect(layoutBoard(4, 4, 0, 0).cell).toBe(0);
  });
});
