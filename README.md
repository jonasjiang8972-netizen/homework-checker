# 📚 作业小帮手

<div align="center">

**拍照上传 → AI 智能批改 → 知识点掌握度追踪 → 自适应学习计划**

[![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)](https://github.com/jonasjiang8972-netizen/homework-checker)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://typescriptlang.org)
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
| 🔐 **邮箱验证码登录** | 输入邮箱接收验证码登录，无需 OAuth | ✅ 已实现 |
| 🖼️ **Markdown 渲染** | 公式/列表/代码块美化渲染 | ✅ 已实现 |
| 🔀 **多学科支持** | 数学/语文/英语多学科切换 | ✅ 已实现 |
| 🔄 **错题重做** | 重做错题并对照正确答案 | ✅ 已实现 |
| 🤖 **多模型选择** | 支持 78+ 个 AI 模型切换（含 17 个视觉模型） | ✅ 已实现 |
| 🐳 **Docker 部署** | 一键 Docker Compose 启动，内置 SQLite 数据库 | ✅ 已实现 |

---

## 🚀 快速开始

### 方式一：一键安装（推荐）

```bash
chmod +x setup.sh && ./setup.sh
```

脚本自动检测 Docker 或 Node.js 环境，引导完成配置和启动。

### 方式二：Docker 部署

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

### 方式三：本地开发

```bash
# 1. 克隆项目
git clone https://github.com/jonasjiang8972-netizen/homework-checker.git
cd homework-checker

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 API 密钥（见下文）

# 4. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 环境变量配置

在 `.env.local` 中配置以下变量：

```bash
# AI API Key（使用 SiliconFlow / 任意 OpenAI 兼容 API）
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_BASE_URL=https://api.siliconflow.cn/v1
ANTHROPIC_MODEL=Qwen/Qwen3-VL-32B-Instruct

# 邮件服务（验证码登录）
RESEND_API_KEY=re_xxxxxxxxxxxx

# NextAuth 配置
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

获取密钥指引：
- **SiliconFlow**: [cloud.siliconflow.cn](https://cloud.siliconflow.cn)
- **任意 OpenAI 兼容 API**: 设置 `ANTHROPIC_BASE_URL` 为你的 API 地址
- **Resend**: [resend.com](https://resend.com)（用于登录验证码）
- **`NEXTAUTH_SECRET`**: 可用 `openssl rand -hex 32` 生成

---

## 📁 项目结构

```
homework-checker/
├── app/                       # Next.js App Router
│   ├── api/                   # API Routes
│   │   ├── auth/             # 验证码登录 / NextAuth
│   │   ├── correct/          # 拍照批改（视觉AI + OCR回退）
│   │   ├── models/           # 可用模型列表（所有 SiliconFlow 模型）
│   │   ├── user/             # 用户 Key / 设置
│   │   ├── questions/        # 错题 CRUD
│   │   ├── stats/            # 掌握度统计
│   │   ├── plans/            # 学习计划生成
│   │   └── quiz/             # 测验出题与批改
│   ├── dashboard/            # 掌握度热力图页面
│   ├── history/              # 错题本页面
│   ├── plans/                # 学习计划页面
│   ├── quiz/                 # 测验页面
│   ├── settings/             # 登录 / 设置 / 模型选择
│   ├── docs/                 # 项目文档
│   └── page.tsx              # 首页（拍照批改，需登录）
├── lib/                       # 核心库
│   ├── db.ts                 # SQLite 数据库初始化 + Schema
│   ├── supabase.ts           # SQLite 查询构建器（兼容 Supabase API）
│   ├── grading.ts            # 批改结果解析
│   ├── mastery.ts            # 掌握度计算算法
│   ├── auth-utils.ts         # API Key 获取与用户工具
│   ├── ocr.ts                # OCR 文字识别（仅回退使用）
│   ├── email.ts              # 邮件发送（验证码）
│   ├── encryption.ts         # AES 加密解密
│   └── retry.ts              # 重试机制
├── components/               # 客户端组件
│   ├── ModelSelector.tsx     # 动态模型选择器（搜索 + 多模态筛选）
│   ├── BottomNav.tsx         # 底部导航栏
│   └── SessionProvider.tsx   # NextAuth 会话提供者
├── docs/                      # 项目文档集
│   ├── PRD.md                # 产品需求文档
│   ├── ARCHITECTURE.md       # 技术架构文档
│   ├── TECHNICAL.md          # 技术实现细节
│   ├── USER_GUIDE.md         # 用户操作手册
│   ├── DEPLOYMENT.md         # 部署运维指南
│   └── db-schema-v2.sql      # 数据库结构（SQLite 兼容）
├── data/                      # SQLite 数据库文件（Docker volume）
├── .env.local                 # 环境变量（不提交）
├── Dockerfile                 # Docker 多阶段构建
├── docker-compose.yml         # Docker Compose 编排
├── setup.sh                   # 一键安装脚本
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 16 + React 19 | App Router 全栈框架 |
| **语言** | TypeScript 6 | 类型安全 |
| **样式** | 内联 Styles | 零配置起步 |
| **AI** | SiliconFlow（OpenAI 兼容） | 78+ 模型可选，17 个视觉模型 |
| **默认模型** | Qwen/Qwen3-VL-32B-Instruct | 视觉多模态大模型 |
| **数据库** | SQLite（sql.js） | 嵌入式 WASM 数据库，无需外部服务 |
| **存储** | 本地文件系统 | `public/uploads/` + Docker volume |
| **认证** | NextAuth + 邮箱验证码 | Resend 邮件服务 |

---

## 📊 核心算法

### 掌握度计算（[lib/mastery.ts](lib/mastery.ts)）

```typescript
// 掌握度基于贝叶斯更新原理
// 初始值：50 分
// 正确：+α，错误：-β
// α/β 随做题数量衰减，避免早期一题定论

function calculateNewMastery(prevMastery: number, isCorrect: boolean, totalCount: number) {
  const decayFactor = 1 / Math.log(totalCount + 2); // 对数衰减
  const baseDelta = 20;
  const delta = baseDelta * decayFactor;
  
  const newMastery = isCorrect 
    ? Math.min(100, prevMastery + delta)
    : Math.max(0, prevMastery - delta);
  
  return Math.round(newMastery);
}
```

### 知识点标签提取

通过 Prompt 工程约束 AI 输出结构化 JSON：

```json
{
  "is_correct": false,
  "error_type": "计算失误",
  "knowledge_point": "两位数进位加法",
  "error_spot": "第二步 27+38 未进位",
  "correct_solution": "27+38=65...",
  "analysis": "对进位规则掌握不牢...",
  "knowledge_tags": ["进位加法", "竖式计算"]
}
```

---

## 🗂️ 数据库设计

使用 **SQLite**（通过 `sql.js` WASM 嵌入），零外部依赖，数据持久化在 `data/homework.db`（Docker volume）。

### 核心表结构

| 表名 | 说明 |
|------|------|
| `questions` | 错题记录（含知识点/错型标签） |
| `knowledge_points` | 知识点字典 + 掌握度统计 |
| `study_plans` | AI 生成学习计划 |
| `test_records` | 测验记录与结果 |
| `user_settings` | 用户偏好 / 加密 API Key |

完整建表语句见 [lib/db.ts](lib/db.ts)

---

## 🚢 部署指南

### Docker 一键部署（推荐）

```bash
chmod +x setup.sh && ./setup.sh
```

### Vercel / 其他托管平台

本项目依赖 SQLite 本地文件系统，建议使用 Docker 部署。如果需要在无状态平台部署，需额外配置持久化存储。

详细部署步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

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

## 🎯 v2.0 学习闭环系统

v2.0 从「批改工具」升级为「自适应学习助理」：

```
┌──────────┐      ┌──────────┐
│  ① 批改   │─────▶│  ② 打标签  │
└──────────┘      └──────────┘
                       │
                       ▼
┌──────────┐      ┌──────────┐
│  ⑥ 反馈  │◀─────│  ③ 掌握度  │
│   更新    │      │  计算     │
└──────────┘      └──────────┘
        │               │
        ▼               ▼
┌──────────┐      ┌──────────┐
│  ⑤ 测验  │◀─────│  ④ 生成计划│
└──────────┘      └──────────┘
```

**闭环流程**：批改 → 打标签 → 计算掌握度 → 生成计划 → 测验验收 → 反馈更新

**v2.6 新增**：AI 视觉直接批改替代 OCR、SiliconFlow 多模型切换、SQLite 本地数据库

---

## 🤝 贡献指南

欢迎提交 Issue 与 Pull Request！

### 开发流程

1. Fork 项目
2. `git checkout -b feature/your-feature`
3. `git commit -m "feat: add your feature"`
4. `git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范

- 使用 Prettier 格式化代码
- `npm run lint` 检查静态错误
- TypeScript 严格模式
- API 统一返回 `{ data, error }` 格式

---

## 📄 开源协议

MIT License - 见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- **Next.js**: 优秀的 React 全栈框架
- **SQL.js**: 强大的 WASM SQLite 实现
- **SiliconFlow**: 丰富的 AI 模型平台
- **Resend**: 简洁的邮件发送服务
- **NextAuth**: 简洁的身份认证方案

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ 支持！**

Made with ❤️ by jonasjiang

</div>
