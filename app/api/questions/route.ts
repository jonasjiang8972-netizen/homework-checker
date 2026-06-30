import { getSupabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import type { GradingResult } from '../../../lib/grading';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ data: [], warning: '未配置数据库，仅展示本地数据' });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再查看题目记录' }, { status: 401 });
  }

  if (!checkRateLimit('questions', getClientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const filterKp = searchParams.get('filter_kp');
  const filterError = searchParams.get('filter_error');

  let query = supabase.from('questions').select('*').eq('user_id', userId);
  if (filterKp) {
    query = query.eq('knowledge_point', filterKp);
  }
  if (filterError) {
    query = query.eq('error_type', filterError);
  }

  query = query.order(sortBy, { ascending: order === 'asc' });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库，无法保存' }, { status: 503 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再保存题目' }, { status: 401 });
  }

  if (!checkRateLimit('questions', getClientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  let body: { question?: string; errorAnalysis?: string; subject?: string; imageUrl?: string; grading?: GradingResult };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const grading = body.grading;

  const { data, error } = await supabase
    .from('questions')
    .insert({
      user_id: userId,
      question: body.question || '',
      error_analysis: body.errorAnalysis || '',
      subject: body.subject || '数学',
      image_url: body.imageUrl || '',
      is_correct: grading?.is_correct ? 1 : 0,
      knowledge_point: grading?.knowledge_point || '',
      error_type: grading?.error_type || '',
      mastery_delta: 0,
      grading_data: JSON.stringify(grading || {}),
    })
    .select();

  if (error) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
  return NextResponse.json({ data: data?.[0] });
}
