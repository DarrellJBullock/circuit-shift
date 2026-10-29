import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as Linking from 'expo-linking';

import { PRIVACY_POLICY_URL, openExternal } from '@/services/links';

const ROOT = join(__dirname, '../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('privacy policy URL', () => {
  it('is an https URL on a real domain', () => {
    const url = new URL(PRIVACY_POLICY_URL);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toMatch(/\.[a-z]{2,}$/);
  });

  it('is the URL given in the App Store listing and the docs', () => {
    for (const path of ['store/listing.md', 'store/review-notes.md', 'README.md', 'RELEASE.md']) {
      expect(read(path)).toContain(PRIVACY_POLICY_URL);
    }
  });

  it('leaves no placeholder behind', () => {
    expect(read('store/listing.md')).not.toMatch(/Privacy Policy URL: REQUIRED CONFIGURATION/);
    expect(read('README.md')).not.toMatch(/Privacy policy URL.*NOT SET/);
    expect(read('src/app/settings.tsx')).not.toMatch(/Privacy policy URL/);
  });
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
