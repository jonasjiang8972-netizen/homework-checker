# 技术实现文档

> 项目：作业小帮手
> 面向：开发者 / 学习者
> 本文逐模块说明真实代码实现要点，引用具体文件与行号语义

---

## 1. 前端模块

### 1.1 根布局 `app/layout.tsx`
- 导出 `metadata`（标题/描述）与 `viewport`（移动适配、themeColor `#667eea`）
- body 去默认 margin，底色 `#f5f7fa`
- 包裹所有页面

### 1.2 首页 `app/page.tsx`
首页是一个 `'use client'` 客户端组件，状态机驱动交互。

**核心状态**
| state | 作用 |
|-------|------|
| `result` | AI 批改文本 |
| `loading` | 提交中标志 |
| `loadingDetail` | 加载详情（如 "正在压缩图片..."）|
| `elapsed` | 批改计时秒数 |
| `preview` | 选中图片的预览 URL |
| `error` | 错误文案 |
| `saved` | 是否已存入错题本 |
| `retryCount` | 重试次数 |

**关键函数**
- `compressImage(file)`：>1.5MB 时用 canvas 缩放到 1600px、`toBlob('image/jpeg', 0.85)` 压缩，失败回退原图。降低上传耗时与 API 成本。
- `startTimer/stopTimer`：批改期间 setInterval 累加 `elapsed`，渲染"批改中... Ns"，消除用户等待焦虑。
- `handleSubmit`：压缩→FormData→fetch `/api/correct`，支持超时重试和加载状态提示。
- `handleSave`：将结果 POST 到 `/api/questions`，`saved` 置 true 锁定按钮。
- `handleFileChange`：选图即生成预览，清除旧结果与错误。

**交互渐进**
未选图按钮禁用 → 选图后激活 → 提交中 spinner+秒数 → 出结果+保存按钮 → 出错红框。

### 1.3 错题本 `app/history/page.tsx`
- 改为通过 `fetch('/api/questions')` 取数（早期版本直接调 supabase，未配置会崩，现已避免）。
- `loading` 渲染 3 个 shimmer 骨架块。
- `fetchError` 渲染 ⚠️ + 重试按钮。
- 空数据渲染引导卡片"去添加第一道错题"。
- 列表项点击 `expanded` 切换，展开错因详情。

---

## 2. API 模块

### 2.1 批改接口 `app/api/correct/route.ts`
```
POST /api/correct
请求体: multipart/form-data, 字段 image
响应:   200 { result, processingTime } | 503/400/413/502 { error }
```

实现要点（容错链）：
1. **环境校验**：`ANTHROPIC_API_KEY` 缺失或为占位符 → 503 明确提示。
2. **图存在性**：`formData.get('image')` 为空 → 400。
3. **大小校验**：>10MB → 413。
4. **MIME 兜底** `getMimeType()`：`image.type` 为空时按扩展名推 png/jpeg，解决部分机型不传 type。
5. **超时实例化**：`new Anthropic({ apiKey, timeout: 30000 })`，Claude 卡住时 30s 截断。
6. **模型选择**：支持通过环境变量 `ANTHROPIC_MODEL` 配置不同模型（默认使用 `claude-3-5-sonnet-latest`）。
7. **结构化提示词**：约束输出为 ①错误之处 ②正确解答 ③错因分析 ④涉及知识点；全对则回"全部正确"。
8. **错误分类**：catch 中识别 timeout 关键字 → "批改超时，请重试"；其余 → "批改服务暂时不可用"。
9. **重试机制**：在批改超时或网络中断时自动重试 2 次，提升稳定性。
10. `max_tokens` 1500 适配结构化长输出。

### 2.2 错题接口 `app/api/questions/route.ts`
```
GET  /api/questions      → { data: Question[] } | { data:[], warning } | { error }
POST /api/questions      body: { question, errorAnalysis, subject, imageUrl }
                         → { data } | 503/400/500 { error }
```

实现要点：
1. **懒加载** `getSupabase()`：未配置返回 null → GET 返回 `{data:[], warning}`，POST 返回 503。
2. **POST 输入校验**：JSON 解析失败 400；`question` trim 为空 400。
3. **安全**：catch 仅返回通用"保存失败"，不回传 `error.message`。

### 2.3 认证 `app/api/auth/[...nextauth]/route.ts`
- NextAuth v4，导出 `GET`/`POST` handler。
- Provider：Google OAuth。
- Adapter：`@auth/supabase-adapter`，把会话/用户写入 Supabase。
- 依赖环境变量 `GOOGLE_CLIENT_ID/SECRET` 与 `SUPABASE_SERVICE_ROLE_KEY`（详见 DEPLOYMENT.md）。

---

## 3. 数据层 `lib/supabase.ts`

**为什么这样设计？**
早期写法 `export const supabase = createClient(url, key)`，url 为占位符时模块加载即抛 `Invalid supabaseUrl`，整个应用崩溃。

**改进：懒加载 + Proxy**
- `getSupabase()`：仅当 url/key 有效（非占位 `your_`）才真正 `createClient`，缓存单例。
- `supabase` 导出为 Proxy：访问任意属性时按需取真实 client，若未配置则抛「未配置 Supabase，请填写…」。
- 效果：API 层用 `getSupabase()` 判空优雅降级；前端不再直接 import supabase，改为走 API。

---

## 4. 数据模型

`questions` 表（Postgres / Supabase）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (pk) | 默认 gen_random_uuid() |
| question | text | 题目文本/占位 |
| error_analysis | text | 批改+错因 |
| subject | text | 学科，默认"未分类" |
| image_url | text | 图片链接（待 Storage 接入） |
| created_at | timestamptz | 默认 now() |

`batch_grading_data` 表（新增用于 v2.1 优化）：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid (pk) | 批改记录唯一标识 |
| student_id | uuid | 学生 ID |
| question_id | uuid | 题目 ID |
| image_url | text | 压缩后图像 URL |
| ocr_text | text | OCR 提取的文本内容 |
| ocr_confidence | float | OCR 置信度 |
| grading_result | jsonb | 完整批改结果 |
| model_version | text | 使用的 AI 模型版本 |
| processing_time_ms | integer | 处理耗时（毫秒） |
| file_size | integer | 文件大小（字节） |
| created_at | timestamptz | 默认 now() |

建表 SQL 见 `DEPLOYMENT.md`。

NextAuth/SupabaseAdapter 会自动创建 `users`、`accounts`、`sessions` 等表（首次登录时由适配器管理）。

---

## 5. 容错与已知边界

| 场景 | 现行处理 | 边界/待办 |
|------|----------|------------|
| 未配 Claude Key | 503 引导 | — |
| 未配 Supabase | 前端走 API 降级为空 | 存档不可用 |
| Claude 超时 | 30s 截断 + 502 | 可加重试 |
| 大图上传 | 客户端压缩 + 10MB 校验 | 超分辨率题目可能压糊 |
| image.type 空 | 扩展名兜底 | — |
| 网络中断 | 前端 catch "网络错误" | 增加指数退避重试 |
| 匿名写入 | 无登录强制 | correct 路由未校验登录态 |
| 图像损坏 | 未做校验直接上传 | 增加解码判断 |
| 重试机制 | API 增加重试 2 次 | 部分错误不重试 |

---

## 6. 编码约定

- 组件：函数组件 + `'use client'`，状态用 `useState`/`useRef`。
- 样式：`const styles: Record<string, React.CSSProperties>` 集中对象，内联应用；利于初期迭代，后续迁移 Tailwind。
- 错误：统一返回 `{ error: string }`，HTTP 状态码语义化（400/413/500/502/503）。
- 安全：服务端密钥非 `NEXT_PUBLIC_`；不泄露内部 message。
- 路径：API 内用相对路径引入 `lib/`（未配 `@/` 别名）。

---

## 7. 验证记录（零配置基线）

未填写任何真实密钥时，手动验证：
| 端点 | 状态码 | 返回 |
|------|--------|------|
| `GET /` | 200 | 首页 UI |
| `GET /history` | 200 | 骨架屏/空态 |
| `GET /api/questions` | 200 | `{"data":[],"warning":"未配置数据库..."}` |
| `POST /api/correct` | 503 | `{"error":"未配置 Claude API Key..."}` |

结论：零配置可启动、不崩溃、有引导，验证容错链有效。
