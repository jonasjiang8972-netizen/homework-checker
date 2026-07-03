import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'homework.db');

let _db: SqlJsDatabase | null = null;
let _init: Promise<void> | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  if (_init) { await _init; return _db!; }

  _init = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => join(process.cwd(), 'node_modules/sql.js/dist', file),
    });
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      _db = new SQL.Database(buffer);
    } else {
      _db = new SQL.Database();
    }

    _db.run('PRAGMA journal_mode = WAL');
    _db.run('PRAGMA foreign_keys = ON');
    initSchema(_db!);
    saveDb();
  })();

  await _init;
  return _db!;
}

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema(db: SqlJsDatabase) {
  db.run(`
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

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(email_verify_token);

    CREATE INDEX IF NOT EXISTS idx_kp_user ON knowledge_points(user_id);
    CREATE INDEX IF NOT EXISTS idx_kp_name_user ON knowledge_points(name, user_id);
    CREATE INDEX IF NOT EXISTS idx_plans_user ON study_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_tests_user ON test_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id);
    CREATE INDEX IF NOT EXISTS idx_questions_kp ON questions(knowledge_point);
  `);

  try { db.run("ALTER TABLE user_settings ADD COLUMN base_url TEXT DEFAULT 'https://api.siliconflow.cn/v1'"); } catch {}
  try { db.run("ALTER TABLE test_records ADD COLUMN subject TEXT DEFAULT '数学'"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN email_verify_token TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN email_verify_sent_at TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN email_due_at TEXT"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN last_login_at TEXT"); } catch {}
}

export function queryAll(sql: string, params: any[] = []): Record<string, any>[] {
  if (!_db) throw new Error('Database not initialized');
  const stmt = _db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: Record<string, any>[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function queryOne(sql: string, params: any[] = []): Record<string, any> | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []) {
  if (!_db) throw new Error('Database not initialized');
  _db.run(sql, params);
  saveDb();
}

export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
