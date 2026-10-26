import type { SqlDatabase } from './sql';

/**
 * Versioned schema migrations. The schema version lives in SQLite's
 * `PRAGMA user_version`. Each migration runs in one transaction together with
 * its version bump, so a failure leaves the previous version intact.
 *
 * Rules: never edit a shipped migration; append a new one. Purchase
 * entitlements are deliberately NOT stored here; they come only from the
 * store SDK (Phase 6).
 */
export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly statements: readonly string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    statements: [
      `CREATE TABLE level_progress (
         level_id     TEXT PRIMARY KEY,
         completed    INTEGER NOT NULL DEFAULT 0,
         best_stars   INTEGER NOT NULL DEFAULT 0,
         best_moves   INTEGER,
         best_time_ms INTEGER,
         completions  INTEGER NOT NULL DEFAULT 0,
         updated_at   INTEGER NOT NULL
       )`,
      `CREATE TABLE settings (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      `CREATE TABLE sessions (
         slot              TEXT PRIMARY KEY,
         level_id          TEXT NOT NULL,
         level_fingerprint TEXT NOT NULL,
         snapshot          TEXT NOT NULL,
         updated_at        INTEGER NOT NULL
       )`,
      `CREATE TABLE daily_challenges (
         date              TEXT PRIMARY KEY,
         generator_version TEXT NOT NULL,
         seed              INTEGER NOT NULL,
         completed         INTEGER NOT NULL DEFAULT 0,
         best_stars        INTEGER NOT NULL DEFAULT 0,
         best_moves        INTEGER,
         best_time_ms      INTEGER,
         updated_at        INTEGER NOT NULL
       )`,
    ],
  },
];

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly code: 'newerSchema' | 'failed',
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export async function schemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Brings the database up to the latest version. Returns the versions applied.
 * Throws `MigrationError('newerSchema')` if the database was written by a
 * newer app build (downgrade); the caller should then run without persistence
 * rather than risk corrupting data.
 */
export async function migrate(
  db: SqlDatabase,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number[]> {
  assertOrdered(migrations);
  const latest = migrations[migrations.length - 1]?.version ?? 0;
  const current = await schemaVersion(db);
  if (current > latest) {
    throw new MigrationError(`database schema v${current} is newer than this app (v${latest})`, 'newerSchema');
  }
  const applied: number[] = [];
  for (const m of migrations) {
    if (m.version <= current) continue;
    try {
      await db.transaction(async () => {
        for (const sql of m.statements) await db.exec(sql);
        await db.exec(`PRAGMA user_version = ${m.version}`);
      });
    } catch (e) {
      throw new MigrationError(`migration v${m.version} (${m.name}) failed: ${String(e)}`, 'failed');
    }
    applied.push(m.version);
  }
  return applied;
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((m, i) => {
    if (m.version !== i + 1) throw new Error(`migrations must be numbered 1..n; found v${m.version} at ${i}`);
  });
}
