import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { GRADING_PROMPT, parseGrading } from '../../../lib/grading';
import { uploadImage } from '../../../lib/supabase';

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

function getMimeType(file: File): ImageMediaType {
  if (file.type && file.type.startsWith('image/')) return file.type as ImageMediaType;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  return 'image/jpeg';
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    return NextResponse.json(
      { error: '未配置 Claude API Key，请在 .env.local 填写 ANTHROPIC_API_KEY' },
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

  const bytes = await image.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mediaType = getMimeType(image);

  const anthropic = new Anthropic({ apiKey, timeout: 30000 });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
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
    const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
    const grading = parseGrading(raw);

    const imageBuffer = Buffer.from(bytes);
    const imageUrl = await uploadImage(imageBuffer, image.name, mediaType);

    return NextResponse.json({ grading, imageUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out');
    return NextResponse.json(
      { error: isTimeout ? '批改超时，请重试' : '批改服务暂时不可用，请稍后再试' },
      { status: 502 }
    );
  }
}
