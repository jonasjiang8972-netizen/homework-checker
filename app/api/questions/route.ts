import { getSupabase } from '../../../lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ data: [], warning: '未配置数据库，仅展示本地数据' });
  }
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '获取错题列表失败' }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: '未配置数据库，无法保存错题' }, { status: 503 });
  }

  let body: { question?: string; errorAnalysis?: string; subject?: string; imageUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const question = (body.question || '').trim();
  if (!question) {
    return NextResponse.json({ error: '题目内容不能为空' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('questions')
    .insert([{
      question,
      error_analysis: body.errorAnalysis || '',
      subject: body.subject || '未分类',
      image_url: body.imageUrl || '',
    }])
    .select();

  if (error) {
    return NextResponse.json({ error: '保存失败，请稍后再试' }, { status: 500 });
  }
  return NextResponse.json({ data });
}