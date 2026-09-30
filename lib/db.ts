import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const DB_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'homework.db');

let _db: Database.Database | null = null;

/**
 * 打开数据库（better-sqlite3，WAL 模式，写入即落盘）。
 * 保持 async 签名以兼容原有调用方；旧的 sql.js 导出文件是标准 SQLite 格式，可直接沿用。
 */
export async function getDb(): Promise<Database.Database> {
  return openDb();
}

function openDb(): Database.Database {
  if (_db) return _db;
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  _db = db;
  return db;
}

/** 在线备份（写入进行中也安全） */
export async function backupTo(dest: string): Promise<void> {
  await openDb().backup(dest);
}

/** 关闭连接（测试与优雅退出使用） */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_points (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT DEFAULT '未分类',
      parent_id TEXT,
      mastery_level INTEGER DEFAULT 50,
      total_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      last_practiced_at TEXT,
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      target_knowledge_point TEXT,
      current_mastery INTEGER DEFAULT 50,
      target_mastery INTEGER DEFAULT 80,
      status TEXT DEFAULT 'pending',
      steps TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS test_records (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      plan_id TEXT,
      knowledge_point TEXT,
      questions_json TEXT,
      answers_json TEXT,
      score INTEGER,
      total INTEGER,
      passed INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      question TEXT,
      error_analysis TEXT,
      subject TEXT,
      image_url TEXT,
      is_correct INTEGER,
      knowledge_point TEXT,
      error_type TEXT,
      mastery_delta INTEGER DEFAULT 0,
      grading_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      anthropic_key_encrypted TEXT,
      base_url TEXT DEFAULT 'https://api.siliconflow.cn/v1',
      default_subject TEXT DEFAULT '数学',
      default_model TEXT DEFAULT 'claude-3-5-sonnet-latest',
      mode TEXT DEFAULT 'student',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      email_verified INTEGER DEFAULT 0,
      email_verify_token TEXT,
      email_verify_sent_at TEXT,
      email_due_at TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      knowledge_point TEXT,
      stage INTEGER DEFAULT 0,
      next_review_at TEXT NOT NULL,
      last_result INTEGER,
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(email_verify_token);

    CREATE INDEX IF NOT EXISTS idx_kp_user ON knowledge_points(user_id);
    CREATE INDEX IF NOT EXISTS idx_kp_name_user ON knowledge_points(name, user_id);
    CREATE INDEX IF NOT EXISTS idx_plans_user ON study_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_tests_user ON test_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id);
    CREATE INDEX IF NOT EXISTS idx_questions_kp ON questions(knowledge_point);
    CREATE INDEX IF NOT EXISTS idx_questions_user_created ON questions(user_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_review_question ON review_items(question_id);
    CREATE INDEX IF NOT EXISTS idx_review_due ON review_items(user_id, done, next_review_at);
  `);

  const alters = [
    "ALTER TABLE user_settings ADD COLUMN base_url TEXT DEFAULT 'https://api.siliconflow.cn/v1'",
    "ALTER TABLE test_records ADD COLUMN subject TEXT DEFAULT '数学'",
    'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN email_verify_token TEXT',
    'ALTER TABLE users ADD COLUMN email_verify_sent_at TEXT',
    'ALTER TABLE users ADD COLUMN email_due_at TEXT',
    'ALTER TABLE users ADD COLUMN last_login_at TEXT',
    'ALTER TABLE user_settings ADD COLUMN parent_email TEXT',
    'ALTER TABLE user_settings ADD COLUMN weekly_report INTEGER DEFAULT 0',
    'ALTER TABLE user_settings ADD COLUMN last_report_at TEXT',
  ];
  for (const sql of alters) {
    try { db.exec(sql); } catch {}
  }

  migrateOldUsers(db);
}

/** Migrate existing users (identified by email as user_id) to the new users table */
function migrateOldUsers(db: Database.Database) {
  const looksLikeEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const tables = ['questions', 'knowledge_points', 'study_plans', 'test_records', 'user_settings'];

  const emailSet = new Set<string>();
  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT DISTINCT user_id FROM ${table} WHERE user_id IS NOT NULL`).all() as Array<{ user_id: string }>;
      for (const { user_id: uid } of rows) {
        if (looksLikeEmail(uid)) emailSet.add(uid);
      }
    } catch {}
  }

  for (const email of emailSet) {
    try {
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) continue;

      const id = generateId();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, email_verified, email_due_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
      ).run(id, email, 'MIGRATED_RESET_REQUIRED', email.split('@')[0], new Date(Date.now() + 30 * 86400000).toISOString());

      for (const table of tables) {
        try {
          db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`).run(id, email);
        } catch {}
      }
    } catch {}
  }
}

export function queryAll(sql: string, params: any[] = []): Record<string, any>[] {
  return openDb().prepare(sql).all(...params) as Record<string, any>[];
}

export function queryOne(sql: string, params: any[] = []): Record<string, any> | null {
  return (openDb().prepare(sql).get(...params) as Record<string, any> | undefined) ?? null;
}

export function execute(sql: string, params: any[] = []) {
  openDb().prepare(sql).run(...params);
}

export function executeBatch(operations: Array<{ sql: string; params?: any[] }>) {
  const db = openDb();
  db.transaction(() => {
    for (const op of operations) db.prepare(op.sql).run(...(op.params || []));
  })();
}

export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(24);
  let id = '';
  for (let i = 0; i < 24; i++) id += chars[bytes[i] % chars.length];
  return id;
}
