import { getSupabase } from '../../../lib/supabase';
import { aggregateStats } from '../../../lib/mastery';
import { getUserId } from '../../../lib/auth-utils';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ stats: [], warning: '未配置数据库' });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再查看学习统计' }, { status: 401 });
  }

  if (!checkRateLimit('stats', getClientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');

  let query = supabase.from('questions').select('knowledge_point, is_correct, subject').eq('user_id', userId);
  if (subject && subject !== '全部') {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }

  const stats = aggregateStats(data || []);
  return NextResponse.json({ stats });
}
