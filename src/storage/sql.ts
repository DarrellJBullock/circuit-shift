/**
 * Minimal async SQL surface used by repositories and migrations.
 *
 * Production wraps expo-sqlite (`expoDatabase.ts`); tests wrap Node's built-in
 * `node:sqlite`, so migrations and queries run against a real SQLite engine.
 */
export type SqlValue = string | number | null;

export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Runs `task` atomically; rolls back and rethrows if it throws. */
  transaction(task: () => Promise<void>): Promise<void>;
}
