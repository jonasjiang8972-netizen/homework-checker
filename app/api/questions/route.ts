import { getSupabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, execute, generateId } from '../../../lib/db';
import { calculateNewMastery } from '../../../lib/mastery';
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
  const filterErrorType = searchParams.get('filter_error_type');

  let query = supabase.from('questions').select('id, question, error_analysis, subject, image_url, is_correct, knowledge_point, error_type, created_at, user_id').eq('user_id', userId);
  if (filterKp) {
    query = query.eq('knowledge_point', filterKp);
  }
  if (filterError) {
    if (filterError === 'correct') query = query.eq('is_correct', 1);
    else if (filterError === 'wrong') query = query.eq('is_correct', 0);
  }
  if (filterErrorType && filterErrorType !== 'all') {
    query = query.eq('error_type', filterErrorType);
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

  if (grading?.knowledge_point) {
    try {
      await getDb();
      const existing = queryOne(
        'SELECT id, mastery_level, total_count, correct_count FROM knowledge_points WHERE name = ? AND user_id = ?',
        [grading.knowledge_point, userId]
      );
      const prevMastery = existing?.mastery_level ?? 50;
      const prevTotal = existing?.total_count ?? 0;
      const prevCorrect = existing?.correct_count ?? 0;
      const newMastery = calculateNewMastery(prevMastery, grading.is_correct, prevTotal);
      if (existing) {
        execute(
          'UPDATE knowledge_points SET mastery_level = ?, total_count = ?, correct_count = ?, last_practiced_at = datetime(\'now\') WHERE id = ?',
          [newMastery, prevTotal + 1, prevCorrect + (grading.is_correct ? 1 : 0), existing.id]
        );
      } else {
        execute(
          'INSERT INTO knowledge_points (id, name, subject, mastery_level, total_count, correct_count, last_practiced_at, user_id) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'), ?)',
          [generateId(), grading.knowledge_point, body.subject || '数学', newMastery, prevTotal + 1, prevCorrect + (grading.is_correct ? 1 : 0), userId]
        );
      }
    } catch {}
  }

  return NextResponse.json({ data: data?.[0] });
}
