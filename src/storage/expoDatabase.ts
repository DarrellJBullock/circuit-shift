import * as SQLite from 'expo-sqlite';

import type { SqlDatabase, SqlValue } from './sql';

export const DATABASE_NAME = 'circuit-shift.db';

/** Opens the on-device database and adapts it to `SqlDatabase`. */
export async function openExpoDatabase(name: string = DATABASE_NAME): Promise<SqlDatabase> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const params = (p?: readonly SqlValue[]) => (p ? [...p] : []);
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, p) => {
      await db.runAsync(sql, params(p));
    },
    first: <T>(sql: string, p?: readonly SqlValue[]) => db.getFirstAsync<T>(sql, params(p)),
    all: <T>(sql: string, p?: readonly SqlValue[]) => db.getAllAsync<T>(sql, params(p)),
    transaction: (task) => db.withTransactionAsync(task),
  };
}
