# 📚 错题批改助手

<div align="center">

**拍照上传 → AI 智能批改 → 知识点掌握度追踪 → 自适应学习计划**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/jonasjiang8972-netizen/homework-checker)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ 核心功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 📸 **拍照批改** | 支持拍照/相册上传，AI 识别题目并批改 | ✅ 已实现 |
| 🏷️ **知识点打标** | 自动识别题目所属知识点与错误类型 | ✅ 已实现 |
| 📊 **掌握度统计** | 可视化展示各知识点掌握程度热力图 | ✅ 已实现 |
| 📋 **学习计划** | AI 基于薄弱点自动生成个性化学习方案 | ✅ 已实现 |
| 📝 **智能测验** | 针对薄弱知识点生成同类题目进行测验 | ✅ 已实现 |
| 💾 **错题本** | 自动归档错题，支持分类与回放 | ✅ 已实现 |
| 🔐 **用户登录** | Google OAuth 一键登录 | ✅ 已实现 |

---

## 🚀 快速开始

### 本地开发

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
# Claude API（AI 批改核心）
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase 数据库
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth（可选，用于登录）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

获取密钥指引：
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com)
- **Supabase**: [supabase.com](https://supabase.com)
- **Google OAuth**: [console.cloud.google.com](https://console.cloud.google.com)

---

## 📁 项目结构

```
homework-checker/
├── app/                       # Next.js App Router
│   ├── api/                   # API Routes
│   │   ├── auth/             # NextAuth 登录
│   │   ├── correct/          # 拍照批改接口
│   │   ├── questions/        # 错题 CRUD
│   │   ├── stats/            # 掌握度统计
│   │   ├── plans/            # 学习计划生成
│   │   └── quiz/             # 测验出题与批改
│   ├── dashboard/            # 掌握度热力图页面
│   ├── history/              # 错题本页面
│   ├── plans/                # 学习计划页面
│   ├── quiz/                 # 测验页面
│   ├── docs/                 # 项目文档
│   └── page.tsx              # 首页（拍照批改）
├── lib/                       # 核心库
│   ├── grading.ts            # 批改结果解析
│   ├── mastery.ts            # 掌握度计算算法
│   └── supabase.ts           # Supabase 客户端封装
├── docs/                      # 项目文档集
│   ├── PRD.md                # 产品需求文档
│   ├── ARCHITECTURE.md       # 技术架构文档
│   ├── TECHNICAL.md          # 技术实现细节
│   ├── USER_GUIDE.md         # 用户操作手册
│   ├── DEPLOYMENT.md         # 部署运维指南
│   ├── v2.0-ROADMAP.md       # v2.0 路线图
│   └── db-schema-v2.sql      # 数据库结构
├── .env.local                 # 环境变量（不提交）
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
| **AI** | Claude 3.5 Sonnet | 视觉批改模型 |
| **数据库** | Supabase PostgreSQL | 免费云数据库 |
| **存储** | Supabase Storage | 图片存储桶 |
| **认证** | NextAuth + Google OAuth | 社交登录 |

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

通过 Prompt 工程约束 Claude 输出结构化 JSON：

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

### 核心表结构

| 表名 | 说明 |
|------|------|
| `questions` | 错题记录（含知识点/错型标签） |
| `knowledge_points` | 知识点字典 + 掌握度统计 |
| `study_plans` | AI 生成学习计划 |
| `test_records` | 测验记录与结果 |

完整建表 SQL 见 [docs/db-schema-v2.sql](docs/db-schema-v2.sql)

---

## 🚢 部署指南

### Vercel 一键部署

1. [Fork](https://github.com/jonasjiang8972-netizen/homework-checker/fork) 本项目
2. [Vercel](https://vercel.com) → Import Project → 选择仓库
3. 配置环境变量（与 `.env.local` 一致）
4. Deploy → 自动分配生产域名

详细部署步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📖 文档索引

| 文档 | 说明 |
|------|------|
| [产品需求文档 PRD](docs/PRD.md) | 产品定位、用户需求、功能清单 |
| [技术架构文档](docs/ARCHITECTURE.md) | 四层架构、技术选型、数据流 |
| [技术实现文档](docs/TECHNICAL.md) | 逐模块实现细节、容错策略 |
| [用户操作手册](docs/USER_GUIDE.md) | 使用流程、界面说明、FAQ |
| [部署运维指南](docs/DEPLOYMENT.md) | 环境变量、建表 SQL、Vercel 部署 |
| [v2.0 路线图](docs/v2.0-ROADMAP.md) | 学习闭环系统升级设计 |

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
- **Supabase**: 强大的开源 Firebase 替代
- **Anthropic Claude**: 强大的多模态 AI 模型
- **NextAuth**: 简洁的身份认证方案

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ 支持！**

Made with ❤️ by jonasjiang

</div>
