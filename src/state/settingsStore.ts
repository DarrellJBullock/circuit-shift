import { create } from 'zustand';

export type MotionPreference = 'system' | 'reduced' | 'full';
export type TutorialState = 'pending' | 'done' | 'skipped';

/** Player preferences plus small persisted flags (stored as key/value rows). */
export interface Settings {
  readonly hapticsEnabled: boolean;
  readonly soundEnabled: boolean;
  readonly motion: MotionPreference;
  readonly tutorial: TutorialState;
}

export const DEFAULT_SETTINGS: Settings = {
  hapticsEnabled: true,
  soundEnabled: true,
  motion: 'system',
  tutorial: 'pending',
};

export const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

interface SettingsStore extends Settings {
  update(patch: Partial<Settings>): void;
}

/** Hydrated from and written through to SQLite by `storage/persistence.ts`. */
export const useSettings = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  update: (patch) => set(patch),
}));
