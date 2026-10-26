import { premiumGate } from '@/levels/progression';
import { hintAccess } from '@/play/hintPolicy';
import { migrate } from '@/storage/migrations';
import { loadProgress, loadSettings } from '@/storage/repositories';
import { hasEntitlement, useEntitlements } from '@/state/entitlementStore';
import { useGame } from '@/state/gameStore';

import { openNodeDatabase } from '../../../test/sqlite/nodeDatabase';
import { createDisabledAds } from '../ads/disabled';
import { createDisabledPurchases } from '../purchases/disabled';

beforeEach(() => {
  useEntitlements.setState({ active: new Set() });
  useGame.getState().clear();
});

describe('purchases cannot be unlocked from local flags', () => {
  it('the database has nowhere to store entitlements', async () => {
    const db = openNodeDatabase();
    await migrate(db);
    const cols = await db.all<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table'");
    expect(cols.map((c) => c.sql).join('\n')).not.toMatch(/entitle|premium|no_ads|remove_ads|purchase/i);
  });

  it('hand-written "unlock" rows in local storage grant nothing', async () => {
    const db = openNodeDatabase();
    await migrate(db);
    await db.run("INSERT INTO settings (key, value) VALUES ('no_ads', 'true'), ('premium_content', 'true'), ('entitlements', 'no_ads,premium_content')");
    await db.run("INSERT INTO level_progress (level_id, completed, best_stars, updated_at) VALUES ('premium_content', 1, 3, 0)");
    const settings = await loadSettings(db);
    await loadProgress(db);
    expect(Object.keys(settings)).not.toContain('no_ads');
    expect(hasEntitlement('no_ads')).toBe(false);
    expect(hasEntitlement('premium_content')).toBe(false);
  });

  it('the entitlement store accepts only known identifiers', () => {
    useEntitlements.getState().applyVerified(['no_ads', 'admin', 'everything']);
    expect([...useEntitlements.getState().active]).toEqual(['no_ads']);
  });

  it('the disabled adapter never purchases, restores or grants', async () => {
    const p = createDisabledPurchases('not configured');
    expect(p.status()).toEqual({ state: 'disabled', reason: 'not configured' });
    expect(await p.purchase('founder_bundle')).toEqual({ kind: 'disabled' });
    expect(await p.restore()).toEqual({ kind: 'disabled' });
    expect(await p.getProducts()).toEqual([]);
    expect(useEntitlements.getState().active.size).toBe(0);
  });
});

describe('premium chapters', () => {
  it('require the verified entitlement regardless of progress', () => {
    const base = { results: {}, tutorial: 'done' as const };
    expect(premiumGate({ premium: false }, base)).toBe(true);
    expect(premiumGate({ premium: true }, base)).toBe(false);
    expect(premiumGate({ premium: true }, { ...base, premium: true })).toBe(true);
  });
});

describe('ad rewards require a confirmed callback', () => {
  it('the disabled ads adapter reports unavailable, never rewarded', async () => {
    const ads = createDisabledAds('not configured');
    expect(ads.isRewardedReady()).toBe(false);
    expect(await ads.showRewarded()).toEqual({ kind: 'unavailable', reason: 'not configured' });
  });

  it('a rewarded hint is applied only for a rewarded outcome', () => {
    useGame.getState().start('ch1-03');
    const { requestRewardedHint } = useGame.getState();
    expect(requestRewardedHint({ kind: 'dismissed' })).toBeNull();
    expect(requestRewardedHint({ kind: 'error', message: 'x' })).toBeNull();
    expect(requestRewardedHint({ kind: 'unavailable', reason: 'x' })).toBeNull();
    expect(useGame.getState().game!.hintsUsed).toBe(0);
    expect(requestRewardedHint({ kind: 'rewarded' })).not.toBeNull();
    expect(useGame.getState().game!.hintsUsed).toBe(1);
    expect(useGame.getState().lastHintSource).toBe('rewarded');
  });
});

describe('hint economy', () => {
  it('free hints first, then entitlement or ad, else none', () => {
    expect(hintAccess(0, { noAds: false, adsAvailable: true })).toEqual({ kind: 'free', remaining: 3 });
    expect(hintAccess(3, { noAds: true, adsAvailable: false })).toEqual({ kind: 'unlimited' });
    expect(hintAccess(3, { noAds: false, adsAvailable: true })).toEqual({ kind: 'watchAd' });
    expect(hintAccess(5, { noAds: false, adsAvailable: false })).toEqual({ kind: 'none' });
  });

  it('remove-ads owners keep getting hints after the free ones, without ads', () => {
    useGame.getState().start('ch1-20');
    for (let i = 0; i < 3; i++) expect(useGame.getState().requestHint()).not.toBeNull();
    expect(useGame.getState().requestHint()).toBeNull(); // no entitlement, no ad
    useEntitlements.getState().applyVerified(['no_ads']);
    expect(useGame.getState().requestHint()).not.toBeNull();
    expect(useGame.getState().lastHintSource).toBe('entitlement');
  });
});
