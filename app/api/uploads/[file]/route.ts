import { getServerSession } from 'next-auth';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (!checkRateLimit('uploads', getClientIp(request), 60, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { file } = await params;

  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp|bmp)$/.test(file)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  const ext = file.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_MAP[ext] || 'application/octet-stream';
  const uploadDir = join(process.cwd(), 'data', 'uploads');
  const filePath = join(uploadDir, file);

  if (!filePath.startsWith(uploadDir + sep)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}
