# Changelog

所有重要更改都将记录在此文件中。

本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

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
