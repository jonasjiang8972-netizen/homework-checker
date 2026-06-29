# Changelog

所有重要更改都将记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

---

## [2.6.0] - 2026-06-29

### 🔄 平台切换 + SQLite 本地数据库 + 视觉 AI 批改

#### 🤖 AI 平台切换
- [x] 从 Anthropic SDK / DeepSeek 代理切换至 **SiliconFlow**（OpenAI 兼容 API）
- [x] 动态模型列表 API `GET /api/models`，展示全部 78 个可用模型
- [x] 自动识别 17 个多模态（视觉）模型并标记 📷
- [x] 设置页模型选择器重构：搜索、筛选多模态、实时从 API 拉取

#### 👁️ 视觉 AI 批改（替代 OCR）
- [x] 新增视觉预检：先让 AI 判断图片是否包含可批改内容，15s 超时
- [x] 预检通过 → 直接发送图片给 AI 视觉模型批改（不经过 OCR）
- [x] 预检失败 → 回退 OCR 文字提取 + 文本批改
- [x] 默认模型 `Qwen/Qwen3-VL-32B-Instruct`（Qwen3 视觉大模型）
- [x] 修复 tesseract.js 在 standalone 构建中的崩溃问题（动态 import）

#### 🗄️ SQLite 本地数据库（替代 Supabase）
- [x] 移除 Supabase 云数据库依赖，改用 **sql.js**（WASM SQLite）嵌入程序
- [x] 5 张完整表：`questions`、`knowledge_points`、`study_plans`、`test_records`、`user_settings`
- [x] 查询构建器兼容 Supabase API 风格（`.select().eq().order()`）
- [x] 数据持久化：`docker-compose.yml` 添加 `./data:/app/data` volume
- [x] 容器重启数据不丢失

#### 🔒 安全加固
- [x] 首页强制登录：未登录显示"请先登录"提示
- [x] `POST /api/correct` 后端验证 session，未登录返回 401
- [x] 防止 API Key 被匿名用户消耗

#### ⚡ 性能与体验优化
- [x] Nginx 代理超时从 60s 提升至 180s
- [x] API 超时分段控制：预检 15s、视觉批改 120s、文本批改 60s
- [x] `AbortController` 替代 `AbortSignal.timeout`（更可靠）
- [x] 客户端加载阶段提示：上传图片 → 检查图片 → AI批改
- [x] 25s 慢加载警告提示

## [2.5.0] - 2026-06-29

### 🤖 OCR 文字识别 + 邮箱验证码登录

#### 📷 OCR 图片文字识别
- [x] Tesseract.js 集成，拍照后自动提取图片中的文字
- [x] 原图保留到 `public/uploads/` 目录，持久化存储供未来视觉模型使用
- [x] 支持中英文混合识别（`chi_sim+eng`）
- [x] 图片保存返回 URL，存入错题时附带原图地址
- [x] 适配文本 API（DeepSeek 兼容接口等），不再依赖视觉模型

#### 📧 邮箱验证码登录（替代 Google Auth）
- [x] `nodemailer` 集成，支持 QQ邮箱/163邮箱 SMTP
- [x] 6位验证码，5分钟有效期，用完即销毁
- [x] 验证码发送接口 `POST /api/auth/send-code`
- [x] NextAuth CredentialsProvider 验证码校验
- [x] 设置页登录 UI 替换为邮箱输入+验证码

#### 🔧 技术改进
- [x] 新增 `lib/ocr.ts` OCR 工具模块
- [x] 新增 `lib/email.ts` 邮件发送模块
- [x] 新增 `lib/auth-store.ts` 验证码内存存储
- [x] Docker 增加 `uploads` 持久化卷挂载
- [x] 环境变量增加 `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS`
- [x] `.env.example` 更新为最新配置项

---

### 🎨 友善语言 + 全量文档同步

#### 💬 友善语言优化
- [x] 8 个前端页面文本重新润色，面向小学生温暖语气
- [x] 标题统一："错题批改助手" → "作业小帮手"
- [x] 导航标签：批改→做作业 / 成长记录→成长日记 / 学习小档案→学习地图 / 计划→路线
- [x] 按钮文案口语化：开始批改→帮我看看 / 存入成长记录→记下来 / 标记完成→我学会啦
- [x] 掌握度标签：薄弱→多练练 / 很不错→已经很棒啦🌟
- [x] 错误提示温和化：网络错误→好像出了点小问题
- [x] 游戏化命名：知识点测验→闯关挑战🎯 / 学习计划→我的学习路线

#### 🔐 用户体系 + API Key 管理（已完成）
- [x] SessionProvider 客户端组件 + layout 全局包裹
- [x] Google OAuth 登录全流程修复
- [x] 登录态 UI（用户信息/退出）
- [x] AES-256-GCM 加密工具（`lib/encryption.ts`）
- [x] `user_settings` 表：加密 Key + 偏好
- [x] API Key CRUD 接口（加密存储/脱敏查询/删除）
- [x] `/api/user/key` + `/api/user/settings` 接口
- [x] `/api/correct` / `/api/plans` / `/api/quiz` 路由接入用户 Key
- [x] `/settings` 页面：Key 管理 + 偏好设置

#### 👤 数据隔离
- [x] 题目查询过滤当前用户
- [x] 掌握度统计只统计本人数据
- [x] 学习计划/测验数据隔离

#### 📚 文档同步
- [x] 全量文档更新至 v2.4：README / CHANGELOG / PRD / 架构 / 技术 / 部署 / 用户手册
- [x] `docs/v2.4-ROADMAP.md` 替换 v2.3-ROADMAP.md

---

## [2.2.2] - 2026-06-29

### 🎨 体验打磨与学科扩展

#### 📝 Markdown 渲染
- [x] 安装 KaTeX 公式渲染依赖
- [x] 创建 `MarkdownRenderer` 共享组件（marked + katex 集成）
- [x] 首页批改结果接入 Markdown 渲染（公式/列表/代码块）
- [x] 错题本分析区域增强公式支持

#### 🔀 错题列表排序优化
- [x] API 支持 `sort_by` / `order` / `filter_error` / `filter_subject` 参数
- [x] 前端排序控件（时间升降序、按知识点、按学科）
- [x] 正确/错误状态筛选
- [x] 学科分类筛选（服务端查询）

#### 📚 多学科支持
- [x] 首页学科选择器（数学/语文/英语/其他）
- [x] 批改时指定学科，入库带学科标签
- [x] 掌握度热力图学科切换
- [x] `/api/stats?subject=X` 分学科统计

#### 🔧 技术改进
- 版本号更新至 2.2.2
- 全量文档同步：PRD / CHANGELOG / v2.2-ROADMAP / README

---

## [2.1.0] - 2026-06-29

### 🚀 体验优化与基础设施

#### ✨ 新增功能

- **AI 模型选择器**：首页顶部可选 Claude 3 Haiku/3.5 Haiku/3.5 Sonnet/Opus 模型
- **前后端模型联动**：前端选择的模型直接传递到批改接口，即时生效
- **批改重试机制**：超时或其他暂时性错误时自动重试 3 次
- **批改进度细化**：显示「压缩中→上传中→AI 批改中」分步状态
- **API 调用重试**：客户端 3 次重试 + 服务端 2 次自动重试

#### 🔧 技术改进

- **类型安全**：修复 `retry.ts` 类型错误（`maxRetries` 为 undefined、`error.status` 不存在）
- **构建修复**：修复 `data-recycler.ts` 在服务端模块中使用 React hooks 的构建失败
- **测试覆盖**：12 个掌握度算法单元测试，覆盖边缘情况（边界值、衰减、空输入）
- **CI 集成**：GitHub Actions 自动运行 lint + typecheck + test + build
- **TypeScript 升级**：`target` 从 `es5` 升级至 `es2017`，消除废弃警告
- **sharp 依赖移除**：用原生 Buffer 处理替代原生模块，减少依赖复杂度
- **vitest 配置修复**：修复错误的 `include` 路径

#### 📚 文档完善

- `docs/FUTURE-ROADMAP.md`：长期技术愿景
- `docs/v2.2-ROADMAP.md`：v2.2 迭代规划
- `.github/workflows/ci.yml`：CI 工作流文档化
- `docs/TECHNICAL.md`：新增重试机制和模型选择说明
- `docs/DEPLOYMENT.md`：新增多模型环境变量文档

---

## [2.0.0] - 2026-06-29

### 🎉 重大升级：学习闭环系统

v2.0 从「拍照批改工具」升级为「自适应学习助理」，实现数据驱动的个性化学习闭环。

#### ✨ 新增功能

- **知识点掌握度系统**
  - 新增 `knowledge_points` 表，追踪每个知识点的掌握程度（0-100 分）
  - 基于贝叶斯更新原理的掌握度算法，正确/错误动态调整
  - 掌握度热力图页面 `/dashboard`，一目了然可视化薄弱点

- **AI 学习计划生成**
  - 针对薄弱知识点自动生成分步骤学习方案
  - 学习计划 CRUD `/plans`，支持进度跟踪
  - AI 基于知识点掌握率拆解具体可执行步骤

- **智能测验闭环**
  - 同知识点生成新题进行测验验收 `/quiz`
  - AI 自动批改测验答案并提供反馈
  - 测验结果自动回写掌握度，形成学习闭环

- **结构化批改输出**
  - 批改结果 JSON 结构化：`is_correct`, `error_type`, `knowledge_point`, `knowledge_tags`
  - 支持 4 类错误类型识别：计算失误/概念不清/审题错误/方法错误
  - 前端分块卡片展示，信息结构清晰

#### 🔧 技术改进

- **数据库升级**
  - 新增表：`knowledge_points`, `study_plans`, `test_records`
  - `questions` 表扩展字段：`is_correct`, `knowledge_point`, `error_type`, `mastery_delta`
  - 完整建表 SQL：`docs/db-schema-v2.sql`

- **API 路由扩展**
  - `POST /api/correct` 返回结构化 JSON + 图片上传
  - `GET/POST /api/questions` 支持标签字段
  - `GET /api/stats` 聚合统计接口
  - `GET/POST/PATCH /api/plans` 学习计划 CRUD
  - `POST /api/quiz` 测验出题与提交批改

- **核心库**
  - `lib/grading.ts`：批改结果解析器、容错处理、Prompt 模板
  - `lib/mastery.ts`：掌握度计算算法、知识点统计聚合
  - `lib/supabase.ts`：新增 `uploadImage()` 图片上传方法

#### 🎨 前端改进

- **首页重构**
  - 分块卡片展示批改结果：错误类型/知识点/正解/错因/标签
  - 对错视觉标识：绿色✅/红色❌
  - 图片上传预览 + 自动压缩（>1.5MB 压缩到 1600px）

- **新增页面**
  - `/dashboard`：掌握度热力图 + 薄弱点列表
  - `/plans`：学习计划列表 + 进度跟踪
  - `/quiz`：在线测验 + 结果反馈
  - `/docs`：项目文档浏览器

- **错题本增强**
  - 学科分类筛选
  - 知识点/错型标签展示
  - Markdown 渲染支持（公式、代码块）
  - "重做同类题" 入口直达测验

#### 📚 文档完善

- `docs/PRD.md`：更新 v2.0 需求章节
- `docs/v2.0-ROADMAP.md`：完整路线图与设计
- `docs/db-schema-v2.sql`：数据库结构 SQL
- `README.md`：全面重写，符合 GitHub 开源标准

#### 🐛 Bug 修复

- 固定 `image.type` 为空时的 MIME 类型兜底
- AI 超时 30s 自动截断 + 明确错误提示
- 数据库未配置时优雅降级，不崩溃

---

## [1.3.0] - 2026-06-28

### ✨ 体验优化

- **前端视觉重构**
  - 渐变主题色 `#667eea → #764ba2`
  - 卡片式布局，24px 圆角
  - Loading 状态：spinner + 计时秒数
  - 骨架屏 shimmer 动画

- **容错增强**
  - 客户端图片压缩（>1.5MB 压缩）
  - 服务端 10MB 大小校验
  - 错误提示人性化（非技术报错）

- **错题本优化**
  - 展开错因详情
  - 空状态引导
  - 重试机制

### 🛠️ 功能完善

- Google OAuth 登录
- 学科字段完善
- 配置缺失优雅降级验证

---

## [1.0.0] - 2026-06-28

### 🎉 MVP 发布

- 拍照/图片上传
- Claude AI 批改
- 四段式批改结果展示
- 错题保存与列表
- 基础响应式布局

---

## [0.3.0] - 2026-06-27

### 初期版本

- 基础拍照功能
- 简单批改接口
- 本地存储错题
