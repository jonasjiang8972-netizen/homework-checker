import { getSupabase } from '../../../lib/supabase';
import { aggregateStats } from '../../../lib/mastery';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ stats: [], warning: '未配置数据库' });
  }

  const { data, error } = await supabase
    .from('questions')
    .select('knowledge_point, is_correct');

  if (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }

  const stats = aggregateStats(data || []);
  const weakPoints = stats.filter(s => s.weak).map(s => s.name);

  return NextResponse.json({ stats, weakPoints });
}