# 部署与运维文档

> 项目：作业小帮手
> 面向：部署者（项目所有者）
> 目标环境：本地开发 + Docker 生产部署
> 更新日期：2026-06-30

---

## 1. 环境前置

| 依赖 | 版本 | 安装 |
|------|------|------|
| Node.js | v20+ | 已通过 nvm 安装 |
| npm | v10+ | 随 Node |
| 账号 | SiliconFlow / Gmail SMTP | 自行注册 |

Node 已用 nvm 装好；新终端需先：
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
```
（已默认写入 ~/.zshrc，新开终端自动加载）

---

## 2. 安装依赖
```bash
cd ~/homework-checker
npm install
npm run dev   # 本地 http://localhost:3000
```

---

## 3. 环境变量（.env.local）

根目录已有 `.env.example` 模板，需填入真实值：

```bash
# SiliconFlow API 基础地址
ANTHROPIC_BASE_URL=https://api.siliconflow.cn/v1

# SMTP 邮件服务（验证码登录）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_gmail_app_password

# NextAuth JWT 配置
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=http://localhost:3000

# API Key 加密密钥（必填，与 NEXTAUTH_SECRET 不同）
API_KEY_ENCRYPTION_SECRET=$(openssl rand -hex 32)
```

### 3.1 获取各密钥

**SiliconFlow API Key**
1. 访问 https://cloud.siliconflow.cn 注册
2. 创建 API Key，填入用户设置页（每个用户独立配置，不再使用共享环境变量）

**Gmail SMTP 应用专用密码**
1. Google 账户 → 安全 → 两步验证（必须开启）
2. 应用专用密码 → 生成 16 位密码
3. 填入 `SMTP_USER` 和 `SMTP_PASS`

---

## 4. 数据库

使用 **SQLite**（通过 `sql.js` WASM 嵌入），零外部依赖。数据持久化在 `data/homework.db`。

无需额外建表操作，首次启动自动创建所有表（`lib/db.ts` 中的 `initSchema()`），包括 `test_records`、`questions`、`user_settings`、`knowledge_points` 等。

### 4.1 数据库迁移

项目使用 ALTER TABLE 做渐进式迁移（见 `lib/db.ts` `initSchema()` 末尾的 try-catch 块）：

```sql
ALTER TABLE user_settings ADD COLUMN base_url TEXT DEFAULT 'https://api.siliconflow.cn/v1';
ALTER TABLE test_records ADD COLUMN subject TEXT DEFAULT '数学';
```

迁移在应用启动时自动执行，幂等（表已存在则静默跳过），无需手动操作。

### 4.2 数据备份

```bash
cp data/homework.db data/homework.db.bak.$(date +%Y%m%d)
```

建议加入 crontab 每日自动备份。

---

## 5. Docker 部署

### 5.1 项目自带 Docker 支持

```bash
# 一键安装
chmod +x setup.sh && ./setup.sh

# 或手动执行
cp .env.example .env.local   # 编辑填入真实密钥
docker compose up -d          # 后台启动
# 访问 http://localhost:3000
```

### 5.2 环境变量

Docker 模式下环境变量通过 `.env.local` 传入容器，与外挂模式共享同一配置。无需额外配置。

### 5.3 环境变量参考

```bash
# SiliconFlow API 基础地址（默认，通常不需修改）
ANTHROPIC_BASE_URL=https://api.siliconflow.cn/v1

# SiliconFlow 默认模型（批改用视觉模型，出题用文本模型）
ANTHROPIC_MODEL=Qwen/Qwen3-VL-32B-Instruct

# SMTP 邮件服务（验证码登录必需）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_gmail_app_password

# NextAuth JWT 配置（必填，用 openssl rand -hex 32 生成）
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://your-server-ip:3000

# API Key 加密密钥（必填，与 NEXTAUTH_SECRET 不同）
API_KEY_ENCRYPTION_SECRET=your_random_secret
```

### 5.3 常用命令

| 命令 | 说明 |
|------|------|
| `docker compose up -d` | 后台启动 |
| `docker compose logs -f` | 跟踪日志 |
| `docker compose down` | 停止服务 |
| `docker compose build --no-cache` | 强制重新构建 |
| `docker compose restart` | 重启服务 |

### 5.4 健康检查

docker-compose.yml 已配置 healthcheck，每 30s 检测 `localhost:3000` 可用性，可通过 `docker compose ps` 查看状态。

---

## 6. 运维与监控

| 事项 | 现状 | 建议 |
|------|------|------|
| 错误监控 | console 日志 | 接 Sentry |
| 速率限制 | 无 | correct 路由加简单限流防止滥用 |
| 日志 | Next 默认 | Vercel 仪表盘可查函数日志 |
| 备份 | Supabase 自动 | 重要数据定期导出 |
| 密钥轮换 | 手动 | Anthropic/Google 密钥定期更换 |

---

## 7. 部署检查清单

上线前逐项确认：
- [ ] `.env.local` / Vercel 环境变量全部填写真实值
- [ ] `NEXTAUTH_URL` 设为生产环境 IP 或域名
- [ ] `NEXTAUTH_SECRET` / `API_KEY_ENCRYPTION_SECRET` 已用 `openssl rand -hex 32` 生成
- [ ] `SMTP_HOST/USER/PASS` 已配置真实的 Gmail SMTP 凭据
- [ ] Docker 构建验证：`docker compose build` 无报错
- [ ] 真实流程测试：出题 → 答题 → 批改 → 纠正 → 历史记录可见
- [ ] 手机浏览器访问生产域名验证移动适配

---

## 8. 故障排查

| 症状 | 排查方向 |
|------|----------|
| 批改 503 未配置 | 检查用户设置页是否已添加 API Key |
| 批改 502 超时 | 网络/AI 服务波动，重试 |
| Quiz/计划报"AI 服务暂时不可用" | 确认 API Key 已配置，检查 ANTHROPIC_BASE_URL 指向 OpenAI 兼容接口 |
| Quiz 提交后无记录/分数 | 旧数据因 v2.9 前 JSON 序列化 Bug 产生乱码，重新出题即可 |
| 登录收不到验证码 | 检查 SMTP_HOST/USER/PASS 是否配置正确 |
| Docker 启动后访问 502 | 检查 `docker compose logs -f` 查看 Next.js 是否启动完成 |
| 图片上传后不显示 | 检查 `data/uploads/` 目录权限 |
