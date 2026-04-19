---
name: ce-polish-beta
description: "[BETA] 啟動開發伺服器，於瀏覽器開啟功能，協同迭代改進。"
disable-model-invocation: true
argument-hint: "[PR number, branch name, or blank for current branch]"
---

# 潤飾

啟動開發伺服器，於瀏覽器開啟功能，迭代改進。用戶使用功能，指出不妥之處，即行修復。

## 階段零：切換至正確分支

1. 若提供 PR 號或分支名，切換至該分支（先探測既有 worktree）。
2. 若留空，使用當前分支。
3. 驗證當前分支非 main/master。

## 階段一：啟動開發伺服器

### 1.1 檢查 `.claude/launch.json`

執行 `bash scripts/read-launch-json.sh`。若找到配置，使用之——用戶已告知如何啟動專案。

### 1.2 自動偵測（無 launch.json 時）

執行 `bash scripts/detect-project-type.sh` 以識別框架。

依類型路由至對應配方參考，取得啟動指令與預設埠：

| 類型 | 配方 |
|------|--------|
| `rails` | `references/dev-server-rails.md` |
| `next` | `references/dev-server-next.md` |
| `vite` | `references/dev-server-vite.md` |
| `nuxt` | `references/dev-server-nuxt.md` |
| `astro` | `references/dev-server-astro.md` |
| `remix` | `references/dev-server-remix.md` |
| `sveltekit` | `references/dev-server-sveltekit.md` |
| `procfile` | `references/dev-server-procfile.md` |
| `unknown` | 詢問用戶如何啟動專案 |

需套件管理器之框架類型，執行 `bash scripts/resolve-package-manager.sh` 並將結果代入啟動指令。

以 `bash scripts/resolve-port.sh --type <type>` 解析埠。

### 1.3 啟動伺服器

背景啟動開發伺服器，輸出記錄至臨時檔案。探測 `http://localhost:<port>` 最長 30 秒。若未成功啟動，顯示日誌末 20 行並詢問用戶如何處理。

### 1.4 於瀏覽器開啟

載入 `references/ide-detection.md` 取得環境變數探測表。使用 IDE 機制開啟瀏覽器（Claude Code → `open`、Cursor → Cursor 瀏覽器、VS Code → Simple Browser）。

告知用戶：
```
Dev server running on http://localhost:<port>
Browse the feature and tell me what could be better.
```

## 階段二：迭代

此為核心循環。用戶瀏覽功能並指出需改進之處。修復之。重複直至滿意。

- 用戶描述需修復之處 → 修改，開發伺服器熱重載
- 用戶要求檢查 → 以 `agent-browser` 截圖或檢視頁面
- 用戶表示完成 → 提交修復並停止

無檢查清單。無封套。純對話。

## 參考檔案

參考檔案（按需載入）：
- `references/launch-json-schema.md` — launch.json 綱要 + 各框架範本
- `references/ide-detection.md` — 宿主 IDE 偵測與瀏覽器交接
- `references/dev-server-detection.md` — 埠解析文檔
- `references/dev-server-rails.md` — Rails 開發伺服器預設
- `references/dev-server-next.md` — Next.js 開發伺服器預設
- `references/dev-server-vite.md` — Vite 開發伺服器預設
- `references/dev-server-nuxt.md` — Nuxt 開發伺服器預設
- `references/dev-server-astro.md` — Astro 開發伺服器預設
- `references/dev-server-remix.md` — Remix 開發伺服器預設
- `references/dev-server-sveltekit.md` — SvelteKit 開發伺服器預設
- `references/dev-server-procfile.md` — Procfile 開發伺服器預設

腳本（以 `bash scripts/<name>` 執行）：
- `scripts/read-launch-json.sh` — launch.json 讀取器
- `scripts/detect-project-type.sh` — 專案類型分類器
- `scripts/resolve-package-manager.sh` — 基於鎖定檔之套件管理器解析器
- `scripts/resolve-port.sh` — 埠解析級聯
