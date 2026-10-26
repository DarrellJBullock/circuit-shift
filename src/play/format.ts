export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Label for the move reference. "Optimal" only when the solver proved it;
 * otherwise it is a verified target (upper bound), never called optimal.
 */
export function referenceLabel(optimalMoves: number | null, parMoves: number): string {
  return optimalMoves !== null ? `Optimal ${optimalMoves}` : `Target ${parMoves}`;
}
