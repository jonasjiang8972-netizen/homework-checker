#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  错题批改助手 - 一键安装脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ----- Check prerequisites -----
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}[ERROR] 未找到 $1，请先安装${NC}"
    exit 1
  fi
}

echo -e "${YELLOW}[1/5] 检查运行环境...${NC}"

# Detect install mode
if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  MODE="docker"
  echo -e "  检测到 Docker，使用 ${GREEN}Docker${NC} 模式运行"
elif command -v node &>/dev/null; then
  MODE="node"
  echo -e "  检测到 Node.js，使用 ${GREEN}本地${NC} 模式运行"
  check_command npm
else
  echo -e "${RED}[ERROR] 未检测到 Docker 或 Node.js${NC}"
  echo "  请安装 Docker (https://docker.com) 或 Node.js (https://nodejs.org) 后再试"
  exit 1
fi

# ----- Setup env -----
echo ""
echo -e "${YELLOW}[2/5] 配置环境变量...${NC}"
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    echo -e "  已从 ${GREEN}.env.example${NC} 创建 ${GREEN}.env.local${NC}"
    echo -e "  ${RED}⚠ 请编辑 .env.local 填入你真实的 API Key${NC}"
  else
    echo -e "${RED}[ERROR] 未找到 .env.example 模板文件${NC}"
    exit 1
  fi
else
  echo -e "  ${GREEN}.env.local${NC} 已存在，跳过"
fi

# ----- Docker mode -----
if [ "$MODE" = "docker" ]; then
  echo ""
  echo -e "${YELLOW}[3/5] 检查 .env.local 配置...${NC}"
  if grep -q "your_api_key_here" .env.local 2>/dev/null || grep -q "your_supabase_url" .env.local 2>/dev/null; then
    echo -e "  ${YELLOW}⚠ 检测到占位符值，请确认已编辑 .env.local${NC}"
    read -rp "  继续? (Y/n) " confirm
    if [[ "$confirm" =~ ^[Nn] ]]; then
      echo "  退出，请编辑 .env.local 后重新运行"
      exit 0
    fi
  else
    echo -e "  ${GREEN}✓ 配置看起来完整${NC}"
  fi

  echo ""
  echo -e "${YELLOW}[4/5] 构建 Docker 镜像...${NC}"
  docker compose build

  echo ""
  echo -e "${YELLOW}[5/5] 启动服务...${NC}"
  docker compose up -d

  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  ✅ 部署完成！${NC}"
  echo -e "${GREEN}  访问: http://localhost:3000${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "  查看日志: ${BLUE}docker compose logs -f${NC}"
  echo -e "  停止服务: ${BLUE}docker compose down${NC}"
  exit 0
fi

# ----- Node mode -----
echo ""
echo -e "${YELLOW}[3/5] 安装依赖...${NC}"
npm install

echo ""
echo -e "${YELLOW}[4/5] 构建生产版本...${NC}"
npm run build

echo ""
echo -e "${YELLOW}[5/5] 启动开发服务器...${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ 安装完成！${NC}"
echo -e "${GREEN}  开发模式: npm run dev${NC}"
echo -e "${GREEN}  生产模式: npm run start${NC}"
echo -e "${GREEN}  访问: http://localhost:3000${NC}"
echo -e "${GREEN}========================================${NC}"

echo ""
echo -e "${BLUE}📖 文档:${NC}"
echo -e "  - Docker 部署: ${BLUE}docker compose up -d${NC}"
echo -e "  - 单元测试:   ${BLUE}npm run test${NC}"
echo -e "  - 类型检查:   ${BLUE}npx tsc --noEmit${NC}"
