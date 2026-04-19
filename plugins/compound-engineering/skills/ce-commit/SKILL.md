---
name: ce-commit
description: 以清晰、傳達價值之訊息建立 git 提交。適用於用戶說「commit」、「commit this」、「save my changes」、「create a commit」或欲提交已暫存/未暫存之工作。產出結構良好之提交訊息，遵循既有倉庫慣例，無則預設採用慣例提交格式。
---

# Git 提交

自當前工作樹變更建立單一、精心撰寫之 git 提交。

## 上下文

**若非 Claude Code**，跳至下方「上下文後備」區段並執行其中指令以收集上下文。

**若為 Claude Code**，下方五段標記區段（Git 狀態、工作樹差異、當前分支、近期提交、遠端預設分支）含預填資料。直接使用——勿重新執行這些指令。

**Git 狀態：**
!`git status`

**工作樹差異：**
!`git diff HEAD`

**當前分支：**
!`git branch --show-current`

**近期提交：**
!`git log --oneline -10`

**遠端預設分支：**
!`git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo '__DEFAULT_BRANCH_UNRESOLVED__'`

### 上下文後備

**若為 Claude Code，跳過此區段——上方資料已可用。**

執行此單一指令以收集所有上下文：

```bash
printf '=== STATUS ===\n'; git status; printf '\n=== DIFF ===\n'; git diff HEAD; printf '\n=== BRANCH ===\n'; git branch --show-current; printf '\n=== LOG ===\n'; git log --oneline -10; printf '\n=== DEFAULT_BRANCH ===\n'; git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo '__DEFAULT_BRANCH_UNRESOLVED__'
```

---

## 工作流

### 步驟一：收集上下文

使用上方上下文（git 狀態、工作樹差異、當前分支、近期提交、遠端預設分支）。此步所需之資料皆已備——勿重新執行那些指令。

遠端預設分支值回傳如 `origin/main`。去除 `origin/` 前綴以取分支名。若回傳 `__DEFAULT_BRANCH_UNRESOLVED__` 或純 `HEAD`，嘗試：

```bash
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
```

若兩者皆失敗，回退為 `main`。

若上方上下文之 git 狀態顯示工作樹乾淨（無暫存、修改或未追蹤檔案），回報無可提交並停止。

若上方上下文之當前分支為空，倉庫處於分離 HEAD 狀態。解釋若用戶欲將工作附著於分支，需先建立分支。詢問是否立即建立功能分支。使用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若無提問工具，呈現選項並等候用戶回覆後方續。

- 若用戶選擇建立分支，自變更內容推導名稱，以 `git checkout -b <branch-name>` 建立之，再執行 `git branch --show-current`，以其結果作為後續工作流之當前分支名。
- 若用戶拒絕，以分離 HEAD 繼續提交。

### 步驟二：判斷提交訊息慣例

依此優先順序：

1. **上下文中已有之倉庫慣例**——若專案指引（AGENTS.md、CLAUDE.md 等）已載入並載明提交訊息慣例，遵循之。勿重新讀取這些檔案；其於對話啟始時已載入。
2. **近期提交歷史**——若無明確慣例，檢視步驟一之最近 10 筆提交。若浮現清晰模式（如慣例提交、工單前綴、表情符號前綴），匹配之。
3. **預設：慣例提交**——若皆未提供模式，使用慣例提交格式：`type(scope): description`，其中 type 為 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`perf`、`ci`、`style`、`build` 之一。

### 步驟三：考慮邏輯提交

暫存所有內容前，掃描變更檔案以辨識自然分離之關注點。若修改之檔案明顯分屬不同邏輯變更（如一目錄中之重構與另一目錄中之新功能，或測試檔案屬於不同於源碼檔案之變更），為各組分別建立提交。

保持輕量：
- 僅以**檔案層級**分組——勿使用 `git add -p` 或嘗試分割檔案內之 hunk。
- 若分離顯而易見（不同功能、不相關修復），則拆分。若模糊，一個提交即可。
- 二至三個邏輯提交為佳。勿過度切割為許多微小提交。

### 步驟四：暫存並提交

若上方上下文之當前分支為 `main`、`master` 或步驟一解析之預設分支，警告用戶並詢問是否繼續在此提交或先建立功能分支。使用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若無提問工具，呈現選項並等候用戶回覆後方續。若用戶選擇建立分支，自變更內容推導名稱，以 `git checkout -b <branch-name>` 建立之，再繼續。

撰寫提交訊息：
- **主旨行**：簡潔，祈使語氣，聚焦於*為何*而非*什麼*。遵循步驟二所定之慣例。
- **正文**（必要時）：對非顯而易見之變更，以空行分隔加入正文，解釋動機、取捨或未來讀者所需之資訊。顯而易見之單一目的變更省略正文。

每個提交群組，以單一呼叫暫存並提交。偏好以檔名指定暫存，避免 `git add -A` 或 `git add .`，以防意外包含敏感檔案（.env、credentials）或無關變更。使用 heredoc 保持格式：

```bash
git add file1 file2 file3 && git commit -m "$(cat <<'EOF'
type(scope): subject line here

Optional body explaining why this change was made,
not just what changed.
EOF
)"
```

### 步驟五：確認

提交後執行 `git status` 以驗證成功。回報提交雜湊值與主旨行。
