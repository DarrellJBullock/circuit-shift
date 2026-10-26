import { create } from 'zustand';

import type { SavedSession } from '@/storage/repositories';

interface SessionStore {
  /** The interrupted game that "Continue" resumes, if any. */
  readonly saved: SavedSession | null;
  setSaved(session: SavedSession | null): void;
}

export const useSession = create<SessionStore>((set) => ({
  saved: null,
  setSaved: (saved) => set({ saved }),
}));
