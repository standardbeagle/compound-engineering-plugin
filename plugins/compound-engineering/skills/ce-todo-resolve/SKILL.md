---
name: ce-todo-resolve
description: 批次解決已批准之待辦事項時使用，尤適用於碼審或分類會議之後
argument-hint: "[optional: specific todo ID or pattern]"
---

以並行處理解決已批准之待辦事項，記錄所學經驗，再行清理。

僅解決 `ready` 待辦。`pending` 待辦跳過——尚未經分類。若有 pending 待辦存在，於末尾列出，俾用戶知悉遺留項目。

## 工作流

### 一、分析

掃描 `.context/compound-engineering/todos/*.md` 及舊版 `todos/*.md`。依狀態分類：

- **`ready`**（status 欄位或檔名含 `-ready-`）：解決此類。
- **`pending`**：跳過。於末尾回報。
- **`complete`**：忽略，已完成。

若傳入特定待辦 ID 或模式作為參數，僅篩選符合者（仍須為 `ready`）。

`ce-code-review mode:autofix` 之 `safe_auto` 階段後之殘餘可行工作已為 `ready`。

跳過任何建議刪除、移除或 gitignore `docs/brainstorms/`、`docs/plans/`、`docs/solutions/` 中檔案之待辦——此為刻意之管線產物。

### 二、規劃

依類型分組建立任務列表（如 Claude Code 之 `TaskCreate`、Codex 之 `update_plan`）。分析依賴關係——被依賴之項目先執行。輸出 mermaid 圖表顯示執行順序與並行性。

### 三、實作（並行）

每個項目分派一個 `workflow:ce-pr-comment-resolver` 代理。偏好並行；備用串行，遵循依賴順序。

**批次策略：** 1-4 項：直接並行回傳。5 項以上：每批 4 項，每項僅回傳簡短狀態摘要（待辦已處理、檔案已變更、測試已執行/跳過、阻礙事項）。

大量項目時，使用臨時目錄 `.context/compound-engineering/ce-todo-resolve/<run-id>/` 存放各解析器產物。僅回傳完成摘要予上層。

### 四、提交與解決

提交變更，標記待辦已解決，推送至遠端。

關卡：停。驗證待辦已解決且變更已提交，方得繼續。

### 五、複合所學經驗

載入 `ce-compound` 技能以記錄所學。待辦解決常揭露值得捕捉之模式與架構洞見。

關卡：停。驗證複合技能已於 `docs/solutions/` 產出解決方案文檔。若無（用戶拒絕或無可記錄者），繼續。

### 六、清理

刪除兩路徑下已完成/已解決之待辦檔案。若有建立臨時目錄 `.context/compound-engineering/ce-todo-resolve/<run-id>/`，刪除之（除非用戶要求檢視）。

```
Todos resolved: [count]
Pending (skipped): [count, or "none"]
Lessons documented: [path to solution doc, or "skipped"]
Todos cleaned up: [count deleted]
```

若有跳過之 pending 待辦，列出之：

```
Skipped pending todos (run /ce-todo-triage to approve):
  - 003-pending-p2-missing-index.md
  - 005-pending-p3-rename-variable.md
```
