---
name: ce-setup
description: "診斷並配置 compound-engineering 環境。檢查 CLI 依賴、插件版本及倉庫本地配置。為缺失工具提供引導式安裝。適用於排除缺失工具、驗證設定或入門前。"
disable-model-invocation: true
---

# Compound Engineering 設定

## 互動方式

以下每個問題使用平台之阻塞式提問工具詢問用戶（如 Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若無結構化提問工具，以編號列表呈現各問題並等候回覆後方續。多選題接受逗號分隔之編號（如 `1, 3`）。勿跳過或自動配置。

compound-engineering 之互動式設定——診斷環境健康狀態、清理過時之倉庫本地 CE 配置，並協助配置所需工具。審查代理之選擇由 `ce-code-review` 自動處理；專案特定之審查指引應置於 `CLAUDE.md` 或 `AGENTS.md`。

## 階段一：診斷

### 步驟一：判斷插件版本

讀取插件元資料或清單以偵測已安裝之 compound-engineering 插件版本。此為平台特定——使用可用之任何機制（如自插件根目錄或快取目錄讀取 `plugin.json`）。若版本無法判定，跳過此步。

若找到版本，透過 `--version` 傳予檢查腳本。否則省略該旗標。

### 步驟二：執行健康檢查腳本

執行腳本前，顯示：「Compound Engineering -- checking your environment...」

執行內附之檢查腳本。勿手動檢查依賴——腳本一次處理所有 CLI 工具、倉庫本地 CE 檔案檢查及 `.gitignore` 指引。

```bash
bash scripts/check-health --version VERSION
```

或步驟一無法判定版本時：

```bash
bash scripts/check-health
```

腳本參照：`scripts/check-health`

將腳本輸出顯示予用戶。

### 步驟三：評估結果

**平台偵測（預解析）：** !`[ -n "${CLAUDE_PLUGIN_ROOT}" ] && echo "CLAUDE_CODE" || echo "OTHER"`

若上行解析為 `CLAUDE_CODE`，此為 Claude Code 對話，`/ce-update` 可用。否則，輸出中省略 `/ce-update` 參照。

診斷報告後，檢查是否：

- 有依賴缺失（腳本輸出中以黃色標示）
- `compound-engineering.local.md` 存在且需清理
- `.compound-engineering/config.local.yaml` 不存在或未安全 gitignore
- `.compound-engineering/config.local.example.yaml` 缺失或過時

若一切已安裝、無需倉庫本地清理、且 `.compound-engineering/config.local.yaml` 已存在並已 gitignore，顯示工具列表及完成訊息。自腳本輸出解析工具名稱，各附綠圈：

```
 ✅ Compound Engineering setup complete

    Tools: 🟢 agent-browser  🟢 gh  🟢 jq  🟢 vhs  🟢 silicon  🟢 ffmpeg
    Config: ✅

    Run /ce-setup anytime to re-check.
```

若為 Claude Code 對話，附上：「Run /ce-update to grab the latest plugin version.」

至此停止。

否則進入階段二解決問題。先處理倉庫本地清理（步驟四），再配置啟動（步驟五），最後缺失依賴（步驟六）。

## 階段二：修復

### 步驟四：解決倉庫本地 CE 問題

解析倉庫根目錄（`git rev-parse --show-toplevel`）。若 `compound-engineering.local.md` 存在於倉庫根目錄，解釋其已過時——審查代理選擇已自動化，CE 現以 `.compound-engineering/config.local.yaml` 存放機器本地狀態。詢問是否立即刪除。刪除時使用倉庫根路徑。

### 步驟五：啟動專案配置

解析倉庫根目錄（`git rev-parse --show-toplevel`）。以下所有路徑相對於倉庫根目錄，非當前工作目錄。

**範例檔（一律更新）：** 複製 `references/config-template.yaml` 至 `<repo-root>/.compound-engineering/config.local.example.yaml`，必要時建立目錄。此檔提交至倉庫，一律以最新模板覆寫，俾團隊成員可見可用設定。

**本地配置（建立一次）：** 若 `.compound-engineering/config.local.yaml` 不存在，詢問是否建立：

```
Set up a local config file for this project?
This saves your Compound Engineering preferences (like which tools to use and how workflows behave).
Everything starts commented out -- you only enable what you need.

1. Yes, create it (Recommended)
2. No thanks
```

若用戶同意，複製 `references/config-template.yaml` 至 `<repo-root>/.compound-engineering/config.local.yaml`。若 `.compound-engineering/config.local.yaml` 未被 `.gitignore` 涵蓋，提議加入條目：

```text
.compound-engineering/*.local.yaml
```

若本地配置已存在，檢查是否已安全 gitignore。若未，提議加入上述 `.gitignore` 條目。

### 步驟六：提供安裝

以多選題呈現缺失依賴，所有項目預選。使用腳本診斷輸出中之安裝指令與 URL。

```
The following tools are missing. Select which to install:
(All items are pre-selected)

Recommended:
  [x] agent-browser - Browser automation for testing and screenshots
  [x] gh - GitHub CLI for issues and PRs
  [x] jq - JSON processor
  [x] vhs (charmbracelet/vhs) - Create GIFs from CLI output
  [x] silicon (Aloxaf/silicon) - Generate code screenshots
  [x] ffmpeg - Video processing for feature demos
```

僅顯示實際缺失之依賴。已安裝者省略。

### 步驟七：安裝所選依賴

依序安裝每個所選依賴：

1. **顯示安裝指令**（自診斷輸出）並請求批准：

   ```
   Install agent-browser?
   Command: CI=true npm install -g agent-browser --no-audit --no-fund --loglevel=error && agent-browser install && npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser -g -y

   1. Run this command
   2. Skip - I'll install it manually
   ```

2. **若獲批准：** 以 shell 執行工具執行安裝指令。指令完成後，以依賴之檢查指令（如 `command -v agent-browser`）驗證安裝。

3. **若驗證成功：** 回報成功。

4. **若驗證失敗或安裝出錯：** 顯示專案 URL 作為後備，繼續下一個依賴。

### 步驟八：摘要

顯示簡要摘要：

```
 ✅ Compound Engineering setup complete

    Installed: agent-browser, gh, jq
    Skipped:   rtk

    Run /ce-setup anytime to re-check.
```

若為 Claude Code 對話（依步驟三之平台偵測），附上：「Run /ce-update to grab the latest plugin version.」
