import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { backupTo } from './db';

const BACKUP_DIR = join(process.env.DATA_DIR || join(process.cwd(), 'data'), 'backups');
const RETENTION_DAYS = 7;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

export function startBackupCron(): void {
  if (timer) return;
  runBackup().catch(() => undefined);
  timer = setInterval(() => {
    runBackup().catch(() => undefined);
  }, INTERVAL_MS);
  if (timer.unref) timer.unref();
}

async function runBackup(): Promise<void> {
  await mkdir(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const dest = join(BACKUP_DIR, `homework-${ts}.db`);
  // better-sqlite3 在线备份：WAL 模式下直接拷贝文件可能得到不一致的快照
  await backupTo(dest).catch(() => undefined);

  const now = Date.now();
  let entries: string[];
  try {
    entries = await readdir(BACKUP_DIR);
  } catch {
    return;
  }
  for (const name of entries) {
    if (!name.endsWith('.db')) continue;
    const fp = join(BACKUP_DIR, name);
    try {
      const s = await stat(fp);
      if (now - s.mtimeMs > RETENTION_DAYS * 24 * 60 * 60 * 1000) {
        await unlink(fp).catch(() => undefined);
      }
    } catch {
      continue;
    }
  }
}
