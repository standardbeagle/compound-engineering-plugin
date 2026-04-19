---
name: ce-test-xcode
description: "使用 XcodeBuildMCP 在模擬器上建構並測試 iOS 應用。適用於修改 iOS 程式碼後、建立 PR 前或驗證應用行為及檢查模擬器崩潰。"
argument-hint: "[scheme name or 'current' to use default]"
disable-model-invocation: true
---

# Xcode 測試技能

使用 XcodeBuildMCP 在模擬器上建構、安裝並測試 iOS 應用。擷取截圖、日誌並驗證應用行為。

## 前置條件

- 已安裝 Xcode 含命令列工具
- XcodeBuildMCP MCP 伺服器已連線
- 有效之 Xcode 專案或 workspace
- 至少一個 iOS 模擬器可用

## 工作流

### 0. 驗證 XcodeBuildMCP 可用

呼叫其 `list_simulators` 工具以檢查 XcodeBuildMCP MCP 伺服器是否已連線。

MCP 工具名稱依平台而異：
- Claude Code：`mcp__xcodebuildmcp__list_simulators`
- 其他平台：使用 `XcodeBuildMCP` 伺服器之 `list_simulators` 方法的等效 MCP 工具呼叫

若工具未找到或出錯，告知用戶需添加 XcodeBuildMCP MCP 伺服器：

```
XcodeBuildMCP not installed

Install via Homebrew:
  brew tap getsentry/xcodebuildmcp && brew install xcodebuildmcp

Or via npx (no global install needed):
  npx -y xcodebuildmcp@latest mcp

Then add "XcodeBuildMCP" as an MCP server in your agent configuration
and restart your agent.
```

XcodeBuildMCP 確認可用前勿繼續。

### 1. 發現專案與 Scheme

呼叫 XcodeBuildMCP 之 `discover_projs` 工具尋找可用專案，再以專案路徑呼叫 `list_schemes` 取得可用 scheme。

若提供了參數，使用該 scheme 名稱。若為 "current"，使用預設/最近使用之 scheme。

### 2. 啟動模擬器

呼叫 `list_simulators` 尋找可用模擬器。以模擬器之 UUID 使用 `boot_simulator` 啟動偏好模擬器（推薦 iPhone 15 Pro）。

等待模擬器就緒後方繼續。

### 3. 建構應用

以專案路徑與 scheme 名稱呼叫 `build_ios_sim_app`。

**失敗時：**
- 擷取建構錯誤
- 為每個建構錯誤建立 P1 待辦
- 向用戶回報具體錯誤細節

**成功時：**
- 記錄已建構之應用路徑供安裝用
- 進入步驟四

### 4. 安裝與啟動

1. 以已建構之應用路徑與模擬器 UUID 呼叫 `install_app_on_simulator`
2. 以 bundle ID 與模擬器 UUID 呼叫 `launch_app_on_simulator`
3. 以模擬器 UUID 與 bundle ID 呼叫 `capture_sim_logs` 開始日誌擷取

### 5. 測試關鍵畫面

應用中每個關鍵畫面：

**截圖：**
以模擬器 UUID 及描述性檔名（如 `screen-home.png`）呼叫 `take_screenshot`。

**審查截圖：**
- UI 元素正確渲染
- 無可見錯誤訊息
- 顯示預期內容
- 佈局看起來正確

**檢查日誌中之錯誤：**
以模擬器 UUID 呼叫 `get_sim_logs`。尋找：
- 崩潰
- 異常
- 錯誤級日誌訊息
- 失敗之網路請求

**已知自動化限制——SwiftUI Text 連結：**
模擬點擊（透過 XcodeBuildMCP 或任何模擬器自動化工具）不會觸發 SwiftUI `Text` 視圖中行內 `AttributedString` 連結之手勢識別器。點擊回報成功但無效果。此為平台限制——行內連結未作為獨立元素暴露於無障礙樹中。當 Text 連結上的點擊無可見效果時，提示用戶在模擬器上手動點擊。若目標 URL 已知，`xcrun simctl openurl <device> <URL>` 可作為後備直接開啟。

### 6. 人工驗證（需要時）

測試觸及需要裝置互動之流程時暫停等待人工輸入。

| 流程類型 | 該問什麼 |
|-----------|-------------|
| Sign in with Apple | "Please complete Sign in with Apple on the simulator" |
| 推送通知 | "Send a test push and confirm it appears" |
| 應用內購買 | "Complete a sandbox purchase" |
| 相機/照片 | "Grant permissions and verify camera works" |
| 定位 | "Allow location access and verify map updates" |
| SwiftUI Text 連結 | "Please tap on [element description] manually — automated taps cannot trigger inline text links" |

詢問用戶（使用平台之提問工具——如 Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`——或呈現編號選項並等候）：

```
Human Verification Needed

This test requires [flow type]. Please:
1. [Action to take on simulator]
2. [What to verify]

Did it work correctly?
1. Yes - continue testing
2. No - describe the issue
```

### 7. 處理失敗

測試失敗時：

1. **記錄失敗：**
   - 截取錯誤狀態之截圖
   - 擷取主控台日誌
   - 記錄重現步驟

2. **詢問用戶如何繼續：**

   ```
   Test Failed: [screen/feature]

   Issue: [description]
   Logs: [relevant error messages]

   How to proceed?
   1. Fix now - I'll help debug and fix
   2. Create todo - Add a todo for later (using the todo-create skill)
   3. Skip - Continue testing other screens
   ```

3. **若 "Fix now"：** 調查、提出修復、重建並重新測試
4. **若 "Create todo"：** 載入 `ce-todo-create` 技能並建立優先序 p1、描述 `xcode-{description}` 之待辦，繼續
5. **若 "Skip"：** 記錄為已跳過，繼續

### 8. 測試摘要

所有測試完成後，呈現摘要：

```markdown
## Xcode Test Results

**Project:** [project name]
**Scheme:** [scheme name]
**Simulator:** [simulator name]

### Build: Success / Failed

### Screens Tested: [count]

| Screen | Status | Notes |
|--------|--------|-------|
| Launch | Pass | |
| Home | Pass | |
| Settings | Fail | Crash on tap |
| Profile | Skip | Requires login |

### Console Errors: [count]
- [List any errors found]

### Human Verifications: [count]
- Sign in with Apple: Confirmed
- Push notifications: Confirmed

### Failures: [count]
- Settings screen - crash on navigation

### Created Todos: [count]
- `006-pending-p1-xcode-settings-crash.md`

### Result: [PASS / FAIL / PARTIAL]
```

### 9. 清理

測試後：

1. 以模擬器 UUID 呼叫 `stop_log_capture`
2. 可選以模擬器 UUID 呼叫 `shutdown_simulator`

## 快速使用範例

```bash
# Test with default scheme
/ce-test-xcode

# Test specific scheme
/ce-test-xcode MyApp-Debug

# Test after making changes
/ce-test-xcode current
```

## 與 ce-code-review 之整合

審查觸及 iOS 程式碼之 PR 時，`ce-code-review` 工作流可分派代理執行此技能、在模擬器上建構、測試關鍵畫面並檢查崩潰。
