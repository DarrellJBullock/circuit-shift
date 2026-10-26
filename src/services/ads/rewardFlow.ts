/**
 * Pure reward state machine for one rewarded-ad showing.
 *
 * The ONLY path to `rewarded` is an `earned` event from the ad SDK (its
 * verified reward callback) received before the ad finished. Closing,
 * erroring or timing out without it never grants anything; a late `earned`
 * after the flow settled is ignored.
 */
export type AdEvent =
  | { readonly type: 'shown' }
  | { readonly type: 'earned' }
  | { readonly type: 'closed' }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'timeout' };

export type RewardOutcome =
  | { readonly kind: 'rewarded' }
  | { readonly kind: 'dismissed' }
  | { readonly kind: 'unavailable'; readonly reason: string }
  | { readonly kind: 'error'; readonly message: string };

export interface RewardFlowState {
  readonly phase: 'showing' | 'settled';
  readonly earned: boolean;
  readonly outcome: RewardOutcome | null;
}

export const INITIAL_REWARD_FLOW: RewardFlowState = { phase: 'showing', earned: false, outcome: null };

export function rewardFlow(state: RewardFlowState, event: AdEvent): RewardFlowState {
  if (state.phase === 'settled') return state;
  switch (event.type) {
    case 'shown':
      return state;
    case 'earned':
      return { ...state, earned: true };
    case 'closed':
      return { phase: 'settled', earned: state.earned, outcome: state.earned ? { kind: 'rewarded' } : { kind: 'dismissed' } };
    case 'error':
      // An error after the reward was earned still honours the reward.
      return {
        phase: 'settled',
        earned: state.earned,
        outcome: state.earned ? { kind: 'rewarded' } : { kind: 'error', message: event.message },
      };
    case 'timeout':
      return { phase: 'settled', earned: state.earned, outcome: state.earned ? { kind: 'rewarded' } : { kind: 'dismissed' } };
  }
}
