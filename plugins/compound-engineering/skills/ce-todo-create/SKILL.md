---
name: ce-todo-create
description: 建立持久工作項目、管理待辦生命週期、或跨對話追蹤發現時使用，適用於檔案式待辦系統
disable-model-invocation: true
---

# 檔案式待辦追蹤

## 概述

`.context/compound-engineering/todos/` 目錄為檔案式追蹤系統，用於碼審回饋、技術債務、功能請求及工作項目。每筆待辦為一含 YAML frontmatter 之 markdown 檔案。

> **舊版支援：** 讀取時須同時檢查 `.context/compound-engineering/todos/`（正規）與 `todos/`（舊版）。新待辦僅寫入正規路徑。此目錄具跨對話生命週期——勿視為臨時空間而清理。

## 目錄路徑

| 用途 | 路徑 |
|---------|------|
| **正規（寫入此處）** | `.context/compound-engineering/todos/` |
| **舊版（唯讀）** | `todos/` |

## 檔案命名慣例

```
{issue_id}-{status}-{priority}-{description}.md
```

- **issue_id**：序號（001, 002, ...）——永不複用
- **status**：`pending` | `ready` | `complete`
- **priority**：`p1`（關鍵）| `p2`（重要）| `p3`（錦上添花）
- **description**：kebab-case，簡要

**範例：** `002-ready-p1-fix-n-plus-1.md`

## 檔案結構

每筆待辦含 YAML frontmatter 及結構化區段。建立新待辦時使用下方所附之待辦模板。

```yaml
---
status: ready
priority: p1
issue_id: "002"
tags: [rails, performance]
dependencies: ["001"]     # Issue IDs this is blocked by
---
```

**必要區段：** 問題陳述、發現、建議解決方案、建議行動（分類時填入）、驗收標準、工作日誌。

**選填區段：** 技術細節、資源、備註。

## 工作流

> **工具偏好：** 尋找與讀取待辦檔案時，使用原生檔案搜尋/glob 及內容搜尋工具，而非 shell 指令。Shell 僅用於無原生對應之作業（`mv`、`mkdir -p`）。

### 建立新待辦

1. `mkdir -p .context/compound-engineering/todos/`
2. 搜尋兩路徑中 `[0-9]*-*.md`，找出最高數字前綴，遞增，補零至三位。
3. 使用下方所附之待辦模板，寫入正規路徑為 `{NEXT_ID}-pending-{priority}-{description}.md`。
4. 填入問題陳述、發現、建議解決方案、驗收標準及初始工作日誌條目。
5. 設定狀態：`pending`（待分類）或 `ready`（預先批准）。

**建立待辦之時機**：工作需超過約 15 分鐘、有依賴關係、需規劃或需排定優先時。**立即處理之時機**：修復顯而易見、自足且瑣碎時。

### 分類待決項目

1. 於兩路徑 glob `*-pending-*.md`。
2. 審查每筆待辦之問題陳述、發現及建議解決方案。
3. 批准：於檔名與 frontmatter 中將 `pending` 更名為 `ready`，填入建議行動。
4. 延後：保持 `pending`。

載入 `ce-todo-triage` 技能以進行互動式批准工作流。

### 管理依賴關係

```yaml
dependencies: ["002", "005"]  # Blocked by these issues
dependencies: []               # No blockers
```

檢查阻礙：於兩路徑搜尋 `{dep_id}-complete-*.md`。未找到匹配 = 阻礙未完成。

### 完成待辦

1. 驗證所有驗收標準。
2. 更新工作日誌記錄最終對話。
3. 於檔名與 frontmatter 中將 `ready` 更名為 `complete`。
4. 檢查已解除阻礙之工作：搜尋含 `dependencies:.*"{issue_id}"` 之檔案。

## 與工作流之整合

| 觸發 | 流程 |
|---------|------|
| 碼審 | `/ce-code-review` → 發現 → `/ce-todo-triage` → 待辦 |
| 自主審查 | `/ce-code-review mode:autofix` → 殘餘待辦 → `/ce-todo-resolve` |
| 程式碼 TODO | `/ce-todo-resolve` → 修復 + 複雜待辦 |
| 規劃 | 腦力激盪 → 建立待辦 → 動工 → 完成 |

## 核心區別

此技能管理**持久、跨對話之工作項目**，以 markdown 檔案留存。對於臨時之對話內步驟追蹤，使用平台任務工具（Claude Code 之 `TaskCreate`/`TaskUpdate`、Codex 之 `update_plan`）。

---

## 待辦模板

@./assets/todo-template.md
