# Changelog

所有重要更改都将记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [2.13.0] - 2026-07-07

### 稳定性与可维护性优化（Stability & Maintainability）

#### 数据库
- **新增 `executeBatch`**：`lib/db.ts` 增加事务支持（`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`），多步写入原子化避免部分失败

#### 文件管理
- **新增 `lib/upload-cleanup.ts`**：定期清理 24 小时前的过期上传文件（1 小时周期），防止磁盘耗尽
- **新增 `lib/backup.ts`**：每日自动备份 SQLite 数据库到 `data/backups/`，保留 7 天

#### 健康检查
- **新增 `GET /api/health`**：返回服务状态、运行时长、DB 连通性（200/503）

#### API 优化
- **`/api/questions` 分页**：新增 `page` 和 `page_size` 参数，单次最多返回 100 条
- **`study_plans.steps` JSON 序列化**：写入数据库前强制 `JSON.stringify`，防止类型不一致

#### 死代码清理
- **删除 `lib/data-recycler.ts`**：未使用的浏览器 localStorage 工具类
- **删除 `lib/auth-store.ts`**：未使用的旧邮箱验证码 Map 存储（原路由有独立的 codeStore 实现）
- **删除 `__tests__/auth-store.test.ts`**：相应测试

#### Supabase 包增加
- **`QueryBuilder.limit()`**：`lib/supabase.ts` 增加 limit 方法支持，配合分页使用
- **测试 mock 更新**：测试 mock 增加 limit/range 方法

## [2.12.0] - 2026-07-07

### 安全修复 & 关键 Bug 修复（Security & Critical Bug Fixes）

#### XSS 漏洞修复
- **修复 `lib/markdown-renderer.tsx`**：AI 返回的 HTML 内容在渲染前增加 sanitize 处理，移除 `<script>` 标签、`on*` 事件处理器和 `javascript:` URI

#### 会话安全
- **修复 `app/api/auth/[...nextauth]/route.ts`**：Session Cookie `secure` 标志改为根据 `NODE_ENV` 动态设置，生产环境强制 HTTPS

#### SMTP 安全
- **修复 `lib/email.ts`**：TLS `rejectUnauthorized` 改为生产环境启用证书验证，防止 MITM 凭据窃取

#### 限流安全
- **修复 `lib/rate-limit.ts`**：`getClientIp()` 优先使用真实 socket IP，增加 IP 格式校验防止伪造绕过限流

#### 密码重置安全
- **修复 `app/api/auth/reset-password/route.ts`**：重置 Token 增加 15 分钟过期验证，过期自动清除令牌

#### 密钥校验
- **修复 `lib/encryption.ts`**：`API_KEY_ENCRYPTION_SECRET` 在模块加载时立即校验，未配置直接拒绝启动

#### OCR 识别修复
- **修复 `lib/ocr-client.ts`**: 中文字符检测正则 `/一-龥/g` → `/[鿿]/g`，修复 OCR 可靠性判断失效

#### 测试配置
- **修复 `vitest.config.ts`**：测试环境增加 `API_KEY_ENCRYPTION_SECRET` 等环境变量，避免启动校验阻断测试

## [2.11.0] - 2026-07-04

### 多题拍照批改（Multi-Question Photo Grading）

#### 智能题目切分
- **新增 `lib/question-splitter.ts`**：自动识别 OCR 文本中的多道题目，支持 `1.`、`1、`、`(1)`、`一、` 等多种题号格式，无法识别题号时按空行 + 长度启发式分割

#### 批量批改 API
- **新增 `POST /api/correct/batch`**：接收切分后的题目数组，≤3 题并行批改、>3 题串行排队，逐题调用现有文字批改 / 视觉批改逻辑

#### 题目选择 UI
- **新增 `components/QuestionSelector.tsx`**：OCR 切分后弹出题目列表预览，用户可勾选/取消要批改的题目，支持全选

#### 前端集成
- **`app/page.tsx` 流程扩展**：OCR 后先切题 → 单题直接批改 → 多题显示选择器 → 批量提交 → 逐题展示结果

## [2.10.0] - 2026-07-01

### 学习闭环修复 & 体验优化（Learning Loop Fixes & UX Improvements）

#### 掌握度实时更新
- **修复 P0**：批改后保存错题时自动更新 `knowledge_points` 表掌握度（`calculateNewMastery` 衰减算法）
- **影响范围**：`/api/questions` POST 接口，保存错题后热力图即时变化

#### 测验答案草稿恢复
- **新增 P0**：测验答题过程中答案自动保存至 `localStorage`，意外刷新可恢复
- **关键行为**：提交成功后自动清理草稿、开始新测验前清理草稿

#### API Key 首次配置引导
- **新增 P0**：设置页增加「📋 怎么获取 API Key？」分步指引卡，含 SiliconFlow 备选方案

#### 错题保存后推荐行动
- **新增 P1**：错题保存成功后显示"📝 做同类题巩固"和"🔄 重新做这道题"快捷跳转

#### 邮箱验证码倒计时
- **新增 P1**：发送验证码后启动 60s 倒计时，避免连续点击触发限流

#### 闯关挑战直达入口
- **新增 P1**：底部导航栏新增「闯关」入口（/label: 闯关），标签"路线"改为"计划"

#### 视觉预检过程反馈
- **新增 P2**：批改加载中根据阶段显示不同提示文字（确认图片→分析题目→深入思考）

#### 两段式批改答案可收起
- **新增 P2**：展开答案后显示"收起答案，我再想想 ↑"按钮，可反复查看

#### 错题分类筛选
- **新增 P2**：历史记录页增加错误类型筛选（计算失误/概念不清/审题错误/方法错误）

#### 文档与代码同步
- **修复 P2**：README 掌握度算法文档与实际代码实现（线性衰减）保持一致

## [2.9.1] - 2026-06-30

### 安全加固（Security Hardening）

#### Rate Limiting 全 API 覆盖
- **新增 `lib/rate-limit.ts`**：基于内存的通用限流器，支持 namespace + key 双维度，每分钟自动清理过期条目
- **所有 API 路由接入限流**：

| 路由 | 限流策略 |
|------|---------|
| `POST /api/auth/send-code` | IP: 5/60s + 邮箱: 3/300s |
| `POST /api/correct` | 10/60s（AI 批改，防止滥用） |
| `GET /api/models` | 30/60s |
| `POST /api/quiz` (出题/批改) | 15/60s |
| `GET /api/quiz` (历史) | 20/60s |
| `POST /api/plans` (生成计划) | 5/60s（AI 调用，频率最低） |
| `GET/PATCH /api/plans` | 20/60s |
| `GET/POST/DELETE /api/user/key` | 10/60s |
| `GET/PATCH /api/user/settings` | 20/60s |
| `GET/POST /api/questions` | 20/60s |
| `GET/DELETE /api/questions/[id]` | 20/60s |
| `GET /api/uploads/[file]` | 60/60s |
| `GET /api/stats` | 20/60s |

#### HTTP 安全响应头
- **`next.config.js` 新增安全头配置**：
  - `X-Content-Type-Options: nosniff` — 防止 MIME 类型嗅探
  - `X-Frame-Options: DENY` — 防止点击劫持
  - `Referrer-Policy: strict-origin-when-cross-origin` — 控制 referer 泄露
- **`poweredByHeader: false`** — 移除 `X-Powered-By: Next.js` 指纹信息

#### 配套更新
- **版本号**：`package.json` → `2.9.1`
- **文档**：更新 `CHANGELOG.md`
- **代码清理**：`app/api/auth/send-code/route.ts` 移除旧的本地限流实现，改用共享 `lib/rate-limit.ts`

## [2.9.0] - 2026-06-30

### 测验系统重构（Quiz v2）

#### JSON 序列化修复
- **修复测验提交无记录 Bug**：`questions_json` / `answers_json` 在通过 supabase mock → sql.js 存储时被 `.toString()` 转为 `"[object Object]"`，导致 `handleSubmit` 读取时字符串无 `.map()` 方法而崩溃。现改为存取均使用 `JSON.stringify` / `JSON.parse`
- **兼容旧数据**：新增 `parseQuestionsJson()` / `parseAnswersJson()` 函数，同时处理 Array 和 String 类型，已有乱码数据降级为空数组
- **GET 接口修复**：`GET /api/quiz` 返回记录前自动解析 JSON 字段

#### 学科适配
- **动态出题 Prompt**：根据 `user_settings.default_subject` 动态构建教师角色，数学→计算/应用题、语文→阅读/填空/造句、英语→词汇/句型/语法
- **`test_records` 新增 `subject` 列**：记录每次测验所属学科，自动 ALTER TABLE 迁移
- **Quiz 页学科标签**：右上角显示当前学科（📐数学/📖语文/🔤英语）

#### AI 批改增强
- **详细分析返回**：AI 批改结果新增 `knowledge_point`、`error_analysis`、`guidance`、`correct_solution` 字段
- **结果页展开详情**：每题显示错因分析、引导提示、正确解法、知识点

#### 手动纠错机制
- **`POST /api/quiz` 新增 `action: 'correct'`**：接收 `corrections[{index, correct}]` 数组，重新计算 score/passed 并更新 knowledge_points mastery
- **前端纠错交互**：结果页每题增加"纠正"按钮，点击切换正确/错误状态，分数实时重算，保存后持久化

#### 错误恢复与重试
- **提交失败保留答案**：`handleSubmit` 失败时不重置 `answers` 状态，用户可修正后重试
- **知识点按钮禁用**：出题中禁用所有知识点按钮防止重复提交

### 协议兼容性修复
- **`app/api/quiz/route.ts`**：移除 `@anthropic-ai/sdk`，改用 `fetch({baseURL}/chat/completions)` 匹配 SiliconFlow OpenAI 兼容协议
- **`app/api/plans/route.ts`**：同上修复，使用 `Qwen/Qwen3-32B` 模型
- 上述两路由之前使用 Anthropic Messages API 格式请求 SiliconFlow，协议不匹配导致始终返回 502 "AI 服务暂时不可用"

### 模型选择器改进
- **主页添加模型选择器**：`app/page.tsx` 学科栏下方新增 `ModelSelector` 组件，用户无需跳转设置页即可查看和切换模型
- **设置页自动刷新**：`ModelSelector` 新增 `refreshKey` prop，保存/删除 API Key 后自动重新获取模型列表
- **错误状态显示**：未配置 API Key 或模型加载失败时显示红色错误提示

### 配置文件
- **生产环境 SMTP 配置**：`SMTP_USER` / `SMTP_PASS` 填入真实 Gmail 凭据
- **密钥自动生成**：`NEXTAUTH_SECRET` / `API_KEY_ENCRYPTION_SECRET` 使用 `openssl rand -hex 32` 生成
- **`NEXTAUTH_URL`**：设为 `http://1.116.253.201:3000`

### 配套更新
- **版本号**：`package.json` → `2.9.0`
- **数据库迁移**：`lib/db.ts` 新增 `ALTER TABLE test_records ADD COLUMN subject`
- **文档**：新增 `docs/v2.9-ROADMAP.md`，更新 `CHANGELOG.md`

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
