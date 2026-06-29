import { getSupabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/auth-utils';
import { NextRequest, NextResponse } from 'next/server';
import type { GradingResult } from '../../../lib/grading';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ data: [], warning: '未配置数据库，仅展示本地数据' });
  }

  const userId = await getUserId();
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const filterKp = searchParams.get('filter_kp');
  const filterError = searchParams.get('filter_error');
  const filterSubject = searchParams.get('filter_subject');

  let query = supabase.from('questions').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (filterKp) {
    query = query.eq('knowledge_point', filterKp);
  }
  if (filterError === 'correct') {
    query = query.eq('is_correct', true);
  } else if (filterError === 'wrong') {
    query = query.eq('is_correct', false);
  }
  if (filterSubject) {
    query = query.eq('subject', filterSubject);
  }

  const sortColumn = ['created_at', 'knowledge_point', 'subject', 'error_type'].includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order === 'asc' ? true : false;

  const { data, error } = await query.order(sortColumn, { ascending: sortOrder });

  if (error) {
    return NextResponse.json({ error: '获取错题列表失败' }, { status: 500 });
  }
  return NextResponse.json({ data });
}

interface SaveBody {
  question?: string;
  errorAnalysis?: string;
  subject?: string;
  imageUrl?: string;
  grading?: GradingResult;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库，无法保存错题' }, { status: 503 });
  }

  const userId = await getUserId();

  let body: SaveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const g = body.grading;
  const questionText = (body.question || (g ? `${g.knowledge_point || '题目'}` : '')).trim();
  if (!questionText) {
    return NextResponse.json({ error: '题目内容不能为空' }, { status: 400 });
  }

  const row = {
    question: questionText,
    error_analysis: body.errorAnalysis || g?.analysis || '',
    subject: body.subject || '未分类',
    image_url: body.imageUrl || '',
    is_correct: g ? g.is_correct : null,
    knowledge_point: g?.knowledge_point || null,
    error_type: g?.error_type || null,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('questions')
    .insert([row])
    .select();

  if (error) {
    return NextResponse.json({ error: '保存失败，请稍后再试' }, { status: 500 });
  }
  return NextResponse.json({ data });
}
