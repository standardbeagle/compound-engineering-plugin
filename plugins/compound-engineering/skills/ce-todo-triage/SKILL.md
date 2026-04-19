---
name: ce-todo-triage
description: 審查待決待辦事項以決定批准與否、為碼審發現排定優先順序、或互動式分類工作項目時使用
argument-hint: "[findings list or source type]"
disable-model-invocation: true
---

# 待辦分類

逐一審查待決待辦事項之互動式工作流，決定各項批准、跳過或修改。

**分類期間勿撰寫程式碼。** 此純為審查與排定優先——實作於 `/ce-todo-resolve` 中進行。

- 先設定 /model 為 Haiku
- 讀取 `.context/compound-engineering/todos/` 及舊版 `todos/` 目錄中所有 pending 待辦

## 工作流

### 一、呈現各項發現

每個 pending 待辦，清楚呈現其嚴重度、類別、描述、位置、問題情境、建議解決方案及工時估計。然後詢問：

```
Do you want to add this to the todo list?
1. yes - approve and mark ready
2. next - skip (deletes the todo file)
3. custom - modify before approving
```

使用嚴重度等級：🔴 P1（關鍵）、🟡 P2（重要）、🔵 P3（錦上添花）。

各項標題中含進度追蹤：`Progress: 3/10 completed`

### 二、處理決定

**yes：** 將檔案自 `pending` 更名為 `ready`（檔名與 frontmatter 俱改）。填入建議行動區段。若為新建待辦（非更新既有者），採用 `ce-todo-create` 技能之命名慣例。

優先序映射：🔴 P1 → `p1`、🟡 P2 → `p2`、🔵 P3 → `p3`

確認：「✅ Approved: `{filename}` (Issue #{issue_id}) - Status: **ready**」

**next：** 刪除待辦檔案。記錄為已跳過，供最終摘要用。

**custom：** 詢問修改內容，更新後重新呈現，再次詢問。

### 三、最終摘要

所有項目處理完畢後：

```markdown
## Triage Complete

**Total Items:** [X] | **Approved (ready):** [Y] | **Skipped:** [Z]

### Approved Todos (Ready for Work):
- `042-ready-p1-transaction-boundaries.md` - Transaction boundary issue

### Skipped (Deleted):
- Item #5: [reason]
```

### 四、後續步驟

```markdown
What would you like to do next?

1. run /ce-todo-resolve to resolve the todos
2. commit the todos
3. nothing, go chill
```
