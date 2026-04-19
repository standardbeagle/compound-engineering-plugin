---
name: ce-clean-gone-branches
description: 清理遠端追蹤分支已消失之本地分支。適用於用戶說「clean up branches」、「delete gone branches」、「prune local branches」、「clean gone」或欲移除遠端已不存在之陳舊本地分支。亦處理分支之相關 worktree 移除。
---

# 清理已消失分支

刪除遠端追蹤分支已被刪除之本地分支，含相關聯之 worktree。

## 工作流

### 步驟一：探索已消失分支

執行探索腳本以取得最新遠端狀態並識別已消失分支：

```bash
bash scripts/clean-gone
```

[scripts/clean-gone](./scripts/clean-gone)

腳本先執行 `git fetch --prune`，再解析 `git branch -vv` 中標記 `: gone]` 之分支。

若腳本輸出 `__NONE__`，回報無陳舊分支並停止。

### 步驟二：呈現分支並請求確認

向用戶展示將刪除之分支列表。格式如下：

```
These local branches have been deleted from the remote:

  - feature/old-thing
  - bugfix/resolved-issue
  - experiment/abandoned

Delete all of them? (y/n)
```

使用平台之提問工具等候用戶回答（如 Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若無提問工具，呈現列表並等候用戶回覆後方續。

此為對整份列表之是/否決定——勿提供多選或逐分支選項。

### 步驟三：刪除已確認分支

若用戶確認，逐一刪除各分支。每個分支：

1. 檢查是否有關聯 worktree（`git worktree list | grep "\\[$branch\\]"`）
2. 若 worktree 存在且非主倉庫根目錄，先移除之：`git worktree remove --force "$worktree_path"`
3. 刪除分支：`git branch -D "$branch"`

逐項回報結果：

```
Removed worktree: .worktrees/feature/old-thing
Deleted branch: feature/old-thing
Deleted branch: bugfix/resolved-issue
Deleted branch: experiment/abandoned

Cleaned up 3 branches.
```

若用戶拒絕，確認並停止，不作任何刪除。
