#!/usr/bin/env bash
# 将 website/static-test 同步到宝塔 HTML 站点根目录
# 用法（在仓库根目录）: bash website/scripts/deploy-www.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${REPO_ROOT}/website/static-test"
DEST="${WWW_ROOT:-/www/wwwroot/www.jiankalka.cn}"

if [ ! -f "${SRC}/index.html" ]; then
  echo "错误: 未找到 ${SRC}/index.html，请确认在完整仓库内执行"
  exit 1
fi

if [ ! -d "${DEST}" ]; then
  echo "错误: 目标目录不存在: ${DEST}"
  echo "请先在宝塔创建 HTML 项目 www.jiankalka.cn，或设置环境变量 WWW_ROOT"
  exit 1
fi

echo "同步: ${SRC} -> ${DEST}"
rsync -av --delete \
  --exclude 'README.md' \
  "${SRC}/" "${DEST}/"

echo "完成。请访问 https://www.jiankalka.cn/"
