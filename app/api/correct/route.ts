import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GRADING_PROMPT, parseGrading } from '../../../lib/grading';
import { retry } from '../../../lib/retry';
import { getApiKey } from '../../../lib/auth-utils';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_MODEL = 'Qwen/Qwen3-VL-32B-Instruct';
const VISION_CHECK_MODEL = 'Qwen/Qwen3-VL-8B-Instruct';
const TEXT_FALLBACK_MODEL = 'Qwen/Qwen3-32B';

const PRECHECK_TIMEOUT_MS = 15000;
const VISION_TIMEOUT_MS = 120000;
const TEXT_TIMEOUT_MS = 60000;

const VISION_PRECHECK_PROMPT = `判断这张图片是否包含可批改的作业题目。包含清晰题目文字回复 YES，否则回复 NO。只回复 YES 或 NO。`;

function getBaseURL(): string {
  return process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';
}

async function fetchAI(messages: any[], model: string, maxTokens: number, temperature: number, timeoutMs: number): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseURL()}/chat/completions`, {
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

async function precheckVision(imageBase64: string, contentType: string): Promise<boolean | null> {
  try {
    const dataUrl = `data:${contentType};base64,${imageBase64}`;
    const raw = await fetchAI(
      [{ role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: VISION_PRECHECK_PROMPT }] }],
      VISION_CHECK_MODEL, 10, 0, PRECHECK_TIMEOUT_MS,
    );
    return raw.trim().toUpperCase().includes('YES');
  } catch {
    return null;
  }
}

async function callVisionGrading(imageBase64: string, contentType: string, model: string): Promise<string> {
  const dataUrl = `data:${contentType};base64,${imageBase64}`;
  return fetchAI(
    [{ role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: `请直接批改图片中的作业题目。${GRADING_PROMPT}` }] }],
    model, 2000, 0.2, VISION_TIMEOUT_MS,
  );
}

async function callTextGrading(ocrText: string, model: string): Promise<string> {
  return fetchAI(
    [{ role: 'user', content: [{ type: 'text', text: `以下是从学生作业图片中通过OCR提取的题目文字：\n\n---\n${ocrText}\n---` }, { type: 'text', text: GRADING_PROMPT }] }],
    model, 2000, 0.2, TEXT_TIMEOUT_MS,
  );
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录后再使用批改功能' }, { status: 401 });
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: '未配置 API Key' }, { status: 503 });
  }

  const formData = await request.formData();
  const image = formData.get('image') as File | null;
  if (!image) return NextResponse.json({ error: '未收到图片' }, { status: 400 });
  if (image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '图片过大，请小于 10MB' }, { status: 413 });
  }

  const model = (formData.get('model') as string) || DEFAULT_MODEL;
  const bytes = Buffer.from(await image.arrayBuffer());
  const contentType = getMimeType(image);
  const imageBase64 = bytes.toString('base64');

  let imageUrl: string | null = null;
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const ext = image.name.split('.').pop() || 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    await writeFile(join(uploadsDir, filename), bytes);
    imageUrl = `/uploads/${filename}`;
  } catch {}

  try {
    const visionFeasible = await precheckVision(imageBase64, contentType);

    let raw = '';

    if (visionFeasible) {
      try {
        raw = await retry(
          () => callVisionGrading(imageBase64, contentType, model),
          { maxRetries: 1, delayMs: 2000, onRetry: (a) => console.log(`Vision retry ${a}`) },
        );
      } catch { raw = ''; }
    }

    if (!raw && visionFeasible === false) {
      return NextResponse.json({ error: 'AI 无法处理这张图片，请重新拍照（确保图片清晰、光线充足、包含完整题目）' }, { status: 422 });
    }

    if (!raw) {
      let ocrText = '';
      try {
        const { ocrImage } = await import('../../../lib/ocr');
        ocrText = await ocrImage(bytes);
      } catch {
        return NextResponse.json({ error: 'AI 无法直接处理这张图片。请重新拍照，确保图片清晰、光线充足。' }, { status: 422 });
      }
      if (!ocrText) {
        return NextResponse.json({ error: '未能从图片中识别到文字，请确保图片包含清晰题目' }, { status: 422 });
      }
      try {
        raw = await retry(
          () => callTextGrading(ocrText, TEXT_FALLBACK_MODEL),
          { maxRetries: 1, delayMs: 1500, onRetry: (a) => console.log(`Text retry ${a}`) },
        );
      } catch {
        return NextResponse.json({ error: '批改超时，AI 暂时无响应，请重试' }, { status: 504 });
      }
    }

    if (!raw) {
      return NextResponse.json({ error: '批改失败，请重试' }, { status: 502 });
    }

    const grading = parseGrading(raw);
    return NextResponse.json({ grading, imageUrl, processingTime: Date.now() - startTime, visionUsed: visionFeasible === true });
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
