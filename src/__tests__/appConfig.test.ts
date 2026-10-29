import type { ConfigContext, ExpoConfig } from 'expo/config';

const IOS_ID = 'ca-app-pub-1111111111111111~2222222222';
const ENV_KEYS = ['EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM', 'ADMOB_IOS_APP_ID', 'ADMOB_ANDROID_APP_ID'] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** Evaluates app.config.ts with the given environment (it reads env at import time). */
function admobIds(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  let config: ExpoConfig | undefined;
  jest.isolateModules(() => {
    const factory = jest.requireActual<{ default: (ctx: ConfigContext) => ExpoConfig }>('../../app.config').default;
    config = factory({ config: { name: 'Circuit Shift', slug: 'circuit-shift' } } as ConfigContext);
  });
  const plugin = config!.plugins!.find((p) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
  return (plugin as [string, { iosAppId: string; androidAppId: string }])[1];
}

describe('app.config AdMob app IDs', () => {
  it('uses Google sample IDs outside production', () => {
    expect(admobIds({}).iosAppId).toMatch(/^ca-app-pub-3940256099942544~/);
  });

  it('builds iOS production with only the iOS ID set', () => {
    const ids = admobIds({ EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'ios', ADMOB_IOS_APP_ID: IOS_ID });
    expect(ids.iosAppId).toBe(IOS_ID);
  });

  it('refuses an iOS production build without the iOS ID', () => {
    expect(() => admobIds({ EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'ios' })).toThrow(/ADMOB_IOS_APP_ID/);
  });

  it('still requires the Android ID for an Android production build', () => {
    expect(() =>
      admobIds({ EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'android', ADMOB_IOS_APP_ID: IOS_ID }),
    ).toThrow(/ADMOB_ANDROID_APP_ID/);
  });

  it('requires both when the platform is unknown', () => {
    expect(() => admobIds({ EAS_BUILD_PROFILE: 'production', ADMOB_IOS_APP_ID: IOS_ID })).toThrow(
      /ADMOB_ANDROID_APP_ID/,
    );
  });
});
