---
name: ce-test-browser
description: 對當前 PR 或分支所影響之頁面執行瀏覽器測試
argument-hint: "[PR number, branch name, 'current', or --port PORT]"
---

# 瀏覽器測試技能

使用 `agent-browser` CLI 對 PR 或分支變更所影響之頁面執行端對端瀏覽器測試。

## 瀏覽器自動化僅使用 `agent-browser`

此工作流專用 `agent-browser` CLI。勿使用任何替代之瀏覽器自動化系統、瀏覽器 MCP 整合或內建瀏覽器控制工具。若平台提供多種瀏覽器控制方式，一律選擇 `agent-browser`。

使用 `agent-browser` 進行：開啟頁面、點擊元素、填寫表單、截圖及抓取渲染內容。

平台特定提示：
- Claude Code 中勿使用 Chrome MCP 工具（`mcp__claude-in-chrome__*`）。
- Codex 中勿替代不相關之瀏覽工具。

## 前置條件

- 本地開發伺服器運行中（如 `bin/dev`、`rails server`、`npm run dev`）
- `agent-browser` CLI 已安裝（見下方設定）
- Git 倉庫含待測變更

## 設定

檢查 `agent-browser` 是否已安裝：

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Installed" || echo "NOT INSTALLED"
```

若未安裝，告知用戶：「`agent-browser` is not installed. Run `/ce-setup` to install required dependencies.」然後停止——此技能無 `agent-browser` 無法運作。

## 工作流

### 1. 驗證安裝

開始前驗證 `agent-browser` 可用：

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Ready" || echo "NOT INSTALLED"
```

若未安裝，告知用戶後停止。

### 2. 詢問瀏覽器模式

詢問用戶以有頭或無頭模式運行（使用平台之提問工具——如 Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`——或呈現選項並等候回覆）：

```
Do you want to watch the browser tests run?

1. Headed (watch) - Opens visible browser window so you can see tests run
2. Headless (faster) - Runs in background, faster but invisible
```

儲存選擇，用戶選選項 1 時使用 `--headed` 旗標。

### 3. 判斷測試範圍

**若提供 PR 號碼：**
```bash
gh pr view [number] --json files -q '.files[].path'
```

**若為 'current' 或空白：**
```bash
git diff --name-only main...HEAD
```

**若提供分支名：**
```bash
git diff --name-only main...[branch]
```

### 4. 映射檔案至路由

將變更檔案映射至可測試路由：

| 檔案模式 | 路由 |
|-------------|----------|
| `app/views/users/*` | `/users`, `/users/:id`, `/users/new` |
| `app/controllers/settings_controller.rb` | `/settings` |
| `app/javascript/controllers/*_controller.js` | 使用該 Stimulus controller 之頁面 |
| `app/components/*_component.rb` | 渲染該元件之頁面 |
| `app/views/layouts/*` | 所有頁面（至少測試首頁） |
| `app/assets/stylesheets/*` | 關鍵頁面之視覺回歸 |
| `app/helpers/*_helper.rb` | 使用該 helper 之頁面 |
| `src/app/*` (Next.js) | 對應路由 |
| `src/components/*` | 使用這些元件之頁面 |

依映射建立待測 URL 列表。

### 5. 偵測開發伺服器埠

依此優先順序判斷開發伺服器埠：

1. **明確參數** ——若用戶傳入 `--port 5000`，直接使用
2. **專案指引** ——檢查 `AGENTS.md`、`CLAUDE.md` 或其他指引檔中之埠參照
3. **package.json** ——檢查 dev/start 腳本中之 `--port` 旗標
4. **環境檔案** ——檢查 `.env`、`.env.local`、`.env.development` 中之 `PORT=`
5. **預設** ——回退為 `3000`

```bash
PORT="${EXPLICIT_PORT:-}"
if [ -z "$PORT" ]; then
  PORT=$(grep -Eio '(port\s*[:=]\s*|localhost:)([0-9]{4,5})' AGENTS.md 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
  if [ -z "$PORT" ]; then
    PORT=$(grep -Eio '(port\s*[:=]\s*|localhost:)([0-9]{4,5})' CLAUDE.md 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
  fi
fi
if [ -z "$PORT" ]; then
  PORT=$(grep -Eo '\-\-port[= ]+[0-9]{4,5}' package.json 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
fi
if [ -z "$PORT" ]; then
  PORT=$(grep -h '^PORT=' .env .env.local .env.development 2>/dev/null | tail -1 | cut -d= -f2)
fi
PORT="${PORT:-3000}"
echo "Using dev server port: $PORT"
```

### 6. 驗證伺服器運行中

```bash
agent-browser open http://localhost:${PORT}
agent-browser snapshot -i
```

若伺服器未運行，告知用戶：

```
Server not running on port ${PORT}

Please start your development server:
- Rails: `bin/dev` or `rails server`
- Node/Next.js: `npm run dev`
- Custom port: run this skill again with `--port <your-port>`

Then re-run this skill.
```

### 7. 測試每個受影響頁面

每個受影響路由：

**導航並擷取快照：**
```bash
agent-browser open "http://localhost:${PORT}/[route]"
agent-browser snapshot -i
```

**有頭模式：**
```bash
agent-browser --headed open "http://localhost:${PORT}/[route]"
agent-browser --headed snapshot -i
```

**驗證關鍵元素：**
- 使用 `agent-browser snapshot -i` 取得含參照之互動元素
- 頁面標題/標題存在
- 主要內容已渲染
- 無可見錯誤訊息
- 表單有預期欄位

**測試關鍵互動：**
```bash
agent-browser click @e1
agent-browser snapshot -i
```

**截圖：**
```bash
agent-browser screenshot page-name.png
agent-browser screenshot --full page-name-full.png
```

### 8. 人工驗證（需要時）

測試觸及需外部互動之流程時暫停等待人工輸入：

| 流程類型 | 該問什麼 |
|-----------|-------------|
| OAuth | "Please sign in with [provider] and confirm it works" |
| 電子郵件 | "Check your inbox for the test email and confirm receipt" |
| 支付 | "Complete a test purchase in sandbox mode" |
| 簡訊 | "Verify you received the SMS code" |
| 外部 API | "Confirm the [service] integration is working" |

詢問用戶（使用平台之提問工具，或呈現編號選項並等候）：

```
Human Verification Needed

This test touches [flow type]. Please:
1. [Action to take]
2. [What to verify]

Did it work correctly?
1. Yes - continue testing
2. No - describe the issue
```

### 9. 處理失敗

測試失敗時：

1. **記錄失敗：**
   - 截取錯誤狀態截圖：`agent-browser screenshot error.png`
   - 記錄確切重現步驟

2. **詢問用戶如何繼續：**

   ```
   Test Failed: [route]

   Issue: [description]
   Console errors: [if any]

   How to proceed?
   1. Fix now - I'll help debug and fix
   2. Create todo - Add a todo for later (using the todo-create skill)
   3. Skip - Continue testing other pages
   ```

3. **若 "Fix now"：** 調查、提出修復、套用、重新跑失敗測試
4. **若 "Create todo"：** 載入 `ce-todo-create` 技能建立優先序 p1、描述 `browser-test-{description}` 之待辦，繼續
5. **若 "Skip"：** 記錄為已跳過，繼續

### 10. 測試摘要

所有測試完成後，呈現摘要：

```markdown
## Browser Test Results

**Test Scope:** PR #[number] / [branch name]
**Server:** http://localhost:${PORT}

### Pages Tested: [count]

| Route | Status | Notes |
|-------|--------|-------|
| `/users` | Pass | |
| `/settings` | Pass | |
| `/dashboard` | Fail | Console error: [msg] |
| `/checkout` | Skip | Requires payment credentials |

### Console Errors: [count]
- [List any errors found]

### Human Verifications: [count]
- OAuth flow: Confirmed
- Email delivery: Confirmed

### Failures: [count]
- `/dashboard` - [issue description]

### Created Todos: [count]
- `005-pending-p1-browser-test-dashboard-error.md`

### Result: [PASS / FAIL / PARTIAL]
```

## 快速使用範例

```bash
# Test current branch changes (auto-detects port)
/ce-test-browser

# Test specific PR
/ce-test-browser 847

# Test specific branch
/ce-test-browser feature/new-dashboard

# Test on a specific port
/ce-test-browser --port 5000
```

## agent-browser CLI 參照

執行 `agent-browser --help` 查看所有指令。

關鍵指令：

```bash
# Navigation
agent-browser open <url>           # Navigate to URL
agent-browser back                 # Go back
agent-browser close                # Close browser

# Snapshots (get element refs)
agent-browser snapshot -i          # Interactive elements with refs (@e1, @e2, etc.)
agent-browser snapshot -i --json   # JSON output

# Interactions (use refs from snapshot)
agent-browser click @e1            # Click element
agent-browser fill @e1 "text"      # Fill input
agent-browser type @e1 "text"      # Type without clearing
agent-browser press Enter          # Press key

# Screenshots
agent-browser screenshot out.png       # Viewport screenshot
agent-browser screenshot --full out.png # Full page screenshot

# Headed mode (visible browser)
agent-browser --headed open <url>      # Open with visible browser
agent-browser --headed click @e1       # Click in visible browser

# Wait
agent-browser wait @e1             # Wait for element
agent-browser wait 2000            # Wait milliseconds
```
