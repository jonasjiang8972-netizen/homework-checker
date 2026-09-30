import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';
import { fetchChat } from '../../../../lib/ai';
import { getApiKey } from '../../../../lib/auth-utils';
import { buildSplitPrompt, parseSplitResponse } from '../../../../lib/vision-split';

const DEFAULT_MODEL = 'meituan/longcat-2.0';
const SPLIT_TIMEOUT_MS = 60_000;

/** 用视觉模型直接把整页作业切成独立题目（OCR 切分失败或题号不规范时的更稳方案） */
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录后再使用批改功能' }, { status: 401 });
  }

  if (!(await checkRateLimit('correct-split', getClientIp(request), 10, 60_000))) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
  }

  if (!(await getApiKey())) {
    return NextResponse.json({ error: '未配置 API Key' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const image = formData.get('image') as File | null;
  if (!image) return NextResponse.json({ error: '未收到图片' }, { status: 400 });
  if (image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '图片过大，请小于 10MB' }, { status: 413 });
  }

  const subject = ((formData.get('subject') as string) || '数学').slice(0, 20);
  const model = (formData.get('model') as string) || DEFAULT_MODEL;
  const contentType = image.type && image.type.startsWith('image/') ? image.type : 'image/jpeg';
  const base64 = Buffer.from(await image.arrayBuffer()).toString('base64');

  try {
    const raw = await fetchChat(
      [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64}` } },
          { type: 'text', text: buildSplitPrompt(subject) },
        ],
      }],
      model, 2000, 0.1, SPLIT_TIMEOUT_MS,
    );
    const questions = parseSplitResponse(raw);
    return NextResponse.json({ questions, count: questions.length });
  } catch {
    return NextResponse.json({ error: '切题服务暂时不可用，请稍后再试' }, { status: 502 });
  }
}
