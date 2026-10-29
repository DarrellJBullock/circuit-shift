import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as Linking from 'expo-linking';

import { PRIVACY_POLICY_URL, SUPPORT_URL, openExternal } from '@/services/links';

const ROOT = join(__dirname, '../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe.each([
  { name: 'privacy policy', url: PRIVACY_POLICY_URL, docs: ['store/review-notes.md'] },
  { name: 'support', url: SUPPORT_URL, docs: [] },
])('$name URL', ({ url, docs }) => {
  it('is an https URL on a real domain', () => {
    const parsed = new URL(url);
    expect(parsed.protocol).toBe('https:');
    expect(parsed.hostname).toMatch(/\.[a-z]{2,}$/);
  });

  it('is the URL given in the App Store listing and the docs', () => {
    for (const path of ['store/listing.md', 'README.md', 'RELEASE.md', ...docs]) {
      expect(read(path)).toContain(url);
    }
  });
});

it('leaves no URL placeholder behind', () => {
  expect(read('store/listing.md')).not.toMatch(/(Privacy Policy|Support) URL: REQUIRED CONFIGURATION/);
  expect(read('README.md')).not.toMatch(/(Privacy policy|Support) URL.*NOT SET/);
  expect(read('src/app/settings.tsx')).not.toMatch(/NOT YET SET/);
});

describe('openExternal', () => {
  it('opens the URL in the system browser', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await openExternal(PRIVACY_POLICY_URL);
    expect(open).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it('swallows failures', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    await expect(openExternal(PRIVACY_POLICY_URL)).resolves.toBeUndefined();
  });
});
