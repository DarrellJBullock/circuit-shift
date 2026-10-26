/**
 * Analytics event catalogue. Properties are restricted to ids, counts and
 * enums: no personal data, no free text, no device identifiers.
 */
export interface AnalyticsEvents {
  tutorial_start: Record<string, never>;
  tutorial_complete: { readonly skipped: boolean };
  level_start: { readonly level_id: string; readonly chapter_id: string; readonly resumed: boolean };
  level_complete: {
    readonly level_id: string;
    readonly chapter_id: string;
    readonly moves: number;
    readonly optimal_moves: number | null;
    readonly stars: number;
    readonly hints_used: number;
    readonly duration_s: number;
  };
  level_abandon: { readonly level_id: string; readonly moves: number; readonly duration_s: number };
  hint_used: { readonly level_id: string; readonly source: HintSource };
  daily_start: { readonly date: string };
  daily_complete: { readonly date: string; readonly stars: number; readonly moves: number };
  purchase_started: { readonly product: string };
  purchase_completed: { readonly product: string };
  rewarded_ad_completed: { readonly placement: 'hint' };
}

export type HintSource = 'free' | 'rewarded' | 'entitlement';
export type AnalyticsEventName = keyof AnalyticsEvents;

export const ANALYTICS_EVENT_NAMES: readonly AnalyticsEventName[] = [
  'tutorial_start',
  'tutorial_complete',
  'level_start',
  'level_complete',
  'level_abandon',
  'hint_used',
  'daily_start',
  'daily_complete',
  'purchase_started',
  'purchase_completed',
  'rewarded_ad_completed',
];
