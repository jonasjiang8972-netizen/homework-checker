import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { file } = await params;
  if (!file || file.includes('..') || file.includes('/')) {
    return NextResponse.json({ error: '无效的文件名' }, { status: 400 });
  }

  const ext = file.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_MAP[ext] || 'application/octet-stream';

  try {
    const filePath = join(process.cwd(), 'data', 'uploads', file);
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}
