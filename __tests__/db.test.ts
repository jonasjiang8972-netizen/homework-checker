import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'hw-db-'));
process.env.DATA_DIR = dir;

let db: typeof import('../lib/db');

beforeAll(async () => {
  db = await import('../lib/db');
  await db.getDb();
});
afterAll(() => {
  db.closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe('better-sqlite3 数据层', () => {
  it('建表后可读写', () => {
    const id = db.generateId();
    expect(id).toMatch(/^[a-z0-9]{24}$/);
    db.execute('INSERT INTO knowledge_points (id, name, user_id) VALUES (?, ?, ?)', [id, '分数运算', 'u1']);
    expect(db.queryOne('SELECT name, mastery_level FROM knowledge_points WHERE id = ?', [id])).toEqual({ name: '分数运算', mastery_level: 50 });
    expect(db.queryAll('SELECT * FROM knowledge_points WHERE user_id = ?', ['nobody'])).toEqual([]);
  });
  it('executeBatch 是原子的：失败时整体回滚', () => {
    const a = db.generateId();
    expect(() =>
      db.executeBatch([
        { sql: 'INSERT INTO knowledge_points (id, name, user_id) VALUES (?, ?, ?)', params: [a, '回滚测试', 'u2'] },
        { sql: 'INSERT INTO no_such_table VALUES (1)' },
      ]),
    ).toThrow();
    expect(db.queryOne('SELECT id FROM knowledge_points WHERE id = ?', [a])).toBeNull();
  });
  it('包含复习表与周报设置列', () => {
    db.execute('INSERT INTO review_items (id, user_id, question_id, next_review_at) VALUES (?, ?, ?, ?)', ['r1', 'u1', 'q1', new Date().toISOString()]);
    // question_id 唯一：重复插入被忽略
    db.execute('INSERT OR IGNORE INTO review_items (id, user_id, question_id, next_review_at) VALUES (?, ?, ?, ?)', ['r2', 'u1', 'q1', new Date().toISOString()]);
    expect(db.queryAll('SELECT id FROM review_items')).toHaveLength(1);
    db.execute('INSERT INTO user_settings (user_id, parent_email, weekly_report) VALUES (?, ?, ?)', ['a@b.co', 'p@b.co', 1]);
    expect(db.queryOne('SELECT parent_email, weekly_report FROM user_settings WHERE user_id = ?', ['a@b.co'])).toEqual({ parent_email: 'p@b.co', weekly_report: 1 });
  });
  it('在线备份生成可用文件', async () => {
    const dest = join(dir, 'backup.db');
    await db.backupTo(dest);
    expect(existsSync(dest)).toBe(true);
  });
});
