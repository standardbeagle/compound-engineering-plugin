---
name: ce-commit-push-pr
description: 提交、推送並開啟附自適應價值優先描述之 PR。適用於用戶說「commit and PR」、「push and open a PR」、「ship this」、「create a PR」、「open a pull request」、「commit push PR」或欲從工作變更一步至開放拉取請求。亦適用於用戶說「update the PR description」、「refresh the PR description」、「freshen the PR」或欲重寫既有 PR 描述。產出之 PR 描述深度隨變更複雜度伸縮，避免千篇一律之模板。
---

# Git 提交、推送與 PR

從工作變更到開放拉取請求，或重寫既有 PR 描述。

**詢問用戶：** 當此技能說「詢問用戶」時，使用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若不可用，呈現問題並等候回覆。

## 模式偵測

若用戶要求更新、刷新或重寫既有 PR 描述（未提及提交或推送），此為**僅描述更新**。用戶亦可提供焦點（如「update the PR description and add the benchmarking results」）。記錄任何焦點供 DU-3 使用。

僅描述更新時，遵循下方之描述更新工作流。否則遵循完整工作流。

## 上下文

**若非 Claude Code**，跳至下方「上下文後備」區段並執行其中指令以收集上下文。

**若為 Claude Code**，下方六段標記區段含預填資料。直接使用——勿重新執行這些指令。

**Git 狀態：**
!`git status`

**工作樹差異：**
!`git diff HEAD`

**當前分支：**
!`git branch --show-current`

**近期提交：**
!`git log --oneline -10`

**遠端預設分支：**
!`git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo 'DEFAULT_BRANCH_UNRESOLVED'`

**既有 PR 檢查：**
!`gh pr view --json url,title,state 2>/dev/null || echo 'NO_OPEN_PR'`

### 上下文後備

**若為 Claude Code，跳過此區段——上方資料已可用。**

執行此單一指令以收集所有上下文：

```bash
printf '=== STATUS ===\n'; git status; printf '\n=== DIFF ===\n'; git diff HEAD; printf '\n=== BRANCH ===\n'; git branch --show-current; printf '\n=== LOG ===\n'; git log --oneline -10; printf '\n=== DEFAULT_BRANCH ===\n'; git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo 'DEFAULT_BRANCH_UNRESOLVED'; printf '\n=== PR_CHECK ===\n'; gh pr view --json url,title,state 2>/dev/null || echo 'NO_OPEN_PR'
```

---

## 描述更新工作流

### DU-1：確認意圖

詢問用戶：「Update the PR description for this branch?」若拒絕，停止。

### DU-2：找到 PR

使用當前分支與上下文中之既有 PR 檢查。若當前分支為空（分離 HEAD），回報無分支並停止。若 PR 檢查回傳 `state: OPEN`，記下上下文區塊中 PR 的 `url`——此為傳遞予下游之明確參照——並進入 DU-3。否則回報無開放 PR 並停止。

### DU-3：撰寫並套用更新後之描述

讀取當前 PR 描述以驅動後續之比較與確認：

```bash
gh pr view --json body --jq '.body'
```

**生成更新後之標題與正文**——載入 `ce-pr-description` 技能，傳入 DU-2 之 PR URL（如 `https://github.com/owner/repo/pull/123`）。URL 保留倉庫/PR 身份，即使從 worktree 或子目錄調用亦然。若用戶提供了焦點（如「include the benchmarking results」），以自由文字引導附加於 URL 後。技能回傳 `{title, body_file}` 區塊（正文在 OS 臨時檔案中）而不套用或提示。

若 `ce-pr-description` 回傳「not open」或其他優雅退出訊息而非 `{title, body_file}` 對，回報該訊息並停止。

**證據決策：** `ce-pr-description` 預設保留當前正文中任何既有之 `## Demo` 或 `## Screenshots` 區塊。若用戶之焦點要求刷新或移除證據，將該意圖作為引導文字傳遞——技能將遵循。若無證據區塊且有助於讀者，另啟 `ce-demo-reel` 擷取後重新調用 `ce-pr-description` 並附參照已擷取證據之更新引導。

**比較並確認**——簡要解釋新描述與舊描述有何不同。這幫助用戶決定是否套用；描述本身不解說這些差異。從已於上下文中之正文摘要（來自寫入 `body_file` 之 bash 呼叫）；勿 `cat` 臨時檔案，因那會重新輸出正文。

- 若用戶提供了焦點，確認已處理。
- 套用前詢問用戶確認。

**若確認，依序執行以下兩項動作。** 它們是獨立步驟，之間有交接邊界——勿在動作 1 後停止。

1. `ce-pr-description` 已回傳其 `=== TITLE ===` / `=== BODY_FILE ===` 區塊並停止；其不自行套用。
2. 自行套用回傳之標題與正文檔案。此為此技能之責任，非被委派技能者。逐字代入回傳區塊中之 `<TITLE>` 與 `<BODY_FILE>`；若 `<TITLE>` 含 `"`、`` ` ``、`$` 或 `\`，轉義之或改用單引號：

   ```bash
   gh pr edit --title "<TITLE>" --body "$(cat "<BODY_FILE>")"
   ```

回報 PR URL。

---

## 完整工作流

### 步驟一：收集上下文

使用上方上下文。此步與步驟三所需之資料皆已備——勿重新執行那些指令。

遠端預設分支值回傳如 `origin/main`。去除 `origin/` 前綴。若回傳 `DEFAULT_BRANCH_UNRESOLVED` 或純 `HEAD`，嘗試：

```bash
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
```

若兩者皆失敗，回退為 `main`。

若當前分支為空（分離 HEAD），解釋需要分支。詢問是否立即建立功能分支。
- 若是，自變更內容推導分支名，以 `git checkout -b <branch-name>` 建立之，並用於後續工作流。
- 若否，停止。

若工作樹乾淨（無暫存、修改或未追蹤檔案），判斷下一步：

1. 執行 `git rev-parse --abbrev-ref --symbolic-full-name @{u}` 檢查上游。
2. 若上游存在，執行 `git log <upstream>..HEAD --oneline` 檢查未推送提交。

決策樹：

- **在預設分支，有未推送提交或無上游** ——詢問是否建立功能分支（不支援直接推送預設分支）。若是，建立並自步驟五繼續。若否，停止。
- **在預設分支，全部已推送，無開放 PR** ——回報無功能分支工作。停止。
- **功能分支，無上游** ——跳過步驟四，自步驟五繼續。
- **功能分支，有未推送提交** ——跳過步驟四，自步驟五繼續。
- **功能分支，全部已推送，無開放 PR** ——跳過步驟四至五，自步驟六繼續。
- **功能分支，全部已推送，有開放 PR** ——回報已為最新。停止。

### 步驟二：判斷慣例

提交訊息與 PR 標題之優先順序：

1. **上下文中已有之倉庫慣例** ——若專案指引指定慣例則遵循之。勿重新讀取；其於對話啟始時已載入。
2. **近期提交歷史** ——匹配最近 10 筆提交之模式。
3. **預設** ——`type(scope): description`（慣例提交）。

### 步驟三：檢查既有 PR

使用當前分支與上下文中之既有 PR 檢查。若分支為空，回報分離 HEAD 並停止。

若 PR 檢查回傳 `state: OPEN`，記下 URL——此為既有 PR 流程。續至步驟四與五（提交任何待處理工作並推送），然後至步驟七詢問是否重寫描述。僅當用戶確認重寫時方執行步驟六（透過 `ce-pr-description` 生成新描述）；步驟七之既有 PR 子路徑消費步驟六產出之 `{title, body_file}`。否則（無開放 PR），依序續至步驟六、七及八。

### 步驟四：分支、暫存與提交

1. 若在預設分支，先以 `git checkout -b <branch-name>` 建立功能分支。
2. 掃描變更檔案以辨識自然分離之關注點。若檔案明顯分屬不同邏輯變更，分別建立提交（最多 2-3 個）。僅以檔案層級分組（無 `git add -p`）。模糊時一個提交即可。
3. 以單一呼叫暫存並提交每組。避免 `git add -A` 或 `git add .`。遵循步驟二之慣例：
   ```bash
   git add file1 file2 file3 && git commit -m "$(cat <<'EOF'
   commit message here
   EOF
   )"
   ```

### 步驟五：推送

```bash
git push -u origin HEAD
```

### 步驟六：生成 PR 標題與正文

步驟一之工作樹差異僅顯示調用時之未提交變更。PR 描述須涵蓋 PR 中**所有提交**。

**偵測基礎分支與遠端。** 解析基礎分支與遠端（fork 型 PR 可能使用 `origin` 以外之遠端）。依序嘗試，首個成功即停：

1. **PR 元資料**（若步驟三找到既有 PR）：
   ```bash
   gh pr view --json baseRefName,url
   ```
   取 `baseRefName`。以 PR URL 中之 `owner/repo` 對照 `git remote -v` 之 fetch URL 以找基礎遠端。回退為 `origin`。
2. **上下文中之遠端預設分支** ——若已解析，去除 `origin/` 前綴。使用 `origin`。
3. **GitHub 元資料：**
   ```bash
   gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
   ```
   使用 `origin`。
4. **常見名稱** ——依序檢查 `main`、`master`、`develop`、`trunk`：
   ```bash
   git rev-parse --verify origin/<candidate>
   ```
   使用 `origin`。

若皆未解析，詢問用戶指定目標分支。

**收集完整分支 diff（證據決策前）。** 步驟一之工作樹差異僅反映調用時之未提交變更——在常見之「功能分支，全部已推送，有開放 PR」路徑上，步驟一跳過提交/推送步驟，工作樹差異為空。下方證據決策需要真實分支 diff 以判斷行為是否可觀察，故須對上方解析之基礎明確計算。僅在本地 ref 不可用時方 fetch——若 `<base-remote>/<base-branch>` 已在本地解析，自本地狀態跑 diff，以免離線/受限網路/認證過期環境硬性失敗：

```bash
git rev-parse --verify <base-remote>/<base-branch> >/dev/null 2>&1 \
  || git fetch --no-tags <base-remote> <base-branch>
git diff <base-remote>/<base-branch>...HEAD
```

以分支 diff（非工作樹 diff）做證據決策。若分支 diff 為空（如 HEAD 已合併至基礎或分支無獨有提交），跳過證據提示並繼續委派。

**證據決策（委派前）。** 若分支 diff 改變可觀察行為（UI、CLI 輸出、含可跑程式碼之 API 行為、生成產物、工作流輸出）且證據未被其他原因阻擋（不可用憑證、付費服務、僅部署基礎設施、硬體），詢問：「This PR has observable behavior. Capture evidence for the PR description?」

- **立即擷取**——載入 `ce-demo-reel` 技能，傳入自分支 diff 推斷之目標描述。ce-demo-reel 回傳 `Tier`、`Description` 及 `URL`。記下擷取之證據，俾作為自由文字引導傳予 `ce-pr-description`（如 "include the captured demo: <URL> as a `## Demo` section"）或在套用前嵌入回傳之正文。若擷取回傳 `Tier: skipped` 或 `URL: "none"`，以無證據繼續。
- **使用既有證據**——詢問 URL 或 markdown 嵌入，然後作為自由文字引導傳予 `ce-pr-description` 或在套用前嵌入。
- **跳過**——以無證據區段繼續。

當證據不可行（僅文檔、僅 markdown、僅更新日誌、發布元資料、僅 CI/配置、僅測試或純內部重構）時，不問而跳過。

**委派標題與正文生成予 `ce-pr-description`。** 載入 `ce-pr-description` 技能：

- **新 PR**（步驟三未找到既有 PR）：以 `base:<base-remote>/<base-branch>` 調用，使用本步驟稍早已解析之基礎，俾 `ce-pr-description` 描述正確之提交範圍，即使分支目標非預設基礎（如 `develop`、`release/*`）。附加任何已擷取證據之上下文或用戶焦點作為自由文字引導。
- **既有 PR**（步驟三找到）：以步驟三上下文中之完整 PR URL 調用。URL 保留倉庫/PR 身份即使從 worktree 或子目錄調用；技能讀取 PR 自身之 `baseRefName` 故不需 `base:` 覆寫。URL 後附加任何焦點引導作為自由文字。

`ce-pr-description` 回傳 `{title, body_file}` 區塊（正文在 OS 臨時檔案中）。其內部套用價值優先寫作原則、提交分類、規模評估、敘事框架、寫作聲調、視覺傳達、編號規則及 Compound Engineering 徽章頁尾。於步驟七中逐字使用回傳值；除非需焦點調整（如嵌入此步驟擷取但未作為引導文字傳遞之證據區塊——此時直接編輯正文檔案後再套用），勿對其疊加手動編輯。

若 `ce-pr-description` 回傳優雅退出訊息而非 `{title, body_file}`（如已關閉 PR、無提交可描述、基礎 ref 未解析），回報該訊息並停止——勿建立或編輯 PR。

### 步驟七：建立或更新 PR

#### 新 PR（步驟三無既有 PR）

使用 `ce-pr-description` 回傳之 `=== TITLE ===` / `=== BODY_FILE ===` 區塊，逐字代入 `<TITLE>` 與 `<BODY_FILE>`。若 `<TITLE>` 含 `"`、`` ` ``、`$` 或 `\`，轉義之或改用單引號：

```bash
gh pr create --title "<TITLE>" --body "$(cat "<BODY_FILE>")"
```

保持標題在 72 字元以內；`ce-pr-description` 已發出該範圍內之慣例提交標題。

#### 既有 PR（步驟三找到）

新提交已於步驟五後在 PR 上。回報 PR URL，然後詢問是否重寫描述。

- 若**否**——完全跳過步驟六並結束。用戶拒絕重寫時不跑委派或證據擷取。
- 若**是**，依序執行以下兩項動作。它們是獨立步驟，之間有交接邊界——勿在動作 1 後停止。
  1. 執行步驟六以透過 `ce-pr-description` 生成（傳遞既有 PR URL 作為 `pr:`）。`ce-pr-description` 明確不自行套用；其回傳 `=== TITLE ===` / `=== BODY_FILE ===` 區塊後停止。
  2. 自行套用回傳之標題與正文檔案。此為此技能之責任，非被委派技能者。逐字代入回傳區塊中之 `<TITLE>` 與 `<BODY_FILE>`；若 `<TITLE>` 含 `"`、`` ` ``、`$` 或 `\`，轉義之或改用單引號：

     ```bash
     gh pr edit --title "<TITLE>" --body "$(cat "<BODY_FILE>")"
     ```

  然後回報 PR URL（步驟八）。

### 步驟八：回報

輸出 PR URL。
