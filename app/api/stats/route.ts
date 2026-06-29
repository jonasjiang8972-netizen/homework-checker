import { getSupabase } from '../../../lib/supabase';
import { aggregateStats } from '../../../lib/mastery';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ stats: [], warning: '未配置数据库' });
  }

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');

  let query = supabase.from('questions').select('knowledge_point, is_correct, subject');

  if (subject && subject !== '全部') {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }

  const stats = aggregateStats(data || []);
  const weakPoints = stats.filter(s => s.weak).map(s => s.name);

  return NextResponse.json({ stats, weakPoints });
}