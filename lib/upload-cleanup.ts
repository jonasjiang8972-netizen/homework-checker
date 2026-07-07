import { unlink, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function getUploadsDir(): string {
  return join(process.cwd(), 'data', 'uploads');
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startUploadCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    cleanupOldUploads().catch(() => undefined);
  }, CLEANUP_INTERVAL_MS);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

let inFlight = false;
async function cleanupOldUploads(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const dir = getUploadsDir();
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    const now = Date.now();
    for (const name of entries) {
      const fp = join(dir, name);
      try {
        const s = await stat(fp);
        if (now - s.mtimeMs > UPLOAD_MAX_AGE_MS) {
          await unlink(fp).catch(() => undefined);
        }
      } catch {
        continue;
      }
    }
  } finally {
    inFlight = false;
  }
}
