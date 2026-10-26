import { openNodeDatabase } from '../../../test/sqlite/nodeDatabase';
import { MIGRATIONS, type Migration, MigrationError, migrate, schemaVersion } from '../migrations';

const tables = async (db: ReturnType<typeof openNodeDatabase>) =>
  (await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).map(
    (r) => r.name,
  );

describe('migrations', () => {
  it('creates the v1 schema on a fresh database', async () => {
    const db = openNodeDatabase();
    expect(await schemaVersion(db)).toBe(0);
    expect(await migrate(db)).toEqual([1]);
    expect(await schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(await tables(db)).toEqual(['daily_challenges', 'level_progress', 'sessions', 'settings']);
  });

  it('is idempotent', async () => {
    const db = openNodeDatabase();
    await migrate(db);
    expect(await migrate(db)).toEqual([]);
  });

  it('upgrades an existing v1 database without losing data', async () => {
    const db = openNodeDatabase();
    await migrate(db);
    await db.run("INSERT INTO level_progress (level_id, completed, best_stars, updated_at) VALUES ('ch1-01', 1, 3, 0)");
    const v2: Migration = {
      version: 2,
      name: 'test: add hints column',
      statements: ['ALTER TABLE level_progress ADD COLUMN best_hints INTEGER'],
    };
    expect(await migrate(db, [...MIGRATIONS, v2])).toEqual([2]);
    const row = await db.first<{ best_stars: number; best_hints: number | null }>(
      'SELECT best_stars, best_hints FROM level_progress',
    );
    expect(row).toEqual({ best_stars: 3, best_hints: null });
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const db = openNodeDatabase();
    await migrate(db);
    const broken: Migration = {
      version: 2,
      name: 'test: broken',
      statements: ['CREATE TABLE half_done (id INTEGER)', 'THIS IS NOT SQL'],
    };
    await expect(migrate(db, [...MIGRATIONS, broken])).rejects.toMatchObject({ code: 'failed' });
    expect(await schemaVersion(db)).toBe(1);
    expect(await tables(db)).not.toContain('half_done');
  });

  it('refuses to run against a newer schema (downgrade)', async () => {
    const db = openNodeDatabase();
    await db.exec('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toBeInstanceOf(MigrationError);
    await expect(migrate(db)).rejects.toMatchObject({ code: 'newerSchema' });
  });

  it('rejects a mis-numbered migration list', async () => {
    const db = openNodeDatabase();
    await expect(migrate(db, [{ version: 2, name: 'gap', statements: [] }])).rejects.toThrow('numbered');
  });
});
