# Changelog

所有重要更改都将记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

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
