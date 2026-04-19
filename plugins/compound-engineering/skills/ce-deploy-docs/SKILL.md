---
name: ce-deploy-docs
description: 驗證並準備文檔以部署至 GitHub Pages
disable-model-invocation: true
---

# 部署文檔指令

驗證文檔站點並準備 GitHub Pages 部署。

## 步驟一：驗證文檔

執行以下檢查：

```bash
# Count components
echo "Agents: $(ls plugins/compound-engineering/agents/*.md | wc -l)"
echo "Skills: $(ls -d plugins/compound-engineering/skills/*/ 2>/dev/null | wc -l)"

# Validate JSON
cat .claude-plugin/marketplace.json | jq . > /dev/null && echo "✓ marketplace.json valid"
cat plugins/compound-engineering/.claude-plugin/plugin.json | jq . > /dev/null && echo "✓ plugin.json valid"

# Check all HTML files exist
for page in index agents commands skills mcp-servers changelog getting-started; do
  if [ -f "plugins/compound-engineering/docs/pages/${page}.html" ] || [ -f "plugins/compound-engineering/docs/${page}.html" ]; then
    echo "✓ ${page}.html exists"
  else
    echo "✗ ${page}.html MISSING"
  fi
done
```

## 步驟二：檢查未提交變更

```bash
git status --porcelain plugins/compound-engineering/docs/
```

若有未提交變更，警告用戶先提交。

## 步驟三：部署指引

GitHub Pages 部署需要具特殊權限之工作流檔案，提供以下指引：

### 首次設定

1. 建立 `.github/workflows/deploy-docs.yml`，含 GitHub Pages 工作流
2. 前往倉庫 Settings > Pages
3. 設定 Source 為 "GitHub Actions"

### 部署

合併至 `main` 後，文檔將自動部署。或者：

1. 前往 Actions 標籤
2. 選擇 "Deploy Documentation to GitHub Pages"
3. 點擊 "Run workflow"

### 工作流檔案內容

```yaml
name: Deploy Documentation to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'plugins/compound-engineering/docs/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: 'plugins/compound-engineering/docs'
      - uses: actions/deploy-pages@v4
```

## 步驟四：回報狀態

提供摘要：

```
## Deployment Readiness

✓ All HTML pages present
✓ JSON files valid
✓ Component counts match

### Next Steps
- [ ] Commit any pending changes
- [ ] Push to main branch
- [ ] Verify GitHub Pages workflow exists
- [ ] Check deployment at https://everyinc.github.io/compound-engineering-plugin/
```
