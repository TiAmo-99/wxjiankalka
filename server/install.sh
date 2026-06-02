#!/bin/bash
# 宝塔 Node 环境下一键安装依赖（修正错误 npm 源）
set -e
cd "$(dirname "$0")"

echo "registry=https://registry.npmmirror.com" > .npmrc

export npm_config_registry=https://registry.npmmirror.com
unset npm_config_disturl 2>/dev/null || true

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo "registry: $(npm config get registry)"

rm -rf node_modules
# 避免 lockfile 版本与旧 npm 冲突
if [ -f package-lock.json ]; then
  rm -f package-lock.json
fi

npm install --registry=https://registry.npmmirror.com
echo "依赖安装完成"
