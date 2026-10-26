import { CHAPTERS } from '@/levels/registry';

import { PREMIUM_CONTENT_AVAILABLE, isOffered } from '../../app/shop';

describe('shop offers', () => {
  it('never sells premium-chapter products while no premium chapter exists', () => {
    expect(CHAPTERS.some((c) => c.premium)).toBe(PREMIUM_CONTENT_AVAILABLE);
    if (!PREMIUM_CONTENT_AVAILABLE) {
      expect(isOffered('premium_chapter')).toBe(false);
      expect(isOffered('founder_bundle')).toBe(false);
    }
    expect(isOffered('remove_ads')).toBe(true);
  });
});
