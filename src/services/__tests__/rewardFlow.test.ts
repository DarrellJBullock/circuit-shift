import { type AdEvent, INITIAL_REWARD_FLOW, rewardFlow } from '../ads/rewardFlow';

const run = (...events: AdEvent[]) => events.reduce(rewardFlow, INITIAL_REWARD_FLOW).outcome;

describe('rewarded ad: reward requires the SDK callback', () => {
  it('rewards only when EARNED_REWARD arrives before the ad closes', () => {
    expect(run({ type: 'shown' }, { type: 'earned' }, { type: 'closed' })).toEqual({ kind: 'rewarded' });
  });

  it('closing early (no reward callback) grants nothing', () => {
    expect(run({ type: 'shown' }, { type: 'closed' })).toEqual({ kind: 'dismissed' });
  });

  it('an error without the reward callback grants nothing', () => {
    expect(run({ type: 'error', message: 'no fill' })).toEqual({ kind: 'error', message: 'no fill' });
  });

  it('a timeout without the callback grants nothing', () => {
    expect(run({ type: 'shown' }, { type: 'timeout' })).toEqual({ kind: 'dismissed' });
  });

  it('a reward earned before a later error or timeout is still honoured', () => {
    expect(run({ type: 'earned' }, { type: 'error', message: 'x' })).toEqual({ kind: 'rewarded' });
    expect(run({ type: 'earned' }, { type: 'timeout' })).toEqual({ kind: 'rewarded' });
  });

  it('ignores events after settling (a late reward cannot flip a dismissal)', () => {
    expect(run({ type: 'closed' }, { type: 'earned' }, { type: 'closed' })).toEqual({ kind: 'dismissed' });
  });

  it('never settles to rewarded for any sequence without an earned event', () => {
    const pool: AdEvent[] = [{ type: 'shown' }, { type: 'closed' }, { type: 'error', message: 'e' }, { type: 'timeout' }];
    for (const a of pool) for (const b of pool) for (const c of pool) {
      expect(run(a, b, c)?.kind).not.toBe('rewarded');
    }
  });
});
