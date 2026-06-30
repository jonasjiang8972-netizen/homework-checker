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

无需额外建表操作，首次启动自动创建所有表（`lib/db.ts` 中的 `initSchema()`）。

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
- [ ] Supabase `questions` 表已建
- [ ] Google OAuth 回调地址含生产域名
- [ ] `NEXTAUTH_URL` / `NEXTAUTH_SECRET` 已设
- [ ] Docker 构建验证：`docker compose build` 无报错
- [ ] 零配置降级测试：清空变量后 `npm run dev` 不崩溃
- [ ] 真实流程测试：拍一道题 → 批改 → 存档 → 错题本可见
- [ ] 手机浏览器访问生产域名验证移动适配

---

## 8. 故障排查

| 症状 | 排查方向 |
|------|----------|
| 批改 503 未配置 | 检查用户设置页是否已添加 API Key |
| 批改 502 超时 | 网络/AI 服务波动，重试 |
| 登录收不到验证码 | 检查 SMTP_HOST/USER/PASS 是否配置正确 |
| Docker 启动后访问 502 | 检查 `docker compose logs -f` 查看 Next.js 是否启动完成 |
| 图片上传后不显示 | 检查 `data/uploads/` 目录权限 |
