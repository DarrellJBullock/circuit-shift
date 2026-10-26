import { useGame } from '@/state/gameStore';
import { DEFAULT_SETTINGS, useSettings } from '@/state/settingsStore';

import { type AnalyticsSink, setAnalyticsSink, track } from '../analytics/analytics';
import { initAnalyticsBridge } from '../analytics/bridge';
import { ANALYTICS_EVENT_NAMES } from '../analytics/events';

const events: { event: string; props: Record<string, unknown> }[] = [];
const recorder: AnalyticsSink = { name: 'test', track: (event, props) => events.push({ event, props: props as Record<string, unknown> }) };

let stop: () => void = () => undefined;
beforeEach(() => {
  events.length = 0;
  setAnalyticsSink(recorder);
  useSettings.setState({ ...DEFAULT_SETTINGS });
  useGame.getState().clear();
  stop = initAnalyticsBridge();
});
afterEach(() => stop());

describe('analytics', () => {
  it('is opt-in: nothing is sent while disabled (the default)', () => {
    expect(DEFAULT_SETTINGS.analyticsEnabled).toBe(false);
    track('level_start', { level_id: 'ch1-01', chapter_id: 'ch1', resumed: false });
    useGame.getState().start('ch1-03');
    expect(events).toEqual([]);
  });

  it('emits level_start, hint_used and level_complete from gameplay when enabled', () => {
    useSettings.setState({ analyticsEnabled: true });
    useGame.getState().start('ch1-01');
    useGame.getState().requestHint(); // 1-move level: the hint solves it
    expect(events.map((e) => e.event)).toEqual(['level_start', 'tutorial_start', 'hint_used', 'level_complete']);
    expect(events.find((e) => e.event === 'hint_used')!.props).toEqual({ level_id: 'ch1-01', source: 'free' });
    expect(events.find((e) => e.event === 'level_complete')!.props).toMatchObject({ level_id: 'ch1-01', stars: 2, hints_used: 1 });
  });

  it('emits level_abandon when leaving mid-level, and daily events for dailies', () => {
    useSettings.setState({ tutorial: 'done' });
    useSettings.setState({ analyticsEnabled: true });
    useGame.getState().start('ch1-03');
    useGame.getState().dispatch({ type: 'rotate', index: 1 });
    useGame.getState().clear();
    useGame.getState().start('daily-2026-10-26');
    expect(events.map((e) => e.event)).toEqual(['level_start', 'level_abandon', 'daily_start']);
  });

  it('reports tutorial completion and skipping', () => {
    useSettings.setState({ analyticsEnabled: true });
    useSettings.getState().update({ tutorial: 'skipped' });
    expect(events).toEqual([{ event: 'tutorial_complete', props: { skipped: true } }]);
  });

  it('defines exactly the specified event catalogue, with no personal-data fields', () => {
    expect([...ANALYTICS_EVENT_NAMES].sort()).toEqual(
      [
        'daily_complete', 'daily_start', 'hint_used', 'level_abandon', 'level_complete', 'level_start',
        'purchase_completed', 'purchase_started', 'rewarded_ad_completed', 'tutorial_complete', 'tutorial_start',
      ].sort(),
    );
    useSettings.setState({ tutorial: 'done' });
    useSettings.setState({ analyticsEnabled: true });
    useGame.getState().start('ch1-03');
    useGame.getState().requestHint();
    const tokens = events.flatMap((e) => Object.keys(e.props)).flatMap((k) => k.split('_'));
    const personal = ['name', 'email', 'device', 'ip', 'user', 'location', 'idfa', 'idfv', 'advertising', 'phone'];
    expect(tokens.filter((t) => personal.includes(t))).toEqual([]);
  });

  it('a failing sink never breaks gameplay', () => {
    useSettings.setState({ analyticsEnabled: true });
    setAnalyticsSink({ name: 'broken', track: () => { throw new Error('vendor down'); } });
    expect(() => useGame.getState().start('ch1-03')).not.toThrow();
  });
});
