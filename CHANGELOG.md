# Changelog

所有重要更改都将记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

---

## [2.2.0] - 2026-06-29

### 🎨 体验打磨与学科扩展（开发中）

#### P0 — Markdown 渲染
- [ ] 安装 KaTeX 公式渲染依赖
- [ ] 创建 `MarkdownRenderer` 共享组件
- [ ] 首页批改结果接入 Markdown 渲染（公式/列表/代码块）
- [ ] 错题本分析区域增强公式支持

#### P1 — 错题列表排序优化
- [ ] 支持时间升降序切换
- [ ] 支持按知识点筛选
- [ ] 支持按正确/错误筛选

#### P2 — 多学科支持增强
- [ ] 批改时指定学科
- [ ] 学科独立的掌握度统计
- [ ] 热力图学科切换

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
