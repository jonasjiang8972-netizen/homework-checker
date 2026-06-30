# 技术架构文档

> 项目：作业小帮手
> 架构风格：单体应用（Next.js 全栈），四层逻辑分层
> 更新日期：2026-06-30

---

## 1. 架构总览

采用 **Next.js App Router 全栈单体**，前端与后端同仓部署，逻辑上分四层。

```
┌─────────────────────────────────────────────┐
│            用户（手机浏览器）                 │
└───────────────────┬─────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────┐
│  ① 前端页面层 (Next.js React, app/")       │
│   page.tsx  history/page.tsx  layout.tsx    │
└───────────────────┬─────────────────────────┘
                    │ fetch /内联调用
┌───────────────────▼─────────────────────────┐
│  ② API 接口层 (Route Handlers, app/api")   │
│   /api/correct  /api/questions  /api/auth   │
└───────┬───────────────┬──────────────┬──────┘
        │               │              │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ ③ AI 服务层  │ │ ④ 数据层    │ │ 认证服务    │
│ Claude API  │ │ Supabase    │ │ NextAuth   │
│ (anthropic  │ │ (Postgres)  │ │ + Google   │
│   SDK)      │ │             │ │  OAuth     │
└─────────────┘ └─────────────┘ └────────────┘
```

### 为什么选单体而非前后端分离？
- **零运维**：Vercel 一键部署前端+API，无需独立后端服务器
- **同源调用**：前端调 `/api/*` 同域，无跨域配置
- **适合规模**：单人学习项目，单体最易理解与迭代

---

## 2. 四层职责

### ① 前端页面层
| 文件 | 职责 |
|------|------|
| `app/layout.tsx` | 全局布局、viewport 移动适配、metada |
| `app/page.tsx` | 首页：选图/压缩/预览/提交批改/展示结果/保存错题 |
| `app/history/page.tsx` | 错题本：列表/展开错因/空态/错误重试 |

技术：React 19 函数组件 + 内联 `styles` 对象。`'use client'` 指令标记为客户端组件（需交互状态）。

### ② API 接口层
| 路由 | 方法 | 职责 |
|------|------|------|
| `app/api/correct/route.ts` | POST | 接收图片表单 → 调 Claude → 返回批改结果 |
| `app/api/questions/route.ts` | GET/POST | 错题列表查询 / 错题保存 |
| `app/api/auth/[...nextauth]/route.ts` | GET/POST | NextAuth 登录回调 |

### ③ AI 服务层
- 依赖：`@anthropic-ai/sdk`
- 模型：`claude-3-5-sonnet-20241022`（支持多模态图像）
- 在 correct 路由内实例化，30s 超时
- 提示词约束为四段式结构化输出

### ④ 数据层
- 依赖：`@supabase/supabase-js`
- 封装：`lib/supabase.ts`（懒加载 + Proxy 防崩溃）
- 表：`questions`（见 DEPLOYMENT.md 建表 SQL）
- 认证适配器：`@auth/supabase-adapter`

---

## 3. 技术选型理由

| 技术 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 16 | 全栈、SSR/CSR 灵活、Vercel 原生部署、新手生态成熟 |
| UI 库 | React 19 | Next 内置，组件化开发 |
| 样式 | 内联 styles 对象 | 零配置起步；后续可迁移 Tailwind |
| AI | Claude (anthropic SDK) | 多模态图像理解强，批改文字题友好 |
| 数据库 | Supabase | 免费档够用，自带 Postgres + Storage + Auth |
| 认证 | NextAuth + Google | 用户已有谷歌账户，OAuth 免密码 |
| 部署 | Vercel | Next.js 官方平台，推送即部署 |
| 语言 | TypeScript | 类型安全，配合 Cursor/Claude 编码体验好 |

---

## 4. 核心数据流

### 4.1 批改主流程
```
用户选图
  │
  ▼
客户端 compressImage()  ── canvas 压缩 >1.5MB 图
  │
  ▼
POST /api/correct (FormData: image)
  │
  ├─ 校验 session + API Key ──无──▶ 401/503
  ├─ 校验 size < 10MB ──超──▶ 413
  │
  ▼
Vision Pre-check (Qwen3-VL-8B, 15s timeout)
  │
  ├─ YES ─▶ Vision Grading (用户选择模型, 120s)
  │
  └─ NO ─▶ OCR (Tesseract) → Text Grading (Qwen3-32B, 60s)
  │
  ▼
parseGrading() → 结构化 GradingResult
  │
  ▼
前端展示（两段式）
  ├─ Phase 1: ✅/❌ + 知识点 + 💡 引导提示
  ├─ 用户点击「给我看看答案」→ Phase 2
  └─ Phase 2: 错误之处 + 正确答案 + 错因分析
  │
  ▼
用户点「记下来」
  │
  ▼
POST /api/questions → SQLite questions 表
```

### 4.2 错题查看流程
```
GET /history → 页面加载
  │
  ▼
fetch GET /api/questions
  │
  ├─ getSupabase() 无配置 ─▶ { data:[], warning:"未配置数据库" }
  ├─ 查询成功 ─▶ { data:[...] }
  └─ 查询失败 ─▶ { error:"获取错题列表失败" }
  │
  ▼
loading=true 时显示骨架屏
空/有数据/错误 分别渲染对应 UI
```

---

## 5. 横切关注点

### 5.1 容错策略
```
配置缺失 → 不崩溃，返回 503 + 文字引导
API 超时  → 30s 截断，502 + "请重试"
图片过大 → 客户端预压缩 + 服务端 10MB 双重校验
DB 异常   → 通用提示，不泄露 error.message
```

### 5.2 安全边界
- API Key 仅服务端使用，`ANTHROPIC_API_KEY` 不加 `NEXT_PUBLIC_` 前缀
- `error.message` 不直接回传前端
- 后续应加：速率限制、登录态校验（目前 correct 路由未强制登录）

### 5.3 目录约定
```
homework-checker/
├── app/                 # 路由即文件
│   ├── api/             # 后端 Route Handlers
│   ├── history/         # 错题本页
│   ├── page.tsx         # 首页
│   └── layout.tsx       # 根布局
├── lib/supabase.ts      # 数据层封装
├── docs/                # 本文档集
├── .env.local           # 环境变量（不提交）
├── next.config.js
└── package.json
```

> 注：当前未配置路径别名 `@/`，API 内用相对路径 `../../../lib/supabase` 引入数据层。

---

## 6. 架构演进方向

| 阶段 | 演进 |
|------|------|
| 当前 | 单体全栈，内联样式 |
| 中期 | 引入 Tailwind + 组件抽取；图像存 Supabase Storage |
| 远期 | 若复杂化可拆 API 为独立服务；加 Redis 速率限制、Sentry 监控 |
