import { getSupabase } from '../../../lib/supabase';
import { aggregateStats } from '../../../lib/mastery';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

async function getWeakPoints(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('questions')
    .select('knowledge_point, is_correct');
  const stats = aggregateStats(data || []);
  return stats.filter(s => s.weak).map(s => s.name);
}

const PLAN_PROMPT = [
  '你是一位小学数学教师。以下是学生尚未掌握的知识点列表。',
  '请为每个薄弱知识点制定一个分步骤的学习提升方案。',
  '返回 JSON 数组，每个元素格式：',
  '{"knowledge_point":"知识点名称","title":"学习计划标题","steps":["步骤1","步骤2","步骤3"],"summary":"简要说明该计划的目标"}',
  '步骤要具体、可操作、适合小学生理解。每步用中文描述，不超过 3-5 步。',
  '只返回 JSON 数组，不要输出 JSON 以外的任何文字。',
].join('\n');

function parsePlanJson(raw: string): Array<{
  knowledge_point: string;
  title: string;
  steps: string[];
  summary: string;
}> {
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) cleaned = fence[1].trim();
  const first = cleaned.indexOf('[');
  const last = cleaned.lastIndexOf(']');
  if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];
    return arr.map((item: any) => ({
      knowledge_point: String(item.knowledge_point ?? ''),
      title: String(item.title ?? ''),
      steps: Array.isArray(item.steps) ? item.steps.map(String) : [],
      summary: String(item.summary ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ plans: [], warning: '未配置数据库' });
  }

  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '获取计划列表失败' }, { status: 500 });
  }
  return NextResponse.json({ plans: data || [] });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    return NextResponse.json(
      { error: '未配置 Claude API Key，请输入 ANTHROPIC_API_KEY' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库，无法创建计划' }, { status: 503 });
  }

  const weakPoints = await getWeakPoints();
  if (weakPoints.length === 0) {
    return NextResponse.json({ error: '暂无薄弱知识点，多批改几道题再来生成计划' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey, timeout: 60000 });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PLAN_PROMPT },
          { type: 'text', text: `薄弱知识点列表：\n${weakPoints.map(p => `- ${p}`).join('\n')}` },
        ],
      }],
    });

    const textBlock = response.content.find(c => c.type === 'text');
    const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
    const parsed = parsePlanJson(raw);

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'AI 未能生成有效计划，请重试' }, { status: 502 });
    }

    const rows = parsed.map(p => ({
      user_id: null,
      title: p.title,
      target_knowledge_point: p.knowledge_point,
      current_mastery: 30,
      target_mastery: 80,
      status: 'pending',
      steps: p.steps,
      due_date: null,
    }));

    const { data, error } = await supabase
      .from('study_plans')
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: '保存计划失败' }, { status: 500 });
    }
    return NextResponse.json({ plans: data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out');
    return NextResponse.json(
      { error: isTimeout ? '生成计划超时，请重试' : 'AI 服务暂时不可用' },
      { status: 502 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库' }, { status: 503 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: '缺少 id 或 status' }, { status: 400 });
  }

  const validStatuses = ['pending', 'studying', 'done', 'overdue'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `状态必须为 ${validStatuses.join('/')}` }, { status: 400 });
  }

  const { error } = await supabase
    .from('study_plans')
    .update({ status: body.status })
    .eq('id', body.id);

  if (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}