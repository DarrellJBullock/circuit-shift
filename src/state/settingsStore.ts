import { create } from 'zustand';

export type MotionPreference = 'system' | 'reduced' | 'full';

export interface Settings {
  readonly hapticsEnabled: boolean;
  readonly soundEnabled: boolean;
  readonly motion: MotionPreference;
}

export const DEFAULT_SETTINGS: Settings = {
  hapticsEnabled: true,
  soundEnabled: true,
  motion: 'system',
};

interface SettingsStore extends Settings {
  update(patch: Partial<Settings>): void;
}

/**
 * In-memory settings. Phase 3 hydrates and persists this through SQLite;
 * the store shape stays the same.
 */
export const useSettings = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  update: (patch) => set(patch),
}));
