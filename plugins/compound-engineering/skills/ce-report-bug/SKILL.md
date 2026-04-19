---
name: ce-report-bug
description: 回報 compound-engineering 插件之錯誤
argument-hint: "[optional: brief description of the bug]"
disable-model-invocation: true
---

# 回報 Compound Engineering 插件錯誤

回報使用 compound-engineering 插件時遭遇之錯誤。此技能收集結構化資訊並建立 GitHub 議題供維護者處理。

## 步驟一：收集錯誤資訊

向用戶詢問以下問題（使用平台之阻塞式提問工具——如 Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`——或呈現編號選項並等候回覆）：

**問題一：錯誤類別**
- 遭遇何種問題？
- 選項：代理無法運作、指令無法運作、技能無法運作、MCP 伺服器問題、安裝問題、其他

**問題二：特定組件**
- 哪個特定組件受影響？
- 詢問代理、指令、技能或 MCP 伺服器之名稱

**問題三：實際行為**
- 詢問：「使用此組件時發生了什麼？」
- 取得實際行為之清楚描述

**問題四：預期行為**
- 詢問：「預期應發生什麼？」
- 取得預期行為之清楚描述

**問題五：重現步驟**
- 詢問：「錯誤發生前執行了哪些步驟？」
- 取得重現步驟

**問題六：錯誤訊息**
- 詢問：「是否看到任何錯誤訊息？若有，請分享。」
- 捕捉任何錯誤輸出

## 步驟二：收集環境資訊

自動收集環境細節。偵測程式碼代理平台並收集可用資訊：

**OS 資訊（所有平台）：**
```bash
uname -a
```

**插件版本：** 讀取插件清單或已安裝插件元資料。常見位置：
- Claude Code：`~/.claude/plugins/installed_plugins.json`
- Codex：`.codex/plugins/` 或專案配置
- 其他平台：檢查平台之插件註冊表

**代理 CLI 版本：** 執行平台之版本指令：
- Claude Code：`claude --version`
- Codex：`codex --version`
- 其他平台：使用適當之 CLI 版本旗標

若任何一項失敗，記錄 "unknown" 並繼續——勿阻塞回報。

## 步驟三：格式化錯誤回報

建立結構良好之錯誤回報：

```markdown
## Bug Description

**Component:** [Type] - [Name]
**Summary:** [Brief description from argument or collected info]

## Environment

- **Plugin Version:** [from plugin manifest/registry]
- **Agent Platform:** [e.g., Claude Code, Codex, Copilot, Pi, Kilo]
- **Agent Version:** [from CLI version command]
- **OS:** [from uname]

## What Happened

[Actual behavior description]

## Expected Behavior

[Expected behavior description]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Error Messages

[Any error output]

## Additional Context

[Any other relevant information]

---
*Reported via `/ce-report-bug` skill*
```

## 步驟四：建立 GitHub 議題

使用 GitHub CLI 建立議題：

```bash
gh issue create \
  --repo EveryInc/compound-engineering-plugin \
  --title "[compound-engineering] Bug: [Brief description]" \
  --body "[Formatted bug report from Step 3]" \
  --label "bug,compound-engineering"
```

**注意：** 若標籤不存在，不帶標籤建立：
```bash
gh issue create \
  --repo EveryInc/compound-engineering-plugin \
  --title "[compound-engineering] Bug: [Brief description]" \
  --body "[Formatted bug report]"
```

## 步驟五：確認提交

議題建立後：
1. 向用戶顯示議題 URL
2. 感謝回報
3. 告知維護者（Kieran Klaassen）將收到通知

## 輸出格式

```
Bug report submitted successfully!

Issue: https://github.com/EveryInc/compound-engineering-plugin/issues/[NUMBER]
Title: [compound-engineering] Bug: [description]

Thank you for helping improve the compound-engineering plugin!
The maintainer will review your report and respond as soon as possible.
```

## 錯誤處理

- 若 `gh` CLI 未安裝或未認證：提示用戶先安裝/認證
- 若議題建立失敗：顯示格式化之回報，俾用戶手動建立議題
- 若缺必要資訊：重新提示該特定欄位

## 隱私聲明

此技能**不**收集：
- 個人資訊
- API 金鑰或憑證
- 專案中之私有程式碼
- 超出基本 OS 資訊之檔案路徑

回報中僅包含關於錯誤之技術資訊。
