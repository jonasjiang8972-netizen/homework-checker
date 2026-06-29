import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { GRADING_PROMPT, parseGrading } from '../../../lib/grading';
import { uploadImage } from '../../../lib/supabase';
import { retry } from '../../../lib/retry';
import { getApiKey } from '../../../lib/auth-utils';

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

const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
const TIMEOUT_MS = 30000;

async function callAnthropic(
  anthropic: Anthropic,
  base64: string,
  mediaType: ImageMediaType,
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
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
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

  const bytes = await image.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mediaType = getMimeType(image);

  const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS });

  try {
    let raw = '';
    
    try {
      raw = await retry(
        () => callAnthropic(anthropic, base64, mediaType, model),
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

    return NextResponse.json({ grading, imageUrl: null, processingTime });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '批改服务暂时不可用，请稍后再试' },
      { status: 502 }
    );
  }
}
