import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GRADING_PROMPT, parseGrading } from '../../../lib/grading';
import { getApiKey, getApiBaseUrl } from '../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { startUploadCleanup } from '../../../lib/upload-cleanup';

startUploadCleanup();

const DEFAULT_MODEL = 'meituan/longcat-2.0';
const VISION_TIMEOUT_MS = 90000;
const TEXT_TIMEOUT_MS = 30000;

async function fetchAI(messages: any[], model: string, maxTokens: number, temperature: number, timeoutMs: number): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key');

  const baseURL = (await getApiBaseUrl()) || process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

async function callVisionGrading(imageBase64: string, contentType: string, model: string): Promise<string> {
  const dataUrl = `data:${contentType};base64,${imageBase64}`;
  return fetchAI(
    [{ role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: GRADING_PROMPT }] }],
    model, 800, 0.2, VISION_TIMEOUT_MS,
  );
}

async function callTextGrading(ocrText: string, model: string): Promise<string> {
  return fetchAI(
    [{ role: 'user', content: [{ type: 'text', text: `题目文字：\n${ocrText}` }, { type: 'text', text: GRADING_PROMPT }] }],
    model, 800, 0.2, TEXT_TIMEOUT_MS,
  );
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录后再使用批改功能' }, { status: 401 });
  }

  if (!checkRateLimit('correct', getClientIp(request), 10, 60_000)) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: '未配置 API Key' }, { status: 503 });
  }

  const formData = await request.formData();
  const image = formData.get('image') as File | null;
  const ocrText = formData.get('ocrText') as string | null;

  if (!image && !ocrText) {
    return NextResponse.json({ error: '未收到图片或文字' }, { status: 400 });
  }

  const model = (formData.get('model') as string) || DEFAULT_MODEL;

  let imageUrl: string | null = null;
  let bytes: Buffer | null = null;
  let contentType: ImageMediaType = 'image/jpeg';
  let imageBase64 = '';

  if (image) {
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '图片过大，请小于 10MB' }, { status: 413 });
    }
    bytes = Buffer.from(await image.arrayBuffer());
    contentType = getMimeType(image);
    imageBase64 = bytes.toString('base64');
    try {
      const uploadsDir = join(process.cwd(), 'data', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const ext = image.name.split('.').pop() || 'jpg';
      const filename = `${crypto.randomUUID()}.${ext}`;
      await writeFile(join(uploadsDir, filename), bytes);
      imageUrl = `/api/uploads/${filename}`;
    } catch {}
  }

  try {
    let raw = '';

    if (ocrText && ocrText.trim().length > 5) {
      try {
        raw = await callTextGrading(ocrText.trim(), model);
      } catch { raw = ''; }
    }

    if (!raw && imageBase64) {
      try {
        raw = await callVisionGrading(imageBase64, contentType, model);
      } catch { raw = ''; }
    }

    if (!raw && bytes) {
      try {
        const { ocrImage } = await import('../../../lib/ocr');
        const serverOcrText = await Promise.race([
          ocrImage(bytes),
          new Promise<string>((_, r) => setTimeout(() => r(new Error('OCR timeout')), 15000)),
        ]);
        if (serverOcrText && serverOcrText.trim().length > 5) {
          raw = await callTextGrading(serverOcrText.trim(), model);
        }
      } catch {}
    }

    if (!raw) {
      return NextResponse.json({ error: '批改超时，请重试或换更清晰的图片' }, { status: 504 });
    }

    const grading = parseGrading(raw);
    return NextResponse.json({ grading, imageUrl, processingTime: Date.now() - startTime });
  } catch (error) {
    return NextResponse.json({ error: '批改服务暂时不可用，请稍后再试' }, { status: 502 });
  }
}

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

function getMimeType(file: File): ImageMediaType {
  if (file.type && file.type.startsWith('image/')) return file.type as ImageMediaType;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}
