import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GRADING_PROMPT, parseGrading, GradingResult } from '../../../../lib/grading';
import { getApiKey, getApiBaseUrl } from '../../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limit';

const DEFAULT_MODEL = 'meituan/longcat-2.0';
const TEXT_TIMEOUT_MS = 30000;

async function callTextGrading(ocrText: string, model: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key');

  const baseURL = (await getApiBaseUrl()) || process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: [{ type: 'text', text: `题目文字：\n${ocrText}` }, { type: 'text', text: GRADING_PROMPT }] },
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
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

async function gradeQuestion(text: string, model: string): Promise<GradingResult> {
  try {
    const raw = await callTextGrading(text, model);
    if (raw) return parseGrading(raw);
  } catch {}
  return {
    is_correct: false,
    error_type: '',
    knowledge_point: '',
    guidance: '',
    error_spot: '',
    correct_solution: '',
    analysis: '批改失败，请重试',
    knowledge_tags: [],
  };
}

async function gradeParallel(questions: string[], model: string): Promise<GradingResult[]> {
  return Promise.all(questions.map(q => gradeQuestion(q, model)));
}

async function gradeSerial(questions: string[], model: string): Promise<GradingResult[]> {
  const results: GradingResult[] = [];
  for (const q of questions) {
    results.push(await gradeQuestion(q, model));
  }
  return results;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '请先登录后再使用批改功能' }, { status: 401 });
  }

  if (!checkRateLimit('correct-batch', getClientIp(request), 5, 60_000)) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: '未配置 API Key' }, { status: 503 });
  }

  let body: { questions?: string[]; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: '未提供题目' }, { status: 400 });
  }

  if (body.questions.length > 10) {
    return NextResponse.json({ error: '单次最多批改 10 题，请分批提交' }, { status: 400 });
  }

  const model = body.model || DEFAULT_MODEL;

  const cleanQuestions = body.questions
    .map(q => q.trim())
    .filter(q => q.length > 0);

  if (cleanQuestions.length === 0) {
    return NextResponse.json({ error: '题目内容为空' }, { status: 400 });
  }

  try {
    const results = cleanQuestions.length <= 3
      ? await gradeParallel(cleanQuestions, model)
      : await gradeSerial(cleanQuestions, model);

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch {
    return NextResponse.json({ error: '批改服务暂时不可用，请稍后再试' }, { status: 502 });
  }
}
