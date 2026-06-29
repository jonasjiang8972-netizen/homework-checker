import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { GRADING_PROMPT, parseGrading } from '../../../lib/grading';
import { retry } from '../../../lib/retry';
import { getApiKey } from '../../../lib/auth-utils';
import { ocrImage } from '../../../lib/ocr';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
const TIMEOUT_MS = 60000;

async function callAnthropicText(
  anthropic: Anthropic,
  ocrText: string,
  model: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.2,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `以下是从学生作业图片中通过OCR提取的题目文字，可能存在识别错误，请根据文字内容批改：\n\n---\n${ocrText}\n---`,
        },
        { type: 'text', text: GRADING_PROMPT },
      ],
    }],
  });

  const textBlock = response.content.find(c => c.type === 'text');
  return (textBlock && 'text' in textBlock) ? textBlock.text : '';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const apiKey = await getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: '未配置 Claude API Key。请在 .env.local 填写或登录后在设置页添加。' },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const image = formData.get('image') as File | null;
  if (!image) {
    return NextResponse.json({ error: '未收到图片' }, { status: 400 });
  }
  if (image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '图片过大，请小于 10MB' }, { status: 413 });
  }

  const requestedModel = formData.get('model') as string | null;
  const model = MODEL_MAP[requestedModel || process.env.ANTHROPIC_MODEL || ''] || DEFAULT_MODEL;

  const bytes = Buffer.from(await image.arrayBuffer());

  let imageUrl: string | null = null;
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const ext = image.name.split('.').pop() || 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    await writeFile(join(uploadsDir, filename), bytes);
    imageUrl = `/uploads/${filename}`;
  } catch {
    // image save failed, continue without it
  }

  let ocrText = '';
  try {
    ocrText = await ocrImage(bytes);
  } catch {
    return NextResponse.json({ error: '图片文字识别失败，请确保图片清晰' }, { status: 422 });
  }

  if (!ocrText) {
    return NextResponse.json({ error: '未能从图片中识别到文字，请确保图片包含清晰题目' }, { status: 422 });
  }

  const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS, baseURL: process.env.ANTHROPIC_BASE_URL });

  try {
    let raw = '';
    
    try {
      raw = await retry(
        () => callAnthropicText(anthropic, ocrText, model),
        {
          maxRetries: 2,
          delayMs: 1500,
          onRetry: (attempt, error) => {
            console.log(`Attempt ${attempt} failed: ${error.message}`);
          },
        }
      );
    } catch (retryError) {
      if (retryError instanceof Error && 
          (retryError.message.includes('timeout') || retryError.message.includes('timed out'))) {
        return NextResponse.json(
          { 
            error: '批改超时，请重试。如果问题持续，请检查网络或稍后重试',
            retryCount: 2,
            lastError: retryError.message
          },
          { status: 504 }
        );
      }
      throw retryError;
    }

    const grading = parseGrading(raw);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({ grading, imageUrl, processingTime });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '批改服务暂时不可用，请稍后再试' },
      { status: 502 }
    );
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

const MODEL_MAP: Record<string, string> = {
  'claude-3-haiku-20240307': 'claude-3-haiku-20240307',
  'claude-3-5-haiku-latest': 'claude-3-5-haiku-latest',
  'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-latest',
  'claude-3-opus-20240229': 'claude-3-opus-20240229',
};
