---
name: ce-worktree
description: 此技能管理 Git worktree 以實現隔離之並行開發。以簡潔互動介面處理 worktree 之建立、列表、切換與清理，遵循 KISS 原則。
---

# Git Worktree 管理器

此技能提供跨開發工作流管理 Git worktree 之統一介面。無論是隔離審查 PR 或並行開發功能，此技能處理所有複雜性。

## 此技能做什麼

- **建立 worktree** 自主分支，附清晰分支名稱
- **列出 worktree** 及當前狀態
- **切換 worktree** 以進行並行工作
- **清理已完成之 worktree** 自動處理
- **互動確認** 每一步
- **自動 .gitignore 管理** worktree 目錄
- **自動 .env 檔案複製** 自主倉庫至新 worktree
- **自動開發工具信任** mise 與 direnv 配置，附審查安全護欄

## 要務：一律使用管理腳本

**絕不直接呼叫 `git worktree add`。** 一律使用 `worktree-manager.sh` 腳本。

腳本處理原生 git 指令不做之關鍵設定：
1. 自主倉庫複製 `.env`、`.env.local`、`.env.test` 等
2. 以分支感知安全規則信任開發工具配置：
   - mise：僅當與受信任基線分支相比未變更時方自動信任
   - direnv：僅為受信任基礎分支自動允許；審查 worktree 保持手動
3. 確保 `.worktrees` 在 `.gitignore` 中
4. 建立一致之目錄結構

```bash
# ✅ 正確 — 一律使用腳本
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh create feature-name

# ❌ 錯誤 — 絕不直接執行
git worktree add .worktrees/feature-name -b feature-name main
```

## 何時使用此技能

以下情境使用此技能：

1. **碼審（`/ce-code-review`）**：若尚未在目標分支（PR 分支或請求之分支）上，提供 worktree 以進行隔離審查
2. **功能開發（`/ce-work`）**：一律詢問用戶要並行 worktree 還是活分支工作
3. **並行開發**：同時處理多個功能時
4. **清理**：worktree 中工作完成後

## 使用方式

### 在 Claude Code 工作流中

技能自 `/ce-code-review` 與 `/ce-work` 指令自動呼叫：

```
# 審查：若不在 PR 分支上則提供 worktree
# 工作：一律詢問——新分支或 worktree？
```

### 手動使用

亦可直接自 bash 呼叫：

```bash
# 建立新 worktree（自動複製 .env 檔案）
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh create feature-login

# 列出所有 worktree
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh list

# 切換至 worktree
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh switch feature-login

# 複製 .env 檔案至既有 worktree（若先前未複製）
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh copy-env feature-login

# 清理已完成之 worktree
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh cleanup
```

## 指令

### `create <branch-name> [from-branch]`

以給定分支名建立新 worktree。

**選項：**
- `branch-name`（必要）：新分支與 worktree 之名稱
- `from-branch`（選填）：建立之基礎分支（預設 `main`）

**範例：**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh create feature-login
```

**會發生什麼：**
1. 檢查 worktree 是否已存在
2. 自遠端更新基礎分支
3. 建立新 worktree 與分支
4. **自主倉庫複製所有 .env 檔案**（.env、.env.local、.env.test 等）
5. **以分支感知安全規則信任開發工具配置：**
   - 受信任基礎（`main`、`develop`、`dev`、`trunk`、`staging`、`release/*`）與自身比較
   - 其他分支與預設分支比較
   - 非受信任基礎跳過 direnv 自動允許，因 `.envrc` 可能引用未檢查之檔案
6. 顯示 cd 至 worktree 之路徑

### `list` 或 `ls`

列出所有可用 worktree 及其分支與當前狀態。

**範例：**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh list
```

**輸出顯示：**
- Worktree 名稱
- 分支名稱
- 何者為當前（以 ✓ 標記）
- 主倉庫狀態

### `switch <name>` 或 `go <name>`

切換至既有 worktree 並 cd 進入。

**範例：**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh switch feature-login
```

**選填：**
- 若未提供名稱，列出可用 worktree 並提示選擇

### `cleanup` 或 `clean`

互動式清理非活躍之 worktree，需確認。

**範例：**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh cleanup
```

**會發生什麼：**
1. 列出所有非活躍之 worktree
2. 請求確認
3. 移除選定之 worktree
4. 清理空目錄

## 工作流範例

### 以 Worktree 進行碼審

```bash
# Claude Code 認出你不在 PR 分支上
# 提供："Use worktree for isolated review? (y/n)"

# 你回應：yes
# 腳本執行（自動複製 .env 檔案）：
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh create pr-123-feature-name

# 你現在在隔離 worktree 中審查，所有環境變數俱備
cd .worktrees/pr-123-feature-name

# 審查後返回主倉庫：
cd ../..
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh cleanup
```

### 並行功能開發

```bash
# 第一個功能（複製 .env 檔案）：
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh create feature-login

# 稍後，第二個功能（亦複製 .env 檔案）：
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh create feature-notifications

# 列出你有的：
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh list

# 依需切換：
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh switch feature-login

# 完成後返回主倉庫並清理：
cd .
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh cleanup
```

## 關鍵設計原則

### KISS（保持簡單）

- **一個管理腳本** 處理所有 worktree 操作
- **簡單指令** 附合理預設
- **互動提示** 防止意外操作
- **清晰命名** 直接使用分支名

### 意見預設

- Worktree 一律自 **main** 建立（除非指定）
- Worktree 存放於 **.worktrees/** 目錄
- 分支名即 worktree 名
- **.gitignore** 自動管理

### 安全第一

- **建立前確認** worktree
- **清理前確認** 以防意外移除
- **不會移除當前 worktree**
- **清晰錯誤訊息** 遇問題時

## 與工作流之整合

### `/ce-code-review`

非一律建立 worktree：

```
1. 檢查當前分支
2. 若已在目標分支（PR 分支或請求之分支）→ 留在該處，無需 worktree
3. 若與審查目標不同分支 → 提供 worktree：
   "Use worktree for isolated review? (y/n)"
   - yes → 呼叫 ce-worktree 技能
   - no → 以當前分支之 PR diff 繼續
```

### `/ce-work`

一律提供選擇：

```
1. 詢問："How do you want to work?
   1. New branch on current worktree (live work)
   2. Worktree (parallel work)"

2. 若選擇 1 → 正常建立新分支
3. 若選擇 2 → 呼叫 ce-worktree 技能自主分支建立
```

## 疑難排解

### "Worktree already exists"

若見此訊息，腳本會詢問是否改為切換至既有者。

### "Cannot remove worktree: it is the current worktree"

先切換出 worktree（至主倉庫），再清理：

```bash
cd $(git rev-parse --show-toplevel)
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh cleanup
```

### 在 worktree 中迷路？

看看在哪裡：

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh list
```

### Worktree 中缺少 .env 檔案？

若 worktree 未經 .env 檔案建立（如透過原生 `git worktree add`），複製之：

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/scripts/worktree-manager.sh copy-env feature-name
```

返回主倉庫：

```bash
cd $(git rev-parse --show-toplevel)
```

## 技術細節

### 目錄結構

```
.worktrees/
├── feature-login/          # Worktree 1
│   ├── .git
│   ├── app/
│   └── ...
├── feature-notifications/  # Worktree 2
│   ├── .git
│   ├── app/
│   └── ...
└── ...

.gitignore (updated to include .worktrees)
```

### 運作原理

- 使用 `git worktree add` 建立隔離環境
- 每個 worktree 有自己的分支
- 一個 worktree 中的變更不影響其他
- 與主倉庫共享 git 歷史
- 可自任何 worktree 推送

### 效能

- Worktree 輕量（僅檔案系統連結）
- 無倉庫複製
- 共享 git 物件以提高效率
- 比複製或暫存/切換快得多
