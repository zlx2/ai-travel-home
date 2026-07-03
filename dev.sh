#!/bin/bash
# 前端本地开发启动脚本 (已加入 .gitignore)
# 覆盖后端代理目标，因为 vite.config.ts 读 process.env 而非 Vite 的 loadEnv
set -a
source "$(dirname "$0")/.env.local"
set +a

cd "$(dirname "$0")"
exec npm run dev -- --port 10002 2>&1
