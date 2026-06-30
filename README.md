# 📚 作业小帮手

<div align="center">

**拍照上传 → AI 智能批改 → 知识点掌握度追踪 → 自适应学习计划**

[![Version](https://img.shields.io/badge/version-2.7.0-blue.svg)](https://github.com/jonasjiang8972-netizen/homework-checker)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-66_✓-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ 核心功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 📸 **拍照批改** | 支持拍照/相册上传，AI 视觉直接批改（不经过 OCR） | ✅ 已实现 |
| 👁️ **视觉预检** | AI 先判断图片是否可批改，再决定批改策略 | ✅ 已实现 |
| 🏷️ **知识点打标** | 自动识别题目所属知识点与错误类型 | ✅ 已实现 |
| 📊 **掌握度统计** | 可视化展示各知识点掌握程度热力图 | ✅ 已实现 |
| 📋 **学习计划** | AI 基于薄弱点自动生成个性化学习方案 | ✅ 已实现 |
| 📝 **智能测验** | 针对薄弱知识点生成同类题目进行测验 | ✅ 已实现 |
| 💾 **错题本** | 自动归档错题，支持分类与回放（SQLite 本地存储） | ✅ 已实现 |
| 🔐 **邮箱验证码登录** | 输入邮箱接收验证码登录，支持 Gmail SMTP | ✅ 已实现 |
| 🖼️ **Markdown 渲染** | 公式/列表/代码块美化渲染 | ✅ 已实现 |
| 🔀 **多学科支持** | 数学/语文/英语多学科切换 | ✅ 已实现 |
| 🔄 **错题重做** | 重做错题并对照正确答案 | ✅ 已实现 |
| 🤖 **多模型选择** | 支持 78+ 个 AI 模型切换（含 17 个视觉模型） | ✅ 已实现 |
| 🐳 **Docker 部署** | 一键 Docker Compose 启动，内置 SQLite 数据库 | ✅ 已实现 |
| 🛡️ **安全加固** | 上传鉴权、加密密钥管理、API 限流、JWT 过期 | ✅ 已实现（v2.7） |

---

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/jonasjiang8972-netizen/homework-checker.git
cd homework-checker

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 API 密钥（见下文）

# 3. 启动
docker compose up -d
# 访问 http://localhost:3000

# 查看日志
docker compose logs -f
# 停止服务
docker compose down
```

### 方式二：本地开发

```bash
git clone https://github.com/jonasjiang8972-netizen/homework-checker.git
cd homework-checker
npm install
cp .env.example .env.local
# 编辑 .env.local
npm run dev
# 访问 http://localhost:3000
```

### 环境变量配置

在 `.env.local` 中配置以下**必填**变量：

```bash
# AI API Key（SiliconFlow / 任意 OpenAI 兼容 API）
ANTHROPIC_API_KEY=sk-your_key_here
ANTHROPIC_BASE_URL=https://api.siliconflow.cn/v1
ANTHROPIC_MODEL=Qwen/Qwen3-VL-32B-Instruct

# SMTP 邮件服务（验证码登录，推荐 Gmail SMTP）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_gmail_app_password

# NextAuth JWT 配置
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=http://localhost:3000

# ⚠️ API Key 加密密钥（必填，与 NEXTAUTH_SECRET 不同）
API_KEY_ENCRYPTION_SECRET=$(openssl rand -hex 32)
```

获取密钥指引：

| 密钥 | 获取方式 |
|------|----------|
| **ANTHROPIC_API_KEY** | [SiliconFlow 控制台](https://cloud.siliconflow.cn) → API Key |
| **SMTP_USER / SMTP_PASS** | Gmail 账户 → 安全 → 两步验证 → 应用专用密码（16 位） |
| **NEXTAUTH_SECRET** | `openssl rand -hex 32` 生成 |
| **API_KEY_ENCRYPTION_SECRET** | `openssl rand -hex 32` 生成 |

---

## 📁 项目结构

```
homework-checker/
├── app/                       # Next.js App Router
│   ├── api/                   # API Routes
│   │   ├── auth/             # 验证码登录 / NextAuth
│   │   ├── correct/          # 拍照批改（视觉AI + OCR回退）
│   │   ├── uploads/[file]/   # 🔒 图片下载（需登录认证）
│   │   ├── models/           # 可用模型列表
│   │   ├── user/             # 用户 Key / 设置
│   │   ├── questions/        # 错题 CRUD
│   │   ├── stats/            # 掌握度统计
│   │   ├── plans/            # 学习计划
│   │   └── quiz/             # 测验出题与批改
│   ├── dashboard/            # 掌握度热力图
│   ├── history/              # 错题本
│   ├── plans/                # 学习计划页
│   ├── quiz/                 # 测验页
│   ├── settings/             # 登录 / 设置 / 模型选择
│   ├── docs/                 # 项目文档
│   └── page.tsx              # 首页（拍照批改）
├── lib/                       # 核心库
│   ├── db.ts                 # SQLite 数据库初始化
│   ├── supabase.ts           # SQLite 查询构建器
│   ├── grading.ts            # 批改结果解析
│   ├── mastery.ts            # 掌握度计算算法
│   ├── email.ts              # Gmail SMTP 邮件发送
│   ├── encryption.ts         # 🔒 AES-256-GCM 加密（API Key）
│   ├── auth-utils.ts         # 用户会话工具
│   ├── auth-store.ts         # 验证码内存存储（5分钟过期）
│   ├── retry.ts              # 重试机制（指数退避）
│   └── ocr.ts                # OCR 文字识别（仅回退）
├── __tests__/                 # 🧪 66 个测试用例
├── app/components/            # 客户端组件
├── data/                      # SQLite 数据库文件 + 图片上传（Docker volume 🔒）
├── Dockerfile                 # Docker 多阶段构建
├── docker-compose.yml         # Docker Compose 编排
├── package.json
└── next.config.js
```

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 16 + React 19 | App Router 全栈框架 |
| **语言** | TypeScript 6 | 严格模式 |
| **AI** | SiliconFlow（OpenAI 兼容） | 78+ 模型可选，17 个视觉模型 |
| **默认模型** | Qwen/Qwen3-VL-32B-Instruct | 视觉多模态 |
| **数据库** | SQLite（sql.js WASM） | 嵌入式，零外部依赖 |
| **存储** | 本地文件系统 → `data/uploads/` | 🔒 需登录认证后访问 |
| **认证** | NextAuth JWT + 邮箱验证码 | Gmail SMTP 发送 |
| **邮件** | Gmail SMTP（nodemailer） | ✅ 可发送到任意邮箱 |
| **加密** | AES-256-GCM | 用于 API Key 加密存储 |
| **测试** | Vitest v4 + v8 覆盖率 | 66 个用例 |

---

## 🔒 安全架构

### 已实施的安全措施

| 类别 | 措施 | 实施版本 |
|------|------|----------|
| **认证** | 所有数据 API 要求登录（401 拦截） | v2.6.2 |
| **认证** | JWT 24 小时自动过期 | v2.7.0 |
| **限流** | 验证码接口 IP(5次/分) + 邮箱(3次/5分) 双限流 | v2.7.0 |
| **存储** | 上传图片需登录认证后方可访问 | v2.7.0 |
| **存储** | API Key 使用 AES-256-GCM 加密存储 | v2.3.0 |
| **密钥** | 加密密钥强制独立环境变量，无硬编码回退 | v2.7.0 |
| **依赖** | 参数化 SQL 查询，防 SQL 注入 | v2.6.0 |
| **测试** | API auth guard 自动化测试（11 用例） | v2.6.2 |

### 已知风险（持续改进）

| 风险 | 说明 | 等级 |
|------|------|------|
| **无 HTTPS** | 生产环境需配置 SSL 证书 | 🟡 中 |
| **无 CSP 头** | 未配置 Content-Security-Policy | 🟢 低 |
| **依赖漏洞** | nodemailer/next-auth 存在已知 CVE | 🟡 中（修复需 breaking change） |

---

## 🧪 测试

```bash
# 运行全部 66 个测试用例
npm test

# 单次运行 + 覆盖率
npx vitest run --coverage
```

| 测试文件 | 用例数 | 覆盖模块 |
|----------|--------|----------|
| `mastery.test.ts` | 12 | 掌握度计算算法 |
| `grading.test.ts` | 15 | 批改结果解析 + 格式化 |
| `encryption.test.ts` | 12 | AES 加解密回环 + 脱敏 |
| `retry.test.ts` | 10 | 重试策略（超时/5xx/连接拒绝） |
| `auth-store.test.ts` | 7 | 验证码存储/过期/清理 |
| `api-auth-guard.test.ts` | 11 | 全部 API 路由 401 拦截 |

---

## 🗂️ 数据库设计

使用 **SQLite**（通过 `sql.js` WASM 嵌入），零外部依赖。数据持久化在 `data/homework.db`（Docker volume）。

| 表名 | 说明 | user_id 隔离 |
|------|------|-------------|
| `questions` | 错题记录 | ✅ 每行记录用户 |
| `knowledge_points` | 知识点字典 + 掌握度 | ✅ 每行记录用户 |
| `study_plans` | AI 生成学习计划 | ✅ 每行记录用户 |
| `test_records` | 测验记录与结果 | ✅ 每行记录用户 |
| `user_settings` | 用户偏好 / 加密 API Key | ✅ email 为主键 |

完整建表语句见 [lib/db.ts](lib/db.ts)

---

## 🚢 部署指南

### Docker 部署（生产）

```bash
# 1. 克隆并配置
git clone https://github.com/jonasjiang8972-netizen/homework-checker.git
cd homework-checker
cp .env.example .env.local
# 编辑 .env.local，填入所有必填变量

# 2. 构建并启动
docker compose build
docker compose up -d

# 3. 确认运行
curl http://localhost:3000
# → HTML 200
```

### 腾讯云部署

项目已部署至 `1.116.253.201`（Ubuntu 24.04 + Docker + Nginx 反向代理），
完整部署运维手册：`http://1.116.253.201/reports/作业小帮手v2.6.2-部署运维操作手册.docx`

---

## 📖 文档索引

| 文档 | 说明 |
|------|------|
| [产品需求文档 PRD](docs/PRD.md) | 产品定位、用户需求、功能清单 |
| [技术架构文档](docs/ARCHITECTURE.md) | 四层架构、技术选型、数据流 |
| [技术实现文档](docs/TECHNICAL.md) | 逐模块实现细节、容错策略 |
| [用户操作手册](docs/USER_GUIDE.md) | 使用流程、界面说明、FAQ |
| [部署运维指南](docs/DEPLOYMENT.md) | 环境变量、Docker 部署 |
| [CHANGELOG](CHANGELOG.md) | 版本历史与变更记录 |

---

## 📊 核心算法

### 掌握度计算（[lib/mastery.ts](lib/mastery.ts)）

```typescript
// 掌握度基于贝叶斯更新原理
// 初始值：50 分，正确：+α，错误：-β
// α/β 随做题数量对数衰减
function calculateNewMastery(prevMastery: number, isCorrect: boolean, totalCount: number) {
  const decayFactor = 1 / Math.log(totalCount + 2);
  const baseDelta = 20;
  const delta = baseDelta * decayFactor;
  const newMastery = isCorrect
    ? Math.min(100, prevMastery + delta)
    : Math.max(0, prevMastery - delta);
  return Math.round(newMastery);
}
```

---

## 📄 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v2.7.0 | 2026-06-30 | 🔒 安全加固：上传鉴权、加密密钥强制、验证码限流、JWT 过期、测试体系 |
| v2.6.2 | 2026-06-30 | 🛡️ 修复未授权访问漏洞（标题/计划/统计/测验 API） |
| v2.6.0 | 2026-06-29 | 🏗️ SiliconFlow 平台、SQLite 数据库、视觉 AI 批改、强制登录 |
| v2.5.0 | 2026-06-29 | OCR 文字识别、邮箱验证码登录 |
| v2.4.0 | 2026-06-29 | 友善语言优化、全量文档同步 |
| v2.3.0 | 2026-06-29 | 用户体系、API Key 加密管理 |
| v2.2.2 | 2026-06-28 | Docker 一键部署、体验打磨 |
| v2.1.0 | 2026-06-28 | 体验优化与基础设施完善 |
| v2.0.0 | 2026-06-27 | 学习闭环系统 |

完整变更记录见 [CHANGELOG.md](CHANGELOG.md)

---

## 📄 开源协议

MIT License — 见 [LICENSE](LICENSE) 文件

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ 支持！**

Made with ❤️ by jonasjiang

</div>
