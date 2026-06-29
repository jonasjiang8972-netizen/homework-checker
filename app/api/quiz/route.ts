import { getSupabase } from '../../../lib/supabase';
import { calculateNewMastery } from '../../../lib/mastery';
import { getApiKey, getUserId } from '../../../lib/auth-utils';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const QUIZ_GEN_PROMPT = [
  '你是一位小学数学教师。请根据给定的知识点出 3 道适合小学生的练习题。',
  '返回 JSON 格式：',
  '{',
  '  "questions": [',
  '    {"question": "题目内容", "answer": "正确答案（数字或文字）", "hint": "解题提示"}',
  '  ]',
  '}',
  '题目难度适中，题型可包括计算题、应用题。每题独立可作答。',
  '只返回 JSON，不要输出 JSON 以外的任何文字。',
].join('\n');

const QUIZ_GRADE_PROMPT = [
  '你是一位小学数学教师。请批改以下测验答案。',
  '我会提供题目、正确答案和学生作答，请判断每题对错。',
  '返回 JSON 格式：',
  '{',
  '  "results": [',
  '    {"index": 0, "correct": true/false, "feedback": "简要点评"}',
  '  ],',
  '  "score": 总分（正确题数）,',
  '  "total": 总题数,',
  '  "summary": "整体评价"',
  '}',
  '只返回 JSON，不要输出 JSON 以外的任何文字。',
].join('\n');

interface QuizQuestion {
  question: string;
  answer: string;
  hint: string;
}

interface QuizResult {
  index: number;
  correct: boolean;
  feedback: string;
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
      })) : [],
      score: Number(obj.score ?? 0),
      total: Number(obj.total ?? 0),
      summary: String(obj.summary ?? ''),
    };
  } catch {
    return null;
  }
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
  let query = supabase.from('test_records').select('*');
  if (userId) {
    query = query.eq('user_id', userId);
  }
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '获取测验记录失败' }, { status: 500 });
  }
  return NextResponse.json({ records: data || [] });
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

  return handleGenerate(supabase, apiKey, body, userId);
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

  const anthropic = new Anthropic({ apiKey, timeout: 60000 });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: QUIZ_GEN_PROMPT },
          { type: 'text', text: `知识点：${knowledgePoint}` },
        ],
      }],
    });

    const textBlock = response.content.find(c => c.type === 'text');
    const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
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
        questions_json: questions,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: '保存测验失败' }, { status: 500 });
    }

    return NextResponse.json({ record: data?.[0] });
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
  const recordId = body.id;
  const answers: string[] = body.answers;

  if (!recordId || !Array.isArray(answers)) {
    return NextResponse.json({ error: '缺少 id 或 answers' }, { status: 400 });
  }

  const { data: record } = await supabase
    .from('test_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (!record) {
    return NextResponse.json({ error: '测验记录不存在' }, { status: 404 });
  }

  const questions: QuizQuestion[] = record.questions_json || [];
  if (questions.length === 0) {
    return NextResponse.json({ error: '该测验没有题目' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey, timeout: 60000 });

  const gradingPrompt = questions.map((q, i) =>
    `第${i + 1}题：${q.question}\n正确答案：${q.answer}\n学生作答：${answers[i] || '（未作答）'}`
  ).join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: QUIZ_GRADE_PROMPT },
          { type: 'text', text: gradingPrompt },
        ],
      }],
    });

    const textBlock = response.content.find(c => c.type === 'text');
    const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
    const grade = parseQuizGrade(raw);

    if (!grade) {
      return NextResponse.json({ error: 'AI 批改失败，请重试' }, { status: 502 });
    }

    const passed = grade.score / grade.total >= 0.7;

    await supabase
      .from('test_records')
      .update({
        answers_json: answers,
        score: grade.score,
        total: grade.total,
        passed,
      })
      .eq('id', recordId);

    const userId = await getUserId();
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