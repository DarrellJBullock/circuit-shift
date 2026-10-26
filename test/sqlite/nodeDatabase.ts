/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from '@/storage/sql';

/** In-memory SQLite (Node built-in) adapted to the app's SqlDatabase interface. */
export function openNodeDatabase(path = ':memory:'): SqlDatabase & { close(): void } {
  const db = new DatabaseSync(path);
  const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      db.prepare(sql).run(...(params as SqlValue[]));
    },
    first: async <T>(sql: string, params: readonly SqlValue[] = []) => {
      const row = db.prepare(sql).get(...(params as SqlValue[]));
      return row === undefined ? null : plain<T>(row);
    },
    all: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      db.prepare(sql).all(...(params as SqlValue[])).map((r) => plain<T>(r)),
    transaction: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
