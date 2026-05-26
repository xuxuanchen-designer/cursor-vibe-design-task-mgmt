#!/usr/bin/env bash
# 一键：创建 GitHub 仓库 → 推送代码 → 开启 GitHub Pages
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

REPO_NAME="${REPO_NAME:-cursor-vibe-design-task-mgmt}"
VISIBILITY="${VISIBILITY:-public}"
BRANCH="${BRANCH:-main}"

install_gh() {
  local arch suffix ver tmp url
  arch="$(uname -m)"
  case "$arch" in
    arm64) suffix="macOS_arm64" ;;
    x86_64) suffix="macOS_amd64" ;;
    *) echo "不支持的架构: $arch"; exit 1 ;;
  esac
  echo "正在下载 GitHub CLI …"
  ver="$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest | sed -n 's/.*"tag_name": "v\([^"]*\)".*/\1/p' | head -1)"
  tmp="$(mktemp -d)"
  url="https://github.com/cli/cli/releases/download/v${ver}/gh_${ver}_${suffix}.zip"
  curl -fsSL "$url" -o "$tmp/gh.zip"
  unzip -q "$tmp/gh.zip" -d "$tmp"
  mkdir -p "$ROOT/.bin"
  cp "$tmp"/gh_*/bin/gh "$ROOT/.bin/gh"
  chmod +x "$ROOT/.bin/gh"
  rm -rf "$tmp"
  export PATH="$ROOT/.bin:$PATH"
  echo "GitHub CLI 已安装到 $ROOT/.bin/gh"
}

if ! command -v gh >/dev/null 2>&1; then
  if [[ -x "$ROOT/.bin/gh" ]]; then
    export PATH="$ROOT/.bin:$PATH"
  else
    install_gh
  fi
fi

if ! gh auth status >/dev/null 2>&1; then
  echo ""
  echo "尚未登录 GitHub。请在浏览器中完成授权："
  gh auth login -h github.com -p https -w -s repo,workflow,read:org
fi

if [[ ! -d .git ]]; then
  git init -b "$BRANCH"
fi

if ! git config user.email >/dev/null 2>&1; then
  git config user.email "$(gh api user -q .email 2>/dev/null || echo 'you@users.noreply.github.com')"
fi
if ! git config user.name >/dev/null 2>&1; then
  git config user.name "$(gh api user -q .name 2>/dev/null || gh api user -q .login)"
fi

git add -A
if git diff --cached --quiet 2>/dev/null && git rev-parse HEAD >/dev/null 2>&1; then
  echo "没有新的变更需要提交。"
else
  git commit -m "$(cat <<'EOF'
Initial commit: 空天信息资源中心任务管理原型

静态 React + Ant Design 页面，支持 GitHub Pages 部署。
EOF
)" || true
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --"${VISIBILITY}" --source=. --remote=origin --push
else
  git push -u origin "$BRANCH"
fi

gh api "repos/{owner}/${REPO_NAME}/pages" \
  -X POST \
  -f build_type=legacy \
  -f source[branch]="$BRANCH" \
  -f source[path]="/" 2>/dev/null \
  || gh api "repos/{owner}/${REPO_NAME}/pages" \
    -X PUT \
    -f build_type=legacy \
    -f source[branch]="$BRANCH" \
    -f source[path]="/"

OWNER="$(gh api user -q .login)"
PAGES_URL="https://${OWNER}.github.io/${REPO_NAME}/"

echo ""
echo "=========================================="
echo "  部署完成"
echo "  仓库: https://github.com/${OWNER}/${REPO_NAME}"
echo "  Pages: ${PAGES_URL}"
echo "  （首次开启 Pages 约 1–3 分钟生效）"
echo "=========================================="
