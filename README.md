# 错题批改助手 - 开发日志

## 📚 项目材料文档索引
| 文档 | 路径 | 内容 |
|------|------|------|
| 产品需求文档 PRD | [docs/PRD.md](docs/PRD.md) | 产品意图、用户画像、功能清单、体验设计 |
| 技术架构文档 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 四层架构、技术选型、数据流图 |
| 技术实现文档 | [docs/TECHNICAL.md](docs/TECHNICAL.md) | 逐模块实现、API 设计、容错策略 |
| 用户操作手册 | [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | 使用流程、界面说明、FAQ |
| 部署运维文档 | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 环境变量、建表 SQL、Vercel 部署 |

## 项目架构
- 前端页面：Next.js + React（App Router）
- API接口：Next.js API Routes
- AI服务：Claude API（@anthropic-ai/sdk）
- 数据库：Supabase
- 认证：NextAuth + Google OAuth

---

## 开发进度总览

### Week 1: MVP核心功能
| 任务 | 状态 | 完成日期 |
|------|------|----------|
| 拍照/图片上传页面 | ✅ 完成 | 2026-06-28 |
| Claude API批改接口 | ✅ 完成 | 2026-06-28 |
| 批改结果展示 | ✅ 完成 | 2026-06-28 |
| 配置ANTHROPIC_API_KEY | ⏸ 后置 | - |

### Week 2: 数据持久化
| 任务 | 状态 | 完成日期 |
|------|------|----------|
| Supabase项目创建 | ❌ 待办 | - |
| 数据库表设计 | ✅ 完成 | 2026-06-28 |
| 保存错题API | ✅ 完成 | 2026-06-28 |
| 历史列表页 | ✅ 完成 | 2026-06-28 |

### Week 3+: 体验优化
| 任务 | 状态 | 完成日期 |
|------|------|----------|
| Google登录 | ✅ 完成 | 2026-06-28 |
| 前端视觉重构 | ✅ 完成 | 2026-06-28 |
| Vercel部署 | ⏸ 待办 | - |

---

## 前端设计项目指引

本节作为前端开发的独立指引文档，指导后续 UI 迭代。

### 设计目标
面向小学生家长（用户本人）使用，在手机浏览器中操作。核心诉求：
**拍题 → 批改 → 看错因 → 收藏错题**，整个流程不超过 3 次点击。

### 设计原则
1. **移动优先**：所有页面 max-width 480px，触控区不小于 44px
2. **卡片式布局**：内容放入白色圆角卡片，背景用渐变突出层次
3. **渐进展示**：上传后才显示批改按钮，结果区可滑动展开
4. **即时反馈**：loading 状态、错误提示、空状态都要明确

### 视觉规范

| 元素 | 规范 |
|------|------|
| 主色 | 渐变 `#667eea → #764ba2` |
| 背景 | `#f5f7fa`（页面）/ 白色（卡片） |
| 圆角 | 卡片 24px / 按钮 14px / 标签 8px |
| 字号 | 标题 26px / 正文 14px / 辅助 12px |
| 阴影 | `0 20px 60px rgba(0,0,0,0.25)` |
| Emoji | 作为图标使用，避免引入图标库 |

### 页面清单

| 页面 | 路径 | 状态 |
|------|------|------|
| 首页（拍照批改） | `/` | ✅ 已重构 |
| 错题本 | `/history` | ✅ 已重构 |
| 登录回调 | `/api/auth/*` | ✅ NextAuth默认 |

### 组件复用说明
当前使用内联 style + `styles` 对象集中管理，适合初期快速迭代。
后续如页面增多，建议：
1. 抽取公共组件（`UploadArea`、`ResultCard`、`EmptyState`）
2. 引入 Tailwind CSS 替代内联样式
3. 用 shadcn/ui 补充交互组件（Dialog、Toast）

---

## 五维度实例分析（基于真实代码审查）

下表为审查实际代码后发现的真实问题，✅ 表示本轮已修复，⏳ 表示待办。

### 1. 产品维度
| 问题 | 根因 | 状态 |
|------|------|------|
| 批改成功后错题进不了库 | correct 接口不存库，前端无保存入口 | ✅ 新增「存入错题本」按钮 |
| 无学科分类 | 数据库无 subject 实际使用 | ⏳ 历史页加筛选 |
| 错题无复习闭环 | 缺少复习模式 | ⏳ 增加「错题重做」 |

### 2. 功能维度
| 问题 | 根因 | 状态 |
|------|------|------|
| 部分机型 image.type 为空 → Claude 报错 | 未做 MIME 兜底 | ✅ getMimeType 兜底 png/jpeg |
| 批改结果非结构化 | prompt 未约束输出 | ✅ prompt 改为四段式结构 |
| 无图片大小限制 | 可传任意大图 | ✅ 10MB 上限校验 |
| 无图片存储 | 仅存文字 | ⏳ 接 Supabase Storage |

### 3. 视觉维度
| 问题 | 根因 | 状态 |
|------|------|------|
| loading 仅文字 | 无动效 | ✅ 旋转 spinner + 计时 |
| 历史页加载无反馈 | 直接文字「加载中」 | ✅ 骨架屏 shimmer 动画 |
| 批改结果无对错区分 | 纯文本展示 | ⏳ Markdown 渲染 + 着色 |

### 4. 体验维度
| 问题 | 根因 | 状态 |
|------|------|------|
| 大图直传慢/费流量 | 未压缩 | ✅ canvas 压缩至 1600px/0.85 |
| AI 5-15s 无进度 | 用户以为卡死 | ✅ 实时秒数计时 |
| 历史页加载失败无提示 | 仅置 loading=false | ✅ 错误提示 + 重试按钮 |

### 5. 稳定维度
| 问题 | 根因 | 状态 |
|------|------|------|
| Claude 卡住请求永久挂起 | 无超时 | ✅ 30s 超时 + 区分超时错误 |
| 环境变量缺失运行时才崩 | 无启动校验 | ✅ 接口入口校验 + 明确 503 |
| supabase 未配致模块加载崩溃 | 模块级 createClient | ✅ 懒加载 Proxy |
| error.message 直接返回前端 | 信息泄露 | ✅ 改为通用提示 |
| next.config 配置告警 | serverActions 布尔值非法 | ✅ 移除非法配置 |

---

## 部署指令
```bash
npm run dev    # 启动开发环境 http://localhost:3000
npm run build  # 构建生产版本
npm run start  # 运行生产版本
```

## 环境变量清单（.env.local）
```
ANTHROPIC_API_KEY=           # Claude API密钥
NEXT_PUBLIC_SUPABASE_URL=    # Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=   # Supabase服务密钥（服务端用）
GOOGLE_CLIENT_ID=            # Google OAuth客户端ID
GOOGLE_CLIENT_SECRET=        # Google OAuth密钥
```

## 当前状态
- 前端视觉重构 + 五维度优化完成（首页+历史页）
- 开发服务器：http://localhost:3000
- 未配置环境变量时全部页面优雅降级，不崩溃
- 待配置：Claude API Key / Supabase / Google OAuth
- 下一步重点：图片存储、错题复习模式、Markdown 结果渲染