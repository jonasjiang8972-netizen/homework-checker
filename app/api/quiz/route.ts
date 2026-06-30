import { getSupabase } from '../../../lib/supabase';
import { calculateNewMastery } from '../../../lib/mastery';
import { getApiKey, getApiBaseUrl, getUserId } from '../../../lib/auth-utils';
import { queryOne } from '../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

const SUBJECT_PROMPTS: Record<string, { teacher: string; types: string }> = {
  '数学': { teacher: '小学数学', types: '题型可包括计算题、应用题' },
  '语文': { teacher: '小学语文', types: '题型可包括填空、阅读理解、造句' },
  '英语': { teacher: '小学英语', types: '题型可包括词汇、句型、语法' },
};

function buildGenPrompt(subject: string): string {
  const cfg = SUBJECT_PROMPTS[subject] || { teacher: '小学', types: '' };
  return [
    `你是一位${cfg.teacher}教师。请根据知识点出 3 道练习题。${cfg.types}`,
    '返回 JSON 格式：',
    '{"questions": [{"question": "题目内容", "answer": "正确答案", "hint": "解题提示"}]}',
    '题目难度适中，每题独立可作答。只返回 JSON，不要输出其他文字。',
  ].join('\n');
}

function buildGradePrompt(subject: string): string {
  return [
    `你是一位${SUBJECT_PROMPTS[subject]?.teacher || '小学'}教师。请批改以下测验答案。`,
    '我会提供题目、正确答案和学生作答，请判断每题对错。',
    '返回 JSON 格式：',
    JSON.stringify({
      results: [
        {
          index: 0,
          correct: true,
          feedback: '简要点评',
          knowledge_point: '涉及的知识点',
          error_analysis: '错因分析（仅错题）',
          guidance: '引导提示（仅错题，不要直接给答案）',
          correct_solution: '正确答案或解法（仅错题）',
        },
      ],
      score: 0,
      total: 0,
      summary: '整体评价',
    }, null, 2),
    '只返回 JSON，不要输出其他文字。',
  ].join('\n');
}

interface QuizQuestion {
  question: string;
  answer: string;
  hint: string;
}

interface QuizResult {
  index: number;
  correct: boolean;
  feedback: string;
  knowledge_point?: string;
  error_analysis?: string;
  guidance?: string;
  correct_solution?: string;
}

interface QuizGrade {
  results: QuizResult[];
  score: number;
  total: number;
  summary: string;
}

function parseQuizGen(raw: string): QuizQuestion[] | null {
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) cleaned = fence[1].trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  try {
    const obj = JSON.parse(cleaned);
    if (Array.isArray(obj.questions)) {
      return obj.questions.map((q: any) => ({
        question: String(q.question ?? ''),
        answer: String(q.answer ?? ''),
        hint: String(q.hint ?? ''),
      }));
    }
    return null;
  } catch {
    return null;
  }
}

function parseQuizGrade(raw: string): QuizGrade | null {
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) cleaned = fence[1].trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  try {
    const obj = JSON.parse(cleaned);
    return {
      results: Array.isArray(obj.results) ? obj.results.map((r: any) => ({
        index: Number(r.index ?? 0),
        correct: !!r.correct,
        feedback: String(r.feedback ?? ''),
        knowledge_point: r.knowledge_point ? String(r.knowledge_point) : undefined,
        error_analysis: r.error_analysis ? String(r.error_analysis) : undefined,
        guidance: r.guidance ? String(r.guidance) : undefined,
        correct_solution: r.correct_solution ? String(r.correct_solution) : undefined,
      })) : [],
      score: Number(obj.score ?? 0),
      total: Number(obj.total ?? 0),
      summary: String(obj.summary ?? ''),
    };
  } catch {
    return null;
  }
}

function parseQuestionsJson(raw: any): QuizQuestion[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  }
  return [];
}

function parseAnswersJson(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); } catch {}
  }
  return [];
}

async function upsertKnowledgePoint(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  name: string,
  isCorrect: boolean,
  userId: string | null,
) {
  let query = supabase.from('knowledge_points').select('*').eq('name', name);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data: existing } = await query.single();

  const prevMastery = existing?.mastery_level ?? 50;
  const prevTotal = existing?.total_count ?? 0;
  const prevCorrect = existing?.correct_count ?? 0;

  const newMastery = calculateNewMastery(prevMastery, isCorrect, prevTotal);
  const newTotal = prevTotal + 1;
  const newCorrect = prevCorrect + (isCorrect ? 1 : 0);

  if (existing) {
    await supabase
      .from('knowledge_points')
      .update({
        mastery_level: newMastery,
        total_count: newTotal,
        correct_count: newCorrect,
        last_practiced_at: new Date().toISOString(),
      })
      .eq('name', name);
  } else {
    await supabase
      .from('knowledge_points')
      .insert({
        name,
        mastery_level: newMastery,
        total_count: newTotal,
        correct_count: newCorrect,
        last_practiced_at: new Date().toISOString(),
        user_id: userId,
      });
  }
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ records: [], warning: '未配置数据库' });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再查看测验记录' }, { status: 401 });
  }

  let query = supabase.from('test_records').select('*').eq('user_id', userId);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '获取测验记录失败' }, { status: 500 });
  }
  const records = (data || []).map((r: any) => ({
    ...r,
    questions_json: parseQuestionsJson(r.questions_json),
    answers_json: parseAnswersJson(r.answers_json),
  }));
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: '未配置 Claude API Key，请在设置页添加或配置环境变量' }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库' }, { status: 503 });
  }

  const userId = await getUserId();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (body.action === 'submit') {
    return handleSubmit(supabase, apiKey, body);
  }

  if (body.action === 'correct') {
    return handleCorrect(supabase, apiKey, body);
  }

  return handleGenerate(supabase, apiKey, body, userId);
}

const DEFAULT_QUIZ_MODEL = 'Qwen/Qwen3-32B';

async function fetchAI(prompt: string, apiKey: string, model?: string): Promise<string> {
  const baseURL = (await getApiBaseUrl()) || process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_QUIZ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
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

async function getUserSubject(): Promise<string> {
  const userId = await getUserId();
  if (!userId) return '数学';
  const row = queryOne('SELECT default_subject FROM user_settings WHERE user_id = ?', [userId]);
  return (row?.default_subject as string) || '数学';
}

async function handleGenerate(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  apiKey: string,
  body: any,
  userId: string | null,
) {
  const knowledgePoint = body.knowledge_point?.trim();
  if (!knowledgePoint) {
    return NextResponse.json({ error: '请指定知识点' }, { status: 400 });
  }

  const subject = body.subject || await getUserSubject();
  const model = body.model || DEFAULT_QUIZ_MODEL;

  try {
    const raw = await fetchAI(
      `${buildGenPrompt(subject)}\n知识点：${knowledgePoint}`,
      apiKey,
      model,
    );
    const questions = parseQuizGen(raw);

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'AI 未能生成有效题目，请重试' }, { status: 502 });
    }

    const { data, error } = await supabase
      .from('test_records')
      .insert({
        user_id: userId,
        plan_id: body.plan_id || null,
        knowledge_point: knowledgePoint,
        subject,
        questions_json: JSON.stringify(questions),
      })
      .select();

    if (error) {
      return NextResponse.json({ error: '保存测验失败' }, { status: 500 });
    }

    const record = data?.[0];
    if (record) {
      record.questions_json = parseQuestionsJson(record.questions_json);
    }

    return NextResponse.json({ record });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out');
    return NextResponse.json(
      { error: isTimeout ? '生成题目超时，请重试' : 'AI 服务暂时不可用' },
      { status: 502 }
    );
  }
}

async function handleSubmit(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  apiKey: string,
  body: any,
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再提交测验' }, { status: 401 });
  }

  const recordId = body.id;
  const answers: string[] = body.answers;
  const model = body.model || DEFAULT_QUIZ_MODEL;

  if (!recordId || !Array.isArray(answers)) {
    return NextResponse.json({ error: '缺少 id 或 answers' }, { status: 400 });
  }

  const { data: record } = await supabase
    .from('test_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (record && record.user_id && record.user_id !== userId) {
    return NextResponse.json({ error: '无权操作该测验记录' }, { status: 403 });
  }

  if (!record) {
    return NextResponse.json({ error: '测验记录不存在' }, { status: 404 });
  }

  const questions = parseQuestionsJson(record.questions_json);
  if (questions.length === 0) {
    return NextResponse.json({ error: '该测验没有题目' }, { status: 400 });
  }

  const subject = record.subject || '数学';

  const gradingPrompt = questions.map((q, i) =>
    `第${i + 1}题：${q.question}\n正确答案：${q.answer}\n学生作答：${answers[i] || '（未作答）'}`
  ).join('\n\n');

  try {
    const raw = await fetchAI(
      `${buildGradePrompt(subject)}\n\n${gradingPrompt}`,
      apiKey,
      model,
    );
    const grade = parseQuizGrade(raw);

    if (!grade) {
      return NextResponse.json({ error: 'AI 批改失败，请重试' }, { status: 502 });
    }

    const passed = grade.score / grade.total >= 0.7;

    await supabase
      .from('test_records')
      .update({
        answers_json: JSON.stringify(answers),
        score: grade.score,
        total: grade.total,
        passed,
      })
      .eq('id', recordId);

    const kp = record.knowledge_point;
    if (kp) {
      for (const r of grade.results) {
        await upsertKnowledgePoint(supabase, kp, r.correct, userId);
      }
    }

    return NextResponse.json({ grade, passed, recordId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out');
    return NextResponse.json(
      { error: isTimeout ? '批改超时，请重试' : 'AI 服务暂时不可用' },
      { status: 502 }
    );
  }
}

async function handleCorrect(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  apiKey: string,
  body: any,
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const recordId = body.id;
  const corrections: { index: number; correct: boolean }[] = body.corrections;
  if (!recordId || !Array.isArray(corrections)) {
    return NextResponse.json({ error: '缺少 id 或 corrections' }, { status: 400 });
  }

  const { data: record } = await supabase
    .from('test_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (!record) {
    return NextResponse.json({ error: '测验记录不存在' }, { status: 404 });
  }

  const total = record.total || corrections.length;
  const score = corrections.filter((c: any) => c.correct).length;
  const passed = score / total >= 0.7;

  await supabase
    .from('test_records')
    .update({ score, passed })
    .eq('id', recordId);

  const kp = record.knowledge_point;
  if (kp) {
    for (const c of corrections) {
      await upsertKnowledgePoint(supabase, kp, c.correct, userId);
    }
  }

  return NextResponse.json({ ok: true, score, total, passed });
}