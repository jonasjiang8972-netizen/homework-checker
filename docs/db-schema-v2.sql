-- ============================================================
-- 错题批改助手 v2.0 数据库结构
-- 在 Supabase Dashboard → SQL Editor 执行
-- 向后兼容 v1.0：对 questions 表仅追加可空字段
-- ============================================================

-- 1. 知识点字典 + 掌握度统计表
create table if not exists knowledge_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,                      -- 知识点名称，如"两位数进位加法"
  subject text default '未分类',
  parent_id uuid references knowledge_points(id) on delete set null,  -- 父知识点
  mastery_level int default 50 check (mastery_level between 0 and 100),
  total_count int default 0,               -- 累计做题数
  correct_count int default 0,             -- 正确数
  last_practiced_at timestamptz,
  user_id uuid,                            -- 归属用户（配合 NextAuth）
  created_at timestamptz default now(),
  unique (name, user_id)
);
create index if not exists idx_kp_user on knowledge_points(user_id);
create index if not exists idx_kp_mastery on knowledge_points(mastery_level);

-- 2. 学习计划表
create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  target_knowledge_point text,             -- 针对的知识点
  current_mastery int default 50,
  target_mastery int default 80,
  status text default 'pending' check (status in ('pending','studying','done','overdue')),
  steps jsonb,                              -- AI 拆解的学习步骤数组
  created_at timestamptz default now(),
  due_date date
);
create index if not exists idx_plans_user on study_plans(user_id);

-- 3. 测验记录表
create table if not exists test_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  plan_id uuid references study_plans(id) on delete set null,
  knowledge_point text,
  questions_json jsonb,                    -- 测验题目（AI 生成）
  answers_json jsonb,                      -- 作答
  score int,
  total int,
  passed boolean,
  created_at timestamptz default now()
);
create index if not exists idx_tests_user on test_records(user_id);

-- 4. 向 v1 questions 表追加字段（向后兼容，老数据不受影响）
alter table questions add column if not exists is_correct boolean;
alter table questions add column if not exists knowledge_point text;
alter table questions add column if not exists error_type text;
alter table questions add column if not exists mastery_delta int default 0;
alter table questions add column if not exists user_id uuid;
create index if not exists idx_questions_kp on questions(knowledge_point);

-- ============================================================
-- 可选：行级安全（启用 RLS 后，登录用户只能管自己数据）
-- 需配合 questions/knowledge_points/study_plans/test_records 加 user_id
-- ============================================================
-- alter table knowledge_points enable row level security;
-- alter table study_plans enable row level security;
-- alter table test_records enable row level security;
-- create policy "own data read" on knowledge_points for select using (auth.uid() = user_id);
-- create policy "own data write" on knowledge_points for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 5. Storage 存储桶（Supabase Dashboard → Storage → New Bucket）
-- 名称: question-images
-- 公开访问: ON（勾选 public bucket）
-- 文件大小限制: 10MB
-- 允许 MIME: image/png, image/jpeg, image/gif, image/webp
-- ============================================================
