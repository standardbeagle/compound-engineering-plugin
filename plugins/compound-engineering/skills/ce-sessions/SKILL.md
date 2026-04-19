---
name: ce-sessions
description: "搜尋並查詢程式碼代理對話歷史。適用於：詢問曾做何事、嘗試過什麼、跨對話如何調查問題、近期發生何事，或任何關於過去代理對話之提問。亦適用於用戶提及先前對話、先前嘗試或過往調查時——即使未明言'sessions'。"
---

# /ce-sessions

搜尋對話歷史。

## 用法

```
/ce-sessions [question or topic]
/ce-sessions
```

## 預解析上下文

**倉庫名稱（預解析）：** !`common=$(git rev-parse --git-common-dir 2>/dev/null); if [ "$common" = ".git" ]; then basename "$(git rev-parse --show-toplevel 2>/dev/null)"; else basename "$(dirname "$common")"; fi`

**Git 分支（預解析）：** !`git rev-parse --abbrev-ref HEAD 2>/dev/null`

若上述行已解析為純值（如 `my-repo` 之資料夾名與 `feat/my-branch` 之分支名），即可傳予代理。若仍含反引號指令字串或為空，則未解析成功——分派時省略，由代理於運行時自行推導。

## 執行

若未提供參數，詢問用戶欲查詢何事。使用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若無提問工具，以純文字發問並等候回覆。

分派 `research:ce-session-historian`，以用戶之提問作為任務提示。省略 `mode` 參數，俾用戶已配置之權限設定生效。分派提示中包含：

- 用戶之提問
- 當前工作目錄
- 預解析上下文之倉庫名與 git 分支（僅當已解析為純值時——勿傳遞字面指令字串）
