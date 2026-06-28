# 部署与运维文档

> 项目：错题批改助手
> 面向：部署者（项目所有者）
> 目标环境：本地开发 + Vercel 生产 + Supabase 云数据

---

## 1. 环境前置

| 依赖 | 版本 | 安装 |
|------|------|------|
| Node.js | v20+ | 已通过 nvm 安装 |
| npm | v10+ | 随 Node |
| 账号 | Anthropic / Supabase / Google Cloud / Vercel | 自行注册 |

Node 已用 nvm 装好；新终端需先：
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
```
（已默认写入 ~/.zshrc，新开终端自动加载）

---

## 2. 安装依赖
```bash
cd ~/homework-checker
npm install
npm run dev   # 本地 http://localhost:3000
```

---

## 3. 环境变量（.env.local）

根目录已有模板，需填入真实值：

```
ANTHROPIC_API_KEY=             # Claude API密钥
NEXT_PUBLIC_SUPABASE_URL=      # Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase匿名密钥（前端可见）
SUPABASE_SERVICE_ROLE_KEY=     # Supabase服务密钥（仅服务端）
GOOGLE_CLIENT_ID=              # Google OAuth客户端ID
GOOGLE_CLIENT_SECRET=          # Google OAuth密钥
```

> 命名约定：`NEXT_PUBLIC_` 前缀变量会暴露到浏览器，仅放可公开值；服务端密钥（Anthropic、Service Role、OAuth Secret）不加此前缀。

### 3.1 获取各密钥

**Anthropic Claude Key**
1. 访问 https://console.anthropic.com
2. API Keys → Create Key
3. 填入 ANTHROPIC_API_KEY

**Supabase（三值）**
1. https://supabase.com 新建项目
2. Project Settings → API：
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` → SUPABASE_SERVICE_ROLE_KEY（注意保密）

**Google OAuth**
1. https://console.cloud.google.com 新建项目
2. APIs & Services → Credentials → Create OAuth client ID（Web）
3. 授权回调地址填：
   - 本地：`http://localhost:3000/api/auth/callback/google`
   - 生产：`https://<你的域名>/api/auth/callback/google`
4. 复制 Client ID / Secret 到环境变量

> NextAuth 默认要求 `NEXTAUTH_URL` 与 `NEXTAUTH_SECRET`，生产部署时 Vercel 需补上（见 §6）。

---

## 4. 数据库建表

在 Supabase Dashboard → SQL Editor 执行：

```sql
-- 错题表
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  question text,
  error_analysis text,
  subject text default '未分类',
  image_url text default '',
  created_at timestamptz default now()
);

-- 按 ID 查询优化
create index if not exists idx_questions_created_at
  on questions (created_at desc);

-- 行级安全（RLS）：登录用户只能管自己的数据（可选，配合 NextAuth user.id）
-- alter table questions enable row level security;
```

> NextAuth 的 `@auth/supabase-adapter` 首次登录会自动建 `users/accounts/sessions/verification_tokens` 表（Supabase 需开启对应 schema，参考 adapter 文档）。

### RLS 策略示例（启用 RLS 后）
```sql
create policy "用户读写自己的错题"
on questions for all
using (auth.uid() = user_id)        -- 需在表上加 user_id uuid 列
with check (auth.uid() = user_id);
```

---

## 5. 部署到 Vercel

1. 代码推到 GitLab（或 GitHub，Vercel 均支持）：
   ```bash
   git init
   git remote add origin <你的仓库地址>
   git add . && git commit -m "init homework-checker"
   git push -u origin main
   ```
2. https://vercel.com → Import Project → 选仓库
3. Framework Preset：Next.js（自动识别）
4. Environment Variables：逐条填入 §3 中所有变量，再加：
   - `NEXTAUTH_URL` = `https://<你的域名>`
   - `NEXTAUTH_SECRET` = 随机串（生成：`openssl rand -base64 32`）
5. Deploy → 几分钟后拿到生产域名
6. 回 Google Console 把生产回调地址补进授权回调白名单

> Vercel 自动检测 `package.json` 的 `build` 脚本，无需额外配置；`vercel.json` 已存在但当前为空配置。

---

## 6. 运维与监控

| 事项 | 现状 | 建议 |
|------|------|------|
| 错误监控 | console 日志 | 接 Sentry |
| 速率限制 | 无 | correct 路由加简单限流防止滥用 |
| 日志 | Next 默认 | Vercel 仪表盘可查函数日志 |
| 备份 | Supabase 自动 | 重要数据定期导出 |
| 密钥轮换 | 手动 | Anthropic/Google 密钥定期更换 |

---

## 7. 部署检查清单

上线前逐项确认：
- [ ] `.env.local` / Vercel 环境变量全部填写真实值
- [ ] Supabase `questions` 表已建
- [ ] Google OAuth 回调地址含生产域名
- [ ] `NEXTAUTH_URL` / `NEXTAUTH_SECRET` 已设
- [ ] 零配置降级测试：清空变量后 `npm run dev` 不崩溃
- [ ] 真实流程测试：拍一道题 → 批改 → 存档 → 错题本可见
- [ ] 手机浏览器访问生产域名验证移动适配

---

## 8. 故障排查

| 症状 | 排查方向 |
|------|----------|
| 批改 503 未配置 | 检查 ANTHROPIC_API_KEY 是否为占位符 |
| 批改 502 超时 | 网络/Anthropic 服务波动，重试 |
| 错题本空且无 warning | 检查 Supabase URL/Key 与表名 |
| Google 登录回调错 | 回调地址与 OAuth 配置是否一致 |
| 部署后图片不显示 | Storage 未接（当前 image_url 暂未存储原图） |
| 本地能跑线上不行 | 环境变量未在 Vercel 配置 |
