import * as Linking from 'expo-linking';

/** Published privacy policy. Also entered in App Store Connect (see store/listing.md). */
export const PRIVACY_POLICY_URL = 'https://evercrest-interactive.com/apps/circuit-shift/privacy.html';

/** Support page; null until Evercrest publishes it. */
export const SUPPORT_URL: string | null = null;

/** Opens a page in the system browser. Failures (no browser, bad URL) are ignored. */
export async function openExternal(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing useful to show; the page stays reachable from the App Store listing.
  }
}
