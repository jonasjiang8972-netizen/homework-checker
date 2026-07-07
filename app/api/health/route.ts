import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne } from '../../../lib/db';
import { startBackupCron } from '../../../lib/backup';

startBackupCron();

export async function GET(_request: NextRequest) {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  try {
    await getDb();
    queryOne('SELECT 1 AS ok');
    health.db = 'ok';
  } catch (e: unknown) {
    health.db = 'down';
    health.status = 'degraded';
    health.db_error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
  });
}
