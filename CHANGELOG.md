# Changelog

所有重要更改都将记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [2.8.5] - 2026-06-30

### 模型选择修复与 API 地址自定义

- **模型列表获取改用用户独立 Key**：`/api/models` 路由从 `process.env.ANTHROPIC_API_KEY` 改为使用当前登录用户保存在数据库中的 API Key，不再依赖已废弃的共享环境变量
- **API 接口地址自定义**：设置页新增"API 接口地址"输入框，用户可配置自己的 API 代理地址（如 `https://api.siliconflow.cn/v1`），默认使用 `ANTHROPIC_BASE_URL` 环境变量
- **`user_settings` 表新增 `base_url` 列**：支持为不同用户配置不同 API 地址，自动兼容已有数据库（ALTER TABLE 迁移）
- **`POST /api/user/key` 支持 `baseUrl` 字段**：保存 API Key 时可同时提交接口地址，一键配置
- **`GET /api/user/key` 返回 `baseUrl`**：设置页加载时自动回显已保存的接口地址

### 配套更新

- `lib/db.ts` — 新增 `base_url` 列定义及 ALTER TABLE 迁移
- `app/api/user/key/route.ts` — POST/GET 增加 base_url 读写，GET 增加 `await getDb()`
- `app/api/models/route.ts` — 改用用户认证 + 数据库中的 API Key 和 base_url
- `app/settings/page.tsx` — 新增 API 接口地址输入框

## [2.8.4] - 2026-06-30

### 紧急修复

- **生产环境 API Key 保存失败修复**：`app/api/user/key/route.ts` POST 处理器调用了未 import 的 `getSupabaseAdmin()`，导致运行时 `ReferenceError`，仅在 Production 构建中由于 Tree Shaking 差异才暴露；同时该检查守卫了本不依赖 Supabase 的本地 SQLite 写入流程
- **移除死代码**：删除未被使用的 `getAuth()` 函数和 `generateId` import
- **增强错误提示**：POST 处理器增加 try-catch 返回具体错误信息；客户端 `handleSaveKey` 改进错误解析，网络/HTTP 错误直接展示状态码和原因
- **环境变量补全**：`.env.local` 与 `.env.example` 对齐，新增 `API_KEY_ENCRYPTION_SECRET`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、SMTP 等必须变量

### 完整变更记录

- `app/api/user/key/route.ts` — 移除 `getSupabaseAdmin()` 调用（未 import 且系死代码守卫）
- `app/api/user/key/route.ts` — 移除 `getAuth()` 函数和 `generateId` import
- `app/api/user/key/route.ts` — POST 增加外层 try-catch 返回 `服务器错误: {错误详情}`
- `app/settings/page.tsx` — `handleSaveKey` 增加 HTTP 状态码显示和非 JSON 响应兜底
- `.env.local` — 补全 `API_KEY_ENCRYPTION_SECRET`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、SMTP 变量
- `package.json` — v2.8.1 → v2.8.4

## [2.8.1] - 2026-06-30

### 紧急修复

- **API Key 保存失败修复**：`app/api/user/key/route.ts` 和 `app/api/user/settings/route.ts` 中的 upsert 操作改用直接 SQL（`execute`/`queryOne`）替代 QueryBuilder，因为 `user_settings` 表使用 `user_id` 而非 `id` 作为主键，导致 `QueryBuilder.upsert()` 生成的 `INSERT INTO "user_settings" ("id", ...)` 语句执行失败
- **服务端数据库修复**：执行 `ALTER TABLE user_settings ADD COLUMN mode` 补充 v2.8 新增字段；清除因 upsert 失败写入的 1 行脏数据
- **代码审计**：确认其他路由（questions/quiz/plans/stats）均使用标准 `id` 主键，不受此问题影响

## [2.8.0] - 2026-06-30

### 两段式批改（先引导、再给答案）

- **`GradingResult` 新增 `guidance` 字段**：`lib/grading.ts` 接口、prompt、解析器同步更新，AI 返回引导提示而非直接给答案
- **首页交互改造**：`app/page.tsx` 结果区默认展示引导提示和知识点，隐藏完整答案和错因分析；增加"还是不太懂，给我看看答案"按钮
- **向后兼容**：旧模型返回的 JSON 无 `guidance` 字段时自动降级为直接展示全量
- **Prompt 升级**：示例从"两位数进位加法"改为"一元一次方程"，面向初中生

### 隐私模式

- **`user_settings` 表新增 `mode` 列**：`'student'`（默认）或 `'parent'`
- **设置页模式切换**：`app/settings/page.tsx` 新增学生/家长模式切换按钮
- **成长日记双视图**：`app/history/page.tsx` 学生模式仅展示汇总趋势（做题数/正确率/薄弱知识点），隐藏单题详情/展开/重做；家长模式保留全部功能

### 安全清理

- **`README.md`**：移除"腾讯云部署"章节（含服务器 IP 和 docx 链接）
- **`gen_deploy_v271.py`**：所有 IP 替换为 `<your-server-ip>` / `<your-domain>` 占位符
- **`public/`**：删除含服务器信息的 5 个 docx 文件

### 配套更新

- **测试更新**：`__tests__/grading.test.ts` 新增 `guidance` 字段测试用例，全量 68 个测试用例通过
- **版本号**：`package.json` → `2.8.0`
- **文档**：新增 `docs/v2.8-ROADMAP.md`，更新 `README.md`

### API Key 安全隔离

- **移除共享 API Key 环境变量**：`lib/auth-utils.ts` 中 `getApiKey()` 不再读取 `process.env.ANTHROPIC_API_KEY`，强制每个用户在设置页自行配置独立 Key
- **数据迁移**：原共享 Key 已加密写入 `jonasjiang8972@gmail.com` 的 `user_settings.anthropic_key_encrypted`，该用户不受影响
- 未配置 Key 的用户调用批改/计划/测验功能时将提示"请在设置页添加 API Key"

### 安全加固

- 每个用户使用独立的 SiliconFlow API Key，用量和计费完全隔离
- 无共享 Key 泄露风险，按用户级别可审计

## [2.7.1] - 2026-06-30

### 依赖升级

- **移除废弃包**：`@auth/supabase-adapter`、`@supabase/supabase-js`（项目已使用 SQLite，Supabase 适配器不再需要）
- **nodemailer**：`^7.0.13` → `^9.0.1`，修复 6 个高/中危 CVE（SMTP 注入、CRLF 注入、SSRF 等）
- **npm audit 结果**：漏洞数量从 **8 个降至 4 个**（均为 next 传递依赖的 moderate 级，fix 需 breaking change 不可行）

### 代码清理

- `app/api/auth/[...nextauth]/route.ts`：移除 `SupabaseAdapter` 导入和 `getAdapter()` 函数，NextAuth 配置简化

## [2.7.0] - 2026-06-30

### 安全加固（Security Hardening）

#### 🔴 高危修复

- **上传图片认证保护**：图片不再存储在 `public/uploads/` 静态目录，改为存入 `data/uploads/` 并通过 `GET /api/uploads/[file]` 接口鉴权后返回（`lib/supabase.ts`、`app/api/correct/route.ts`、新增 `app/api/uploads/[file]/route.ts`）
- **加密密钥硬编码回退移除**：`lib/encryption.ts` 中 `getMasterKey()` 不再使用 `NEXTAUTH_SECRET` 或公开字符串 fallback，改为强制要求 `API_KEY_ENCRYPTION_SECRET` 环境变量

#### 🟡 中危修复

- **验证码接口限流**：`POST /api/auth/send-code` 新增 IP 维度（5次/60秒）+ 邮箱维度（3次/300秒）双限流
- **JWT Session 过期**：NextAuth 配置增加 `maxAge: 24 * 60 * 60`（24小时自动过期）
- **数据库文件保护**：`data/` 和 `coverage/` 加入 `.gitignore`

#### 🟢 其余改进

- `.env.example` 更新为当前实际所需变量（移除 Supabase/Resend 引用，新增 `API_KEY_ENCRYPTION_SECRET`）

### 基础设施

- **邮件服务更换**：Resend API → Gmail SMTP（`lib/email.ts` 使用 nodemailer），支持发送到任意邮箱，无域名/注册邮箱限制
- **Docker 优化**：`docker-compose.yml` 移除 `./uploads` 独立 volume，统一使用 `./data` volume；Dockerfile 修复 nodemailer 生产镜像缺失问题

### 测试体系

- 新增 **5 个测试文件、66 个测试用例**，覆盖：
  - `lib/grading.ts`（15 用例）：parseGrading 边界条件、gradingToText 格式化
  - `lib/encryption.ts`（12 用例）：加解密回环、IV 随机性、篡改容错、maskApiKey
  - `lib/retry.ts`（10 用例）：重试策略、超时/5xx/连接拒绝、onRetry 回调
  - `lib/auth-store.ts`（7 用例）：验证码存储/过期/清理
  - `api-auth-guard.test.ts`（11 用例）：全部 API 路由 401 拦截验证
- 修复 `lib/retry.ts` bug：`ECONNREFUSED` 大小写不匹配导致连接拒绝错误不会重试

## [2.6.2] - 2026-06-30

### 安全修复

- **未授权访问漏洞修复**：`GET /api/plans`、`PATCH /api/plans`、`GET /api/questions`、`GET /api/stats`、`GET /api/quiz`、`POST /api/quiz(submit)` 在未登录状态下返回 401
- **所有权校验**：`handleSubmit` 增加 `record.user_id` 与当前用户比对（403）

## [2.6.0] - 2026-06-29

...（略，详见 v2.6.0 版本）
