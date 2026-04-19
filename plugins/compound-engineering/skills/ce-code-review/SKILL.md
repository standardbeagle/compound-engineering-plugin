---
name: ce-code-review
description: "Structured code review using tiered persona agents, confidence-gated findings, and a merge/dedup pipeline. Use when reviewing code changes before creating a PR."
argument-hint: "[blank to review current branch, or provide PR link]"
---

# Code Review

審閱碼變。動態擇審者人格，並行分派子代理，收結構化JSON，合併去重，成一報告。

## When to Use

- 建PR前
- 迭代實作中，任務既成
- 碼變需反饋時
- 可獨立調用
- 可為唯讀或自動修復步驟，嵌入更大工作流

## Argument Parsing

解析 `$ARGUMENTS`，取下列選用令牌。每識別一令牌即剝離之，餘為PR號、GitHub URL或分支名。

| Token | Example | Effect |
|-------|---------|--------|
| `mode:autofix` | `mode:autofix` | 選自動修復模式（見下方 Mode Detection） |
| `mode:report-only` | `mode:report-only` | 選唯讀報告模式 |
| `mode:headless` | `mode:headless` | 選無頭模式供程式化調用（見下方 Mode Detection） |
| `base:<sha-or-ref>` | `base:abc1234` or `base:origin/main` | 跳過範圍偵測——以此為diff基準 |
| `plan:<path>` | `plan:docs/plans/2026-03-25-001-feat-foo-plan.md` | 載入此計劃以驗需求完備性 |

令牌皆選用。有則省推斷，無則依既有邏輯。

**模式令牌衝突：** 若參數含多個模式令牌，止，不分派代理。若 `mode:headless` 為其一，發出無頭錯誤信封：`Review failed (headless mode). Reason: conflicting mode flags — <mode_a> and <mode_b> cannot be combined.` 否則發通用式：`Review failed. Reason: conflicting mode flags — <mode_a> and <mode_b> cannot be combined.`

## Mode Detection

| Mode | When | Behavior |
|------|------|----------|
| **Interactive**（預設） | 無模式令牌 | 審閱、自動施safe_auto修復、呈現發現、就gated/manual發現詢問策略決策，並可選進入fix/push/PR後續步驟 |
| **Autofix** | 參數含 `mode:autofix` | 無用戶交互。審閱、僅施策略允許之 `safe_auto` 修復、有界輪次重審、寫運行產物、必要時發出殘餘下游工作 |
| **Report-only** | 參數含 `mode:report-only` | 嚴格唯讀。審閱報告後止，無編輯、產物、待辦、提交、推送或PR操作 |
| **Headless** | 參數含 `mode:headless` | 程式化模式，供技能間調用。靜默施 `safe_auto` 修復（單趟）、以結構化文本返其餘發現、寫運行產物、跳過待辦、返 "Review complete" 信號。無交互提示。 |

### Autofix mode rules

- **跳過一切用戶提問。** 範圍既定，永不暫停求准或求釋。
- **僅施 `safe_auto -> review-fixer` 發現。** 留 `gated_auto`、`manual`、`human`、`release` 未決。
- **寫運行產物**於 `.context/compound-engineering/ce-code-review/<run-id>/`，概述發現、已施修復、殘餘可操作工作、及建議輸出。
- **僅為未決可操作發現創建持久待辦**，其最終owner為 `downstream-resolver`。載 `ce-todo-create` 技能取正規目錄路徑與命名慣例。
- **永不提交、推送或建PR**於autofix模式。父工作流主之。

### Report-only mode rules

- **跳過一切用戶提問。** diff元數據稀薄時保守推斷意圖。
- **永不編輯檔案或外部化工作。** 不寫 `.context/compound-engineering/ce-code-review/<run-id>/`，不建待辦，不提交、推送或建PR。
- **可安全並行唯讀驗證。** `mode:report-only` 為唯一可與瀏覽器測試並行於同一checkout之模式。
- **勿切換共享checkout。** 若調用者傳入顯式PR或分支目標，`mode:report-only` 須於隔離checkout/worktree中運行，或止而不行 `gh pr checkout` / `git checkout`。
- **勿於同一checkout與瀏覽器測試重疊變異審閱。** 若未來編排器需修復，先畢瀏覽器測試再行變異審閱，或於隔離checkout/worktree中行之。

### Headless mode rules

- **跳過一切用戶提問。** 永不用平台提問工具（Claude Code之 `AskUserQuestion`、Codex之 `request_user_input`、Gemini之 `ask_user`）或其它交互提示。diff元數據稀薄時保守推斷意圖。
- **須有可定之diff範圍。** 若無頭模式無法確定diff範圍（無分支、PR或 `base:` ref可定且需用戶交互），發 `Review failed (headless mode). Reason: no diff scope detected. Re-invoke with a branch name, PR number, or base:<ref>.` 並止，不分派代理。
- **僅於單趟中施 `safe_auto -> review-fixer` 發現。** 無有界重審輪次。留 `gated_auto`、`manual`、`human`、`release` 未決，返於結構化輸出。
- **以結構化文本返一切非自動發現。** 用無頭輸出信封格式（見下方 Stage 6），保留每發現之 severity、autofix_class、owner、requires_verification、confidence、pre_existing、suggested_fix。以磁盤上每代理產物檔之 detail-tier 欄位（why_it_matters、evidence[]）充實之（見 Stage 6 Detail enrichment）。
- **寫運行產物**於 `.context/compound-engineering/ce-code-review/<run-id>/`，概述發現、已施修復及建議輸出。結構化輸出含產物路徑。
- **不建待辦檔。** 調用者收結構化發現，自路由下游工作。
- **勿切換共享checkout。** 若調用者傳入顯式PR或分支目標，`mode:headless` 須於隔離checkout/worktree中運行，或止而不行 `gh pr checkout` / `git checkout`。止時發 `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref> to review the current checkout, or run from an isolated worktree.`
- **不可於共享checkout並行使用。** 與 `mode:report-only` 異，無頭模式變異檔案（施 `safe_auto` 修復）。調用者不得於同一checkout與其它變異操作並行運行無頭模式。
- **永不提交、推送或建PR**於無頭模式。調用者主之。
- **以 "Review complete" 為終端信號**，俾調用者偵測完成。若一切審者失敗或超時，發 `Code review degraded (headless mode). Reason: 0 of N reviewers returned results.` 後繼 "Review complete"。

### Interactive mode rules

- **任何提問觸發前預載平台提問工具。** Claude Code中 `AskUserQuestion` 為延遲工具——其schema於會話開始時不可用。於Interactive模式工作之始（Stage 2意圖模糊提問、After-Review路由提問、逐步發現提問、批量預覽Proceed/Cancel、tracker-defer失敗子提問之前），調 `ToolSearch` 查詢 `select:AskUserQuestion` 載入schema。**一次、及早、於Interactive流程頂部載入**——勿待首個提問點，勿逐點決定。Codex（`request_user_input`）及Gemini（`ask_user`）無需此步；工具預設已載。
- **編號列表後備僅適用於確認載入失敗。** 本技能之後備模式——「以編號列表呈現選項，等候用戶回覆」——**唯**當 `ToolSearch` 無匹配或工具調用顯式失敗時有效。因工具不便、模型處於報告格式化模式、或指令埋沒於長技能中而將提問渲染為敘述文本，乃缺陷。需用戶決策之提問須觸發工具或顯式失敗。

## Severity Scale

一切審者用 P0-P3：

| Level | Meaning | Action |
|-------|---------|--------|
| **P0** | 關鍵損壞、可利用漏洞、數據遺失/損毀 | 合併前必修 |
| **P1** | 高影響缺陷，正常使用易觸及，違反契約 | 應修 |
| **P2** | 中等問題，有實質弊端（邊緣案例、效能退化、可維護性陷阱） | 若直截則修 |
| **P3** | 低影響、窄範圍、微幅改善 | 用戶酌處 |

## Action Routing

嚴重度定**緊迫性**。路由定**誰為下一步**及**本技能可否變異checkout**。

| `autofix_class` | Default owner | Meaning |
|-----------------|---------------|---------|
| `safe_auto` | `review-fixer` | 局部、確定性修復，當前模式允許變異時適合技能內修復器 |
| `gated_auto` | `downstream-resolver` or `human` | 有具體修復，但改行為、契約、權限或其他敏感邊界，不應預設自動施用 |
| `manual` | `downstream-resolver` or `human` | 可操作工作，應移交而非技能內修復 |
| `advisory` | `human` or `release` | 唯讀輸出，如經驗、推行備註或殘餘風險 |

路由規則：

- **合成階段擁最終路由。** 人格提供之路由元數據為輸入，非定論。
- **分歧時取更保守路由。** 合併發現可由 `safe_auto` 升為 `gated_auto` 或 `manual`，但無更強證據不得反向。
- **僅 `safe_auto -> review-fixer` 自動進入技能內修復佇列。**
- **`requires_verification: true` 意味修復須經定向測試、聚焦重審或運維驗證方為完成。**

## Reviewers

17審者人格以分層條件選取，另加CE專屬代理。見下方內含之人格目錄。

**恆啟（每次審閱）：**

| Agent | Focus |
|-------|-------|
| `review:ce-correctness-reviewer` | 邏輯錯誤、邊緣案例、狀態缺陷、錯誤傳播 |
| `review:ce-testing-reviewer` | 覆蓋缺口、弱斷言、脆弱測試 |
| `review:ce-maintainability-reviewer` | 耦合、複雜度、命名、死碼、抽象債 |
| `review:ce-project-standards-reviewer` | CLAUDE.md與AGENTS.md合規——frontmatter、引用、命名、可攜性 |
| `review:ce-agent-native-reviewer` | 驗證新功能可為代理所用 |
| `research:ce-learnings-researcher` | 搜 docs/solutions/ 尋與此PR相關之既有問題 |

**跨領域條件式（按diff選取）：**

| Agent | Select when diff touches... |
|-------|---------------------------|
| `review:ce-security-reviewer` | 認證、公開端點、用戶輸入、權限 |
| `review:ce-performance-reviewer` | DB查詢、數據轉換、快取、異步 |
| `review:ce-api-contract-reviewer` | 路由、序列化器、類型簽名、版本化 |
| `review:ce-data-migrations-reviewer` | 遷移、schema變更、回填 |
| `review:ce-reliability-reviewer` | 錯誤處理、重試、超時、背景作業 |
| `review:ce-adversarial-reviewer` | diff >=50行變更（非測試/非生成/非lockfile），或認證、支付、數據變異、外部API |
| `review:ce-cli-readiness-reviewer` | CLI命令定義、參數解析、CLI框架用法、命令處理器實作 |
| `review:ce-previous-comments-reviewer` | 審閱已有審查評論或討論串之PR |

**技術棧條件式（按diff選取）：**

| Agent | Select when diff touches... |
|-------|---------------------------|
| `review:ce-dhh-rails-reviewer` | Rails架構、服務物件、session/認證選擇、Hotwire vs SPA邊界 |
| `review:ce-kieran-rails-reviewer` | Rails應用碼，慣例、命名、可維護性為要 |
| `review:ce-kieran-python-reviewer` | Python模組、端點、腳本或服務 |
| `review:ce-kieran-typescript-reviewer` | TypeScript組件、服務、hooks、工具或共享類型 |
| `review:ce-julik-frontend-races-reviewer` | Stimulus/Turbo控制器、DOM事件、定時器、動畫或異步UI流 |

**CE條件式（遷移專用）：**

| Agent | Select when diff includes migration files |
|-------|------------------------------------------|
| `review:ce-schema-drift-detector` | 交叉比對schema.rb與所含遷移 |
| `review:ce-deployment-verification-agent` | 生成部署清單，含SQL驗證查詢 |

## Review Scope

每次審閱分派全部4個恆啟人格及2個CE恆啟代理，再加適配diff之跨領域與技術棧條件式。模型自然調整規模：小配置變更觸發0條件式 = 6審者。Rails認證功能或觸發 security + reliability + kieran-rails + dhh-rails = 10審者。

## Protected Artifacts

下列路徑為compound-engineering管線產物，任何審者不得標記為刪除、移除或gitignore：

- `docs/brainstorms/*` -- ce-brainstorm所建之需求文檔
- `docs/plans/*.md` -- ce-plan所建之計劃檔（含進度勾選框之活文檔）
- `docs/solutions/*.md` -- 管線中產生之方案文檔

若審者標記此等目錄中之檔案建議清理或移除，合成時丟棄該發現。

## How to Run

### Stage 1: Determine scope

計算diff範圍、檔案清單及diff。合併指令以減少權限提示。

**若提供 `base:` 參數（快速路徑）：**

調用者已知diff基準。跳過一切基分支偵測、遠端解析及merge-base計算。直接用所提供值：

```
BASE_ARG="{base_arg}"
BASE=$(git merge-base HEAD "$BASE_ARG" 2>/dev/null) || BASE="$BASE_ARG"
```

然後產生與其他路徑相同輸出：

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

此路徑適用任何ref——SHA、`origin/main`、分支名。自動化調用者（ce-work、lfg、slfg）宜用此以避免偵測開銷。**勿將 `base:` 與PR號或分支目標合用。** 若兩者並存，止並報錯："Cannot use `base:` with a PR number or branch target — `base:` implies the current checkout is already the correct branch. Pass `base:` alone, or pass the target alone and let scope detection resolve the base." 此避免diff基準與碼/元數據來源不一致之範圍/意圖錯配。

**若參數為PR號或GitHub URL：**

若 `mode:report-only` 或 `mode:headless` 生效，**勿**於共享checkout執行 `gh pr checkout <number-or-url>`。`mode:report-only` 告調用者："mode:report-only cannot switch the shared checkout to review a PR target. Run it from an isolated worktree/checkout for that PR, or run report-only with no target argument on the already checked out branch." `mode:headless` 發 `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref> to review the current checkout, or run from an isolated worktree.` 除非審閱已在隔離checkout中運行，否則止於此。

先驗worktree清淨再切分支：

```
git status --porcelain
```

若輸出非空，告用戶："You have uncommitted changes on the current branch. Stash or commit them before reviewing a PR, or use standalone mode (no argument) to review the current branch as-is." 工作樹不淨前勿進行checkout。

然後checkout PR分支，俾人格代理可讀實際碼（非當前checkout）：

```
gh pr checkout <number-or-url>
```

取PR元數據。取基分支名及PR基倉庫身份，不僅分支名：

```
gh pr view <number-or-url> --json title,body,baseRefName,headRefName,url
```

以返回之PR URL取其倉庫部分為 `<base-repo>`（如 `https://github.com/EveryInc/compound-engineering-plugin/pull/348` 之 `EveryInc/compound-engineering-plugin`）。

然後計算對PR基分支之本地diff，俾重審亦含本地修復提交及未提交編輯。以PR元數據之基分支（此處示為 `<base>`）及PR URL推導之基倉庫身份（此處示為 `<base-repo>`）。從PR之實際基倉庫解析基ref，勿假定 `origin` 指向該倉庫：

```
PR_BASE_REMOTE=$(git remote -v | awk 'index($2, "github.com:<base-repo>") || index($2, "github.com/<base-repo>") {print $1; exit}')
if [ -n "$PR_BASE_REMOTE" ]; then PR_BASE_REMOTE_REF="$PR_BASE_REMOTE/<base>"; else PR_BASE_REMOTE_REF=""; fi
PR_BASE_REF=$(git rev-parse --verify "$PR_BASE_REMOTE_REF" 2>/dev/null || git rev-parse --verify <base> 2>/dev/null || true)
if [ -z "$PR_BASE_REF" ]; then
  if [ -n "$PR_BASE_REMOTE_REF" ]; then
    git fetch --no-tags "$PR_BASE_REMOTE" <base>:refs/remotes/"$PR_BASE_REMOTE"/<base> 2>/dev/null || git fetch --no-tags "$PR_BASE_REMOTE" <base> 2>/dev/null || true
    PR_BASE_REF=$(git rev-parse --verify "$PR_BASE_REMOTE_REF" 2>/dev/null || git rev-parse --verify <base> 2>/dev/null || true)
  else
    if git fetch --no-tags https://github.com/<base-repo>.git <base> 2>/dev/null; then
      PR_BASE_REF=$(git rev-parse --verify FETCH_HEAD 2>/dev/null || true)
    fi
    if [ -z "$PR_BASE_REF" ]; then PR_BASE_REF=$(git rev-parse --verify <base> 2>/dev/null || true); fi
  fi
fi
if [ -n "$PR_BASE_REF" ]; then BASE=$(git merge-base HEAD "$PR_BASE_REF" 2>/dev/null) || BASE=""; else BASE=""; fi
```

```
if [ -n "$BASE" ]; then echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard; else echo "ERROR: Unable to resolve PR base branch <base> locally. Fetch the base branch and rerun so the review scope stays aligned with the PR."; fi
```

自 `gh pr view` 取PR title/body、基分支及PR URL，自本地命令取BASE標記、檔案清單、diff內容及 `UNTRACKED:` 列表。checkout後勿用 `gh pr diff` 為審閱範圍——其僅反映遠端PR狀態，遺漏本地修復提交直至推送。若fetch後基ref仍無法從PR之實際基倉庫解析，止而勿回退至 `git diff HEAD`；無PR基分支之PR審閱為不完整。

**若參數為分支名：**

checkout指定分支，對基分支diff。替換所提供分支名（此處示為 `<branch>`）。

若 `mode:report-only` 或 `mode:headless` 生效，**勿**於共享checkout執行 `git checkout <branch>`。`mode:report-only` 告調用者："mode:report-only cannot switch the shared checkout to review another branch. Run it from an isolated worktree/checkout for `<branch>`, or run report-only on the current checkout with no target argument." `mode:headless` 發 `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref> to review the current checkout, or run from an isolated worktree.` 除非審閱已在隔離checkout中運行，否則止於此。

先驗worktree清淨再切分支：

```
git status --porcelain
```

若輸出非空，告用戶："You have uncommitted changes on the current branch. Stash or commit them before reviewing another branch, or provide a PR number instead." 工作樹不淨前勿進行checkout。

```
git checkout <branch>
```

然後偵測審閱基分支並計算merge-base。運行 `references/resolve-base.sh` 腳本，其處理fork安全之遠端解析，含多重後備偵測（PR元數據 -> `origin/HEAD` -> `gh repo view` -> 常見分支名）：

```
RESOLVE_OUT=$(bash references/resolve-base.sh) || { echo "ERROR: resolve-base.sh failed"; exit 1; }
if [ -z "$RESOLVE_OUT" ] || echo "$RESOLVE_OUT" | grep -q '^ERROR:'; then echo "${RESOLVE_OUT:-ERROR: resolve-base.sh produced no output}"; exit 1; fi
BASE=$(echo "$RESOLVE_OUT" | sed 's/^BASE://')
```

若腳本輸出錯誤，止而勿回退至 `git diff HEAD`；無基分支之分支審閱僅顯示未提交變更，靜默遺漏一切已提交工作。

成功後產生diff：

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

可另以 `gh pr view` 取額外PR元數據（title、body、關聯issue），但無PR亦不為失敗。

**若無參數（當前分支獨立模式）：**

以與分支模式相同之 `references/resolve-base.sh` 腳本偵測審閱基分支並計算merge-base：

```
RESOLVE_OUT=$(bash references/resolve-base.sh) || { echo "ERROR: resolve-base.sh failed"; exit 1; }
if [ -z "$RESOLVE_OUT" ] || echo "$RESOLVE_OUT" | grep -q '^ERROR:'; then echo "${RESOLVE_OUT:-ERROR: resolve-base.sh produced no output}"; exit 1; fi
BASE=$(echo "$RESOLVE_OUT" | sed 's/^BASE://')
```

若腳本輸出錯誤，止而勿回退至 `git diff HEAD`；無基分支之獨立審閱僅顯示未提交變更，靜默遺漏分支上一切已提交工作。

成功後產生diff：

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

用 `git diff $BASE`（無 `..HEAD`）對工作樹diff merge-base，含已提交、暫存及未暫存變更。

**未追蹤檔案處理：** 恆檢 `UNTRACKED:` 列表，即使 `FILES:`/`DIFF:` 非空。未追蹤檔案在暫存前不在審閱範圍內。若列表非空，告用戶哪些檔案被排除。若有應審者，止並告用戶先 `git add` 再重跑。僅當用戶有意只審已追蹤變更時方繼續。`mode:headless` 或 `mode:autofix` 中勿止以詢問——以已追蹤變更繼續，於輸出之 Coverage 段注明排除之未追蹤檔案。

### Stage 2: Intent discovery

理解變更欲達何事。意圖來源依 Stage 1 所取路徑：

**PR/URL模式：** 用 `gh pr view` 元數據之PR title、body及關聯issue。若body稀薄，以PR提交訊息補充。

**Branch模式：** 以 Stage 1 所解之merge-base運行 `git log --oneline ${BASE}..<branch>`。

**獨立模式（當前分支）：** 運行：

```
echo "BRANCH:" && git rev-parse --abbrev-ref HEAD && echo "COMMITS:" && git log --oneline ${BASE}..HEAD
```

合對話上下文（計劃段落摘要、PR描述），寫2-3行意圖摘要：

```
Intent: Simplify tax calculation by replacing the multi-tier rate lookup
with a flat-rate computation. Must not regress edge cases in tax-exempt handling.
```

傳此予每審者之分派提示。意圖影響*各審者審視之力度*，非選取哪些審者。

**意圖模糊時：**

- **Interactive模式：** 以平台交互提問工具（Claude Code之 `AskUserQuestion`、Codex之 `request_user_input`、Gemini之 `ask_user`）問一題："What is the primary goal of these changes?" 意圖確立前不分派審者。**Claude Code：** 若本次會話尚未載入 `AskUserQuestion`（依 Interactive mode rules 預載），先調 `ToolSearch` 查詢 `select:AskUserQuestion`。Codex（`request_user_input`）及Gemini（`ask_user`）無需此預載步驟——平台原生提問工具預設已載。
- **Autofix/report-only/headless模式：** 保守推斷意圖，取自分支名、diff、PR元數據及調用者上下文。於 Coverage 或 Verdict 推理中注明不確定性，而非阻塞。

### Stage 2b: Plan discovery (requirements verification)

定位計劃文檔，俾 Stage 6 驗需求完備性。依優先序查下列來源——首命中即止：

1. **`plan:` 參數。** 若調用者傳入計劃路徑，直接用之。讀檔確認存在。
2. **PR body。** 若 Stage 1 已取PR元數據，掃描body中匹配 `docs/plans/*.md` 之路徑。若恰有一匹配且檔案存在，用之為 `plan_source: explicit`。若有多個計劃路徑，視為模糊——降級為 `plan_source: inferred`，取最近且存在者，或若皆不存在或與PR標題/意圖無明顯關聯則跳過。恆驗所選檔案存在——PR描述中過時或複製之計劃連結常見。
3. **自動發現。** 從分支名取2-3關鍵詞（如 `feat/onboarding-skill` -> `onboarding`、`skill`）。Glob `docs/plans/*`，篩檔名含這些關鍵詞者。若恰有一匹配，用之。若多匹配或匹配顯模糊（如通用關鍵詞 `review`、`fix`、`update` 可能命中多計劃），**跳過自動發現**——錯誤計劃不如無計劃。若零匹配，跳過。

**信心標記：** 記錄計劃如何尋獲：
- `plan:` 參數 -> `plan_source: explicit`（高信心）
- PR body單一明確匹配 -> `plan_source: explicit`（高信心）
- PR body多個/模糊匹配 -> `plan_source: inferred`（較低信心）
- 自動發現單一明確匹配 -> `plan_source: inferred`（較低信心）

若尋獲計劃，讀其 **Requirements Trace**（R1、R2等）及 **Implementation Units**（勾選項）。儲所取需求列表及 `plan_source` 供 Stage 6 用。未尋獲計劃不阻塞審閱——需求驗證為附加，非必要。

### Stage 3: Select reviewers

讀 Stage 1 之diff及檔案清單。4個恆啟人格及2個CE恆啟代理為自動。對人格目錄中每個跨領域及技術棧條件式人格，判斷diff是否需要之。此為代理判斷，非關鍵詞匹配。

**檔案類型意識：** 指令散文檔（Markdown技能定義、JSON schema、配置檔）為產品碼，但不受運行時導向審者之益。對抗審者之技術（競態、級聯故障、濫用案例）針對可執行碼行為。僅變更指令散文檔之diff跳過adversarial，除非散文描述認證、支付或數據變異行為。僅計可執行碼行數於行數閾值。

**`previous-comments` 僅限PR。** 唯當 Stage 1 取得PR元數據時選取此人格（參數為PR號或URL，或 `gh pr view` 為當前分支返回元數據）。無關聯PR之獨立分支審閱完全跳過——無先前評論可查。

技術棧人格為疊加。Rails UI變更或需 `kieran-rails` 加 `julik-frontend-races`；TypeScript API diff或需 `kieran-typescript` 加 `api-contract` 及 `reliability`。

CE條件式代理，查diff是否含匹配 `db/migrate/*.rb`、`db/schema.rb` 或數據回填腳本之檔案。

分派前公告團隊：

```
Review team:
- correctness (always)
- testing (always)
- maintainability (always)
- project-standards (always)
- ce-agent-native-reviewer (always)
- ce-learnings-researcher (always)
- security -- new endpoint in routes.rb accepts user-provided redirect URL
- kieran-rails -- controller and Turbo flow changed in app/controllers and app/views
- dhh-rails -- diff adds service objects around ordinary Rails CRUD
- data-migrations -- adds migration 20260303_add_index_to_orders
- ce-schema-drift-detector -- migration files present
```

此為進度報告，非阻塞確認。

### Stage 3b: Discover project standards paths

分派子代理前，以原生檔案搜尋/glob工具定位 `project-standards` 人格所需之所有相關標準檔案路徑（非內容）：

1. 以原生檔案搜尋工具（如Claude Code之Glob）找所有 `**/CLAUDE.md` 及 `**/AGENTS.md`。
2. 篩其目錄為至少一個變更檔案之祖先者。標準檔治理其下所有檔案（如 `plugins/compound-engineering/AGENTS.md` 適用 `plugins/compound-engineering/` 下之一切）。

傳結果路徑列表予 `project-standards` 人格，置於審閱上下文之 `<standards-paths>` 區塊中（見 Stage 4）。人格自讀檔案，僅定向與變更檔案類型相關之段落。此使編排器工作輕省（僅路徑發現），避免以子代理未必全需之內容膨脹其提示。

### Stage 4: Spawn sub-agents

#### Model tiering

人格子代理做聚焦、限域之工作，宜用快速中層模型以減成本與延遲，不失審閱品質。編排器自身留於預設（最強）模型。

一切人格及CE子代理用平台之中層模型。Claude Code中，Agent工具調用傳 `model: "sonnet"`。其他平台用等效中層（如Codex之 `gpt-4o`）。若平台無模型覆蓋機制或可用模型名未知，省略模型參數，讓代理繼承預設——以父模型工作之審閱優於因未知模型名而中斷之分派。

CE恆啟代理（ce-agent-native-reviewer、ce-learnings-researcher）及CE條件式代理（ce-schema-drift-detector、ce-deployment-verification-agent）亦用中層模型，因彼等做限域聚焦工作。

編排器（本技能）留於預設模型，因其處理意圖發現、審者選取、發現合併/去重及合成——皆需更強推理之任務。

#### Run ID

分派任何代理前生成唯一運行識別符。此ID劃定所有代理產物檔案及審後運行產物至同一目錄。

```bash
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' ')
mkdir -p ".context/compound-engineering/ce-code-review/$RUN_ID"
```

傳 `{run_id}` 予每個人格子代理，俾其寫完整分析至 `.context/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`。

**Report-only模式：** 跳過run-id生成及目錄創建。不傳 `{run_id}` 予代理。代理僅返精簡JSON，不寫檔，合乎report-only之不寫契約。

#### Spawning

分派子代理時省略 `mode` 參數，俾用戶已配置之權限設定生效。勿傳 `mode: "auto"`。

以子代理模板（見下方內含）將每個選定之人格審者作為並行子代理分派。每個人格子代理接收：

1. 其人格檔內容（身份、失敗模式、校準、抑制條件）
2. diff範圍規則參考（見下方內含）中之共享diff範圍規則
3. 發現schema（見下方內含）中之JSON輸出契約
4. PR元數據：審閱PR時之title、body及URL（否則空字串）。置於 `<pr-context>` 區塊，俾審者可驗碼與所述意圖之合
5. 審閱上下文：意圖摘要、檔案清單、diff
6. Run ID及審者名，用於產物檔路徑
7. **僅 `project-standards`：** Stage 3b之標準檔路徑列表，包於 `<standards-paths>` 區塊附於審閱上下文末

人格子代理對專案為**唯讀**：審閱並返結構化JSON。不編輯專案檔案或提議重構。唯一允許之寫為將完整分析存至輸出契約所定之 `.context/` 產物路徑。

唯讀此處意指**不變異**，非「無shell存取」。審閱子代理可用不變異之檢查命令收集證據或驗證範圍，包括唯讀導向之 `git`/`gh` 用法如 `git diff`、`git show`、`git blame`、`git log` 及 `gh pr view`。不得編輯專案檔案、切分支、提交、推送、建PR或以其他方式變異checkout或倉庫狀態。

每個人格子代理寫完整JSON（一切schema欄位）至 `.context/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`，並返精簡JSON，僅含合併層欄位：

```json
{
  "reviewer": "security",
  "findings": [
    {
      "title": "User-supplied ID in account lookup without ownership check",
      "severity": "P0",
      "file": "orders_controller.rb",
      "line": 42,
      "confidence": 0.92,
      "autofix_class": "gated_auto",
      "owner": "downstream-resolver",
      "requires_verification": true,
      "pre_existing": false,
      "suggested_fix": "Add current_user.owns?(account) guard before lookup"
    }
  ],
  "residual_risks": [...],
  "testing_gaps": [...]
}
```

Detail-tier欄位（`why_it_matters`、`evidence`）僅在產物檔中。`suggested_fix` 在兩層皆為選用——有時納入精簡返回以供編排器有修復上下文做自動施用決策。若檔案寫入失敗，精簡返回仍提供合併所需之一切。

**CE恆啟代理**（ce-agent-native-reviewer、ce-learnings-researcher）以標準Agent調用與人格代理並行分派。予彼等與人格相同之審閱上下文集：進入模式、Stage 1所取之任何PR元數據、意圖摘要、已知時之審閱基分支名、`BASE:` 標記、檔案清單、diff及 `UNTRACKED:` 範圍備註。勿以通用「review this」提示調用之。其輸出為非結構化，於 Stage 6 獨立合成。

**CE條件式代理**（ce-schema-drift-detector、ce-deployment-verification-agent）適用時亦以標準Agent調用分派。傳相同審閱上下文集加適用原因（如哪些遷移檔觸發該代理）。ce-schema-drift-detector 特別須傳顯式已解審閱基分支，俾其永不假定 `main`。其輸出為非結構化，須與CE恆啟代理同樣保留供 Stage 6 合成。

### Stage 5: Merge findings

將多審者精簡JSON返還轉為一去重、信心門控之發現集。精簡返還含合併層欄位（title、severity、file、line、confidence、autofix_class、owner、requires_verification、pre_existing）加選用之 suggested_fix。Detail-tier欄位（why_it_matters、evidence）在磁盤上每代理產物檔中，此階段不載入。

1. **驗證。** 檢查每精簡返還之必填頂層及每發現欄位，加值約束。丟棄畸形返還或發現。記錄丟棄數。
   - **頂層必填：** reviewer（字串）、findings（陣列）、residual_risks（陣列）、testing_gaps（陣列）。缺一或類型錯即丟棄整個返還。
   - **每發現必填：** title、severity、file、line、confidence、autofix_class、owner、requires_verification、pre_existing
   - **值約束：**
     - severity: P0 | P1 | P2 | P3
     - autofix_class: safe_auto | gated_auto | manual | advisory
     - owner: review-fixer | downstream-resolver | human | release
     - confidence: 數值, 0.0-1.0
     - line: 正整數
     - pre_existing、requires_verification: 布林
   - 此處不對完整schema驗證——完整schema（含why_it_matters及evidence）適用於磁盤上產物檔，非精簡返還。
2. **信心門控。** 抑制信心低於0.60之發現。例外：P0發現信心0.50+通過門控——關鍵但不確定之問題不得靜默丟棄。記錄抑制數。此與人格指令及schema之信心閾值一致。
3. **去重。** 計算指紋：`normalize(file) + line_bucket(line, +/-3) + normalize(title)`。指紋匹配時合併：留最高嚴重度、最高信心、注明哪些審者標記之。
4. **跨審者共識。** 當2+獨立審者標記同一問題（同指紋），合併信心加0.10（上限1.0）。跨審者共識為強信號——獨立審者收斂於同一問題較任何單一審者之信心更可靠。於輸出之 Reviewer 欄注明共識（如 "security, correctness"）。
5. **分離既有。** 提取 `pre_existing: true` 之發現至獨立列表。
6. **解決分歧。** 當審者標記同一碼區但對嚴重度、autofix_class或owner有異議，於 Reviewer 欄注明分歧（如 "security (P0), correctness (P1) -- kept P0"）。此透明度助用戶理解發現路由之故。
7. **正規化路由。** 每合併發現，定最終 `autofix_class`、`owner` 及 `requires_verification`。若審者不同意，取最保守路由。合成可由 `safe_auto` 收窄至 `gated_auto` 或 `manual`，但無新證據不得放寬。
7b. **推薦動作之決勝。** Interactive模式之逐步過程及LFG路徑為每發現呈現推薦動作（Apply / Defer / Skip / Acknowledge），源自正規化之 `autofix_class` 及 `suggested_fix`。當貢獻審者對同一合併發現暗示不同動作時，合成取最保守者，序為 `Skip > Defer > Apply > Acknowledge`。此保證相同審閱產物決定性產生相同推薦，俾LFG結果事後可審計、逐步之推薦跨重跑穩定。用戶仍可於逐步過程中逐發現覆蓋；此規則僅定何者被標為「推薦」。
8. **分區工作。** 建三集合：
   - 技能內修復佇列：僅 `safe_auto -> review-fixer`
   - 殘餘可操作佇列：未決之 `gated_auto` 或 `manual` 發現，owner為 `downstream-resolver`
   - 唯讀報告佇列：`advisory` 發現加 `human` 或 `release` 擁有之任何輸出
9. **排序。** 依嚴重度（P0先）-> 信心（降序）-> 檔案路徑 -> 行號。
10. **收集覆蓋數據。** 聯集各審者之 residual_risks 及 testing_gaps。
11. **保留CE代理產物。** 保留learnings、agent-native、schema-drift及deployment-verification輸出於合併發現集旁。勿因不匹配人格JSON schema而丟棄非結構化代理輸出。

### Stage 6: Synthesize and present

以**管線分隔markdown表格呈現發現**（見下方內含之審閱輸出模板）。Interactive模式中發現行必須用表格格式——勿將發現渲染為自由文本區塊或水平線分隔散文。其餘報告段落（Applied Fixes、Learnings、Coverage等）用條列列表及 `---` 分隔符於verdict前，如模板所示。

1. **標頭。** 範圍、意圖、模式、審者團隊及每個條件式之理由。
2. **發現。** 以管線分隔表格呈現，按嚴重度分組（`### P0 -- Critical`、`### P1 -- High`、`### P2 -- Moderate`、`### P3 -- Low`）。每發現行顯示 `#`、file、issue、reviewer(s)、confidence及合成路由。省略空嚴重度層。永不以自由文本區塊或編號列表渲染發現。
3. **需求完備性。** 僅當 Stage 2b 尋獲計劃時包含。對計劃中每個需求（R1、R2等）及實作單元，報告diff中是否出現對應工作。用簡單勾選清單：met / not addressed / partially addressed。路由依 `plan_source`：
   - **`explicit`**（調用者提供或PR body）：未處理需求標記為P1發現，`autofix_class: manual`、`owner: downstream-resolver`。進入殘餘可操作佇列，可成為待辦。
   - **`inferred`**（自動發現）：未處理需求標記為P3發現，`autofix_class: advisory`、`owner: human`。留於報告——無待辦，無自主後續。推斷之計劃匹配為提示，非契約。
   未尋獲計劃時完全省略此段——勿提及計劃之缺失。
4. **已施修復。** 僅當本次調用有修復階段時包含。
5. **殘餘可操作工作。** 當有未決可操作發現被移交或應移交時包含。
6. **既有問題。** 獨立段落，不計入verdict。
7. **經驗與既有方案。** 呈現 ce-learnings-researcher 結果：若既有方案相關，標記為 "Known Pattern" 並附 docs/solutions/ 檔案連結。
8. **代理原生缺口。** 呈現 ce-agent-native-reviewer 結果。無缺口則省略此段。
9. **Schema Drift檢查。** 若 ce-schema-drift-detector 已運行，概述是否發現drift。若有drift，列不相關之schema物件及所需清理命令。若無，簡言之。
10. **部署備註。** 若 ce-deployment-verification-agent 已運行，呈現關鍵Go/No-Go項目：阻塞型預部署檢查、最重要之驗證查詢、回滋注意事項及監控重點。保持清單可操作，勿丟入Coverage。
11. **覆蓋。** 抑制數、殘餘風險、測試缺口、失敗/超時審者及非交互模式所攜之意圖不確定性。
12. **Verdict。** Ready to merge / Ready with fixes / Not ready。適用時附修復順序。當 `explicit` 計劃有未處理需求時，verdict須反映之——碼淨但缺計劃需求之PR為 "Not ready"，除非遺漏為有意。當 `inferred` 計劃有未處理需求時，於verdict推理中注明但不單獨阻塞。

不附時間估計。

**格式驗證：** 報告交付前，驗發現段落用管線分隔表格行（`| # | File | Issue | ... |`）而非自由文本。若發現自己將發現渲染為水平線或條列點分隔之散文區塊，止並重格式化為表格。

### Headless output format

`mode:headless` 中，以結構化文本信封取代交互式管線分隔表格報告。信封遵循與document-review之無頭輸出相同之結構模式（完成標頭、元數據塊、按autofix_class分組之發現、尾部段落），但用ce-code-review自身之段落標題及每發現欄位。

```
Code review complete (headless mode).

Scope: <scope-line>
Intent: <intent-summary>
Reviewers: <reviewer-list with conditional justifications>
Verdict: <Ready to merge | Ready with fixes | Not ready>
Artifact: .context/compound-engineering/ce-code-review/<run-id>/

Applied N safe_auto fixes.

Gated-auto findings (concrete fix, changes behavior/contracts):

[P1][gated_auto -> downstream-resolver][needs-verification] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">
  Evidence: <evidence[0]>
  Evidence: <evidence[1]>

Manual findings (actionable, needs handoff):

[P1][manual -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Evidence: <evidence[0]>

Advisory findings (report-only):

[P2][advisory -> human] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Pre-existing issues:
[P2][gated_auto -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Residual risks:
- <risk>

Learnings & Past Solutions:
- <learning>

Agent-Native Gaps:
- <gap description>

Schema Drift Check:
- <drift status>

Deployment Notes:
- <deployment note>

Testing gaps:
- <gap>

Coverage:
- Suppressed: <N> findings below 0.60 confidence (P0 at 0.50+ retained)
- Untracked files excluded: <file1>, <file2>
- Failed reviewers: <reviewer>

Review complete
```

**Detail enrichment（僅無頭）：** 無頭信封含 `Why:`、`Evidence:` 及 `Suggested fix:` 行。合併後（Stage 5），僅讀存活過去重及信心門控之發現的每代理產物檔。
   - **欄位層級：** `Why:` 及 `Evidence:` 為detail-tier——從每代理產物檔載入。`Suggested fix:` 為merge-tier——直接取自精簡返還，無需查產物。
   - **產物匹配：** 對每存活發現，於貢獻審者之產物檔中查找其detail-tier欄位。以 `file + line_bucket(line, +/-3)`（與 Stage 5 去重所用相同容差）匹配於每貢獻審者之產物內。當多個產物條目落入行桶時，對合併發現之標題及每候選條目之標題施 `normalize(title)` 為決勝。
   - **審者順序：** 按合併發現之審者列表順序嘗試貢獻審者；用首個匹配。
   - **無匹配後備：** 若無產物檔含匹配（所有寫入失敗，或發現為合併時合成），省略該發現之 `Why:` 及 `Evidence:` 行，於 Coverage 中注明缺口。`Suggested fix:` 行仍可從精簡返還填入，因其為merge-tier。

**格式規則：**
- `[needs-verification]` 標記僅出現於 `requires_verification: true` 之發現。
- `Artifact:` 行予調用者完整運行產物之路徑，供機器可讀之完整發現schema存取。文本信封為主要移交；產物供除錯及全保真存取。
- `owner: release` 之發現出現於 Advisory 段（其為運維/推行項目，非碼修復）。
- `pre_existing: true` 之發現出現於 Pre-existing 段，不論 autofix_class。
- Verdict 出現於元數據標頭（相較交互格式中之底部位置，此處刻意前移），俾程式化調用者先得verdict。
- 省略零項目之段落。
- 若一切審者失敗或超時，發 `Code review degraded (headless mode). Reason: 0 of N reviewers returned results.` 後繼 "Review complete"。
- 以 "Review complete" 為終端信號，俾調用者偵測完成。

## Quality Gates

報告交付前驗：

1. **每發現皆可操作。** 重讀每發現。若含 "consider"、"might want to"、"could be improved" 而無具體修復，以特定動作重寫之。模糊發現浪費工程時間。
2. **無因粗覽而生之假陽性。** 對每發現驗周圍碼確實已讀。查所謂「缺陷」非同函數他處已處理、所謂「未用import」非用於類型標註、所謂「缺null check」非調用者已守護。
3. **嚴重度已校準。** 風格挑剔永不為P0。SQL注入永不為P3。重查每嚴重度指派。
4. **行號準確。** 驗每引用行號對照檔案內容。錯行號之發現不如無發現。
5. **受保護產物已尊重。** 丟棄建議刪除或gitignore `docs/brainstorms/`、`docs/plans/`、`docs/solutions/` 中檔案之任何發現。
6. **發現不重複linter輸出。** 勿標記專案linter/formatter可捕獲之問題（缺分號、錯縮排）。聚焦語義問題。

## Language-Aware Conditionals

本技能於diff明確需要時使用技術棧專屬審者代理。保持彼等有立場。彼等非通用語言檢查器；於恆啟及跨領域人格之上加獨特審閱視角。

勿僅憑檔案副檔名機械分派。觸發為該技術棧中有意義之變更行為、架構或UI狀態。

## After Review

### Mode-Driven Post-Review Flow

呈現發現及verdict（Stage 6）後，按模式路由後續步驟。審閱與合成於每模式中相同；僅變異及移交行為有別。

#### Step 1: Build the action sets

- **淨審** 意為抑制及既有分離後零發現。審閱淨時跳過修復/移交階段。
- **修復佇列：** 路由至 `safe_auto -> review-fixer` 之最終發現。
- **殘餘可操作佇列：** 未決之 `gated_auto` 或 `manual` 發現，最終owner為 `downstream-resolver`。
- **唯讀報告佇列：** `advisory` 發現及 `human` 或 `release` 擁有之任何輸出。
- **永不將advisory輸出轉為修復工作或待辦。** 部署備註、殘餘風險及release擁有項留於報告中。

#### Step 2: Choose policy by mode

**Interactive mode**

- 自動施 `safe_auto -> review-fixer` 發現，不詢問。依定義為安全。
- **零剩餘情況：** 若 `safe_auto` 輪後無 `gated_auto` 或 `manual` 發現殘留，跳過路由提問。發一行完成摘要，措辭不得暗示advisory及既有發現（本流程不處理）已清除。無advisory或既有發現時，`All findings resolved — N safe_auto fixes applied.` 為準確。有advisory及/或既有發現時，用限定式 `All actionable findings resolved — N safe_auto fixes applied. (K advisory, J pre-existing findings remain in the report.)`，省略零計數子句。摘要後附既有審末verdict，然後依 Step 5 之門控規則進行。
- **追蹤器預偵測：** 渲染路由提問前，依 `references/tracker-defer.md` 取本次會話之追蹤器元組 `{ tracker_name, confidence, named_sink_available, any_sink_available }`。探測每會話至多一次，餘下運行中快取。`named_sink_available` 驅動選項C標籤（僅當具名sink可調用時內嵌追蹤器名）。`any_sink_available` 驅動是否提供選項C（當具名追蹤器不可達但 `gh` 或harness任務原語可用時仍可提供）。
- **驗證提問工具預載（檢查清單，僅Claude Code）。** 於Claude Code中觸發路由提問前，確認 `AskUserQuestion` 已載入（依本技能頂部 Interactive mode rules）。若本次會話尚未載入，現調 `ToolSearch` 查詢 `select:AskUserQuestion`。未經此驗證勿進入路由提問。以敘述文本渲染提問為缺陷，非有效後備。Codex（`request_user_input`）及Gemini（`ask_user`）此檢查清單不適用——平台原生提問工具預設已載，無 `ToolSearch` 預載步驟。
- **路由提問。** 以平台之阻塞式提問工具（Claude Code之 `AskUserQuestion`、Codex之 `request_user_input`、Gemini之 `ask_user`）提問。題幹：`What should the agent do with the remaining N findings?`——用第三人稱指「the agent」，非第一人稱 "me"/"I"。選項：

  ```
  (A) Review each finding one by one — accept the recommendation or choose another action
  (B) LFG. Apply the agent's best-judgment action per finding
  (C) File a [TRACKER] ticket per finding without applying fixes
  (D) Report only — take no further action
  ```

  依 `references/tracker-defer.md` 渲染選項C：當 `confidence = high` 且 `named_sink_available = true` 時，以具體名替換 `[TRACKER]` 並保留全標籤（如 `File a Linear ticket per finding without applying fixes`）。當 `any_sink_available = true` 但 `confidence = low` 或 `named_sink_available = false` 時（後備層如GitHub Issues或harness任務原語可用），用通用標籤 `File an issue per finding without applying fixes`——此為全標籤替換，非 `[TRACKER]` 代換。當 `any_sink_available = false` 時，**完全省略選項C**，於題幹加一行解釋（如 `Defer unavailable — no tracker or task-tracking primitive detected on this platform.`）。餘三選項（A、B、D）存留。

  編號列表文本後備僅當 `ToolSearch` 對平台提問工具顯式無匹配或工具調用出錯時適用。不適用於代理僅未載入工具之情況——此時現載入之（見上方驗證清單）。於確無阻塞式提問工具之平台上，以編號列表呈現適用選項，等候用戶回覆。

- **按選擇分派。** 以選項字母（A / B / C / D）路由，非渲染標籤字串。選項C標籤因追蹤器偵測信心而異（具名追蹤器用 `File a [TRACKER] ticket per finding without applying fixes`，通用後備用 `File an issue per finding without applying fixes`，或無sink時完全省略——見 `references/tracker-defer.md`），選項A / B / D各有一個標準標籤。字母為穩定分派信號；下方標準標籤僅供文檔。低信心運行以通用標籤渲染選項C者與高信心運行以具名追蹤器渲染者路由至同一分支。
  - (A) `Review each finding one by one`——載 `references/walkthrough.md` 進入逐發現逐步迴圈。逐步過程在記憶中累積Apply決策；Defer決策透過 `references/tracker-defer.md` 行內執行；Skip / Acknowledge 決策記為無動作；`LFG the rest` 透過 `references/bulk-preview.md` 路由。迴圈結束後，為累積之Apply集分派一個修復子代理（Step 3）。發統一完成報告。
  - (B) `LFG. Apply the agent's best-judgment action per finding`——載 `references/bulk-preview.md`，範圍為一切待決之 `gated_auto` / `manual` 發現。`Proceed` 時執行計劃：Apply集 → Step 3 修復分派；Defer集 → `references/tracker-defer.md`；Skip / Acknowledge → 無操作。`Cancel` 時返至此路由提問。執行後發統一完成報告。
  - (C) `File a [TRACKER] ticket per finding without applying fixes`（或通用 `File an issue per finding without applying fixes`，當具名追蹤器標籤未使用時）——載 `references/bulk-preview.md`，將每個待決發現置於建票桶（不論代理自然推薦）。`Proceed` 時，每發現路由至 `references/tracker-defer.md`；不施修復。`Cancel` 時返至此路由提問。發統一完成報告。
  - (D) `Report only — take no further action`——不進入任何分派階段。發完成報告，然後依 Step 5 之門控規則進行（`fixes_applied_count > 0` 來自早期 `safe_auto` 輪）。若本次運行無修復已施，報告後止。

- 逐步完成報告、LFG / 建票完成報告及零剩餘完成摘要皆遵循 `references/walkthrough.md` 所載之統一完成報告結構。每個終端路徑用相同結構。

**Autofix mode**

- 不提問。
- 僅施 `safe_auto -> review-fixer` 佇列。
- 留 `gated_auto`、`manual`、`human`、`release` 項未決。
- 僅為最終owner為 `downstream-resolver` 之未決可操作發現備殘餘工作。

**Report-only mode**

- 不提問。
- 不建修復佇列。
- 不建殘餘待辦或 `.context` 產物。
- Stage 6 後止。一切留於報告中。

**Headless mode**

- 不提問。
- 僅於單趟中施 `safe_auto -> review-fixer` 佇列。不進入有界重審迴圈（Step 3）。分派一個修復子代理，施修復，然後直接進入 Step 4。
- 留 `gated_auto`、`manual`、`human`、`release` 項未決——出現於結構化文本輸出。
- 輸出無頭輸出信封（見 Stage 6）而非交互報告。
- 寫運行產物（Step 4）但不建待辦檔。
- 結構化文本輸出及 "Review complete" 信號後止。不提交/推送/建PR。

#### Step 3: Apply fixes with one fixer and bounded rounds

- 於當前checkout為當前修復佇列分派且僅分派一個修復子代理。該修復器於一輪中施一切核准變更並運行相關定向測試，對一致之樹。
- 勿對同一checkout散開多個修復器。並行修復器需隔離worktree/分支及刻意之合併回。
- 修復落地後僅重審變更範圍。
- 以 `max_rounds: 2` 界限迴圈。若二輪後仍有問題，止並移交為殘餘工作或報告為未決。
- 若任何已施發現有 `requires_verification: true`，該輪於定向驗證運行前未完成。
- 勿於同一checkout與瀏覽器測試並行啟動變異審閱輪。需兩者之未來編排器須於並行階段運行 `mode:report-only` 或於其自身checkout/worktree中隔離變異審閱。

#### Step 4: Emit artifacts and downstream handoff

- 於interactive、autofix及headless模式，寫每次運行產物於 `.context/compound-engineering/ce-code-review/<run-id>/`，含：
  - 合成發現（Stage 5 合併輸出）
  - 已施修復
  - 殘餘可操作工作
  - 唯advisory輸出
  每代理完整細節JSON檔（`{reviewer_name}.json`）已自 Stage 4 分派時存在於此目錄。
- 亦寫 `metadata.json` 於發現旁，俾下游技能（如 `ce-polish-beta`）可驗產物匹配當前分支及HEAD。最小欄位：
  ```json
  {
    "run_id": "<run-id>",
    "branch": "<git branch --show-current at dispatch time>",
    "head_sha": "<git rev-parse HEAD at dispatch time>",
    "verdict": "<Ready to merge | Ready with fixes | Not ready>",
    "completed_at": "<ISO 8601 UTC timestamp>"
  }
  ```
  於分派時（任何autofix落地前）取 `branch` 及 `head_sha`，verdict定案後寫檔。此檔為附加——先於此欄位之既有產物仍有效，下游技能於缺此欄位時回退至檔案mtime。
- 於autofix模式，僅為最終owner為 `downstream-resolver` 之未決可操作發現創建持久待辦檔。載 `ce-todo-create` 技能取正規目錄路徑、命名慣例、YAML frontmatter結構及模板。每待辦應將發現嚴重度映射至待辦優先級（`P0`/`P1` -> `p1`、`P2` -> `p2`、`P3` -> `p3`）並設 `status: ready`，因這些發現已由合成分診。
- 勿為 `advisory` 發現、`owner: human`、`owner: release` 或受保護產物清理建議建待辦。
- 若僅餘advisory輸出，不建待辦。
- Interactive模式可於修復後提供外部化殘餘可操作工作，但非完成審閱之必要。

#### Step 5: Final next steps

**僅Interactive模式。** 修復-審閱循環完成後（淨verdict或用戶選擇停止），依進入模式提供後續步驟。已知時重用 Stage 1 所解之審閱基分支/預設分支；勿硬編碼僅 `main`/`master`。

**門控為本次運行已施修復總數，非路由選項。** 追蹤 `fixes_applied_count` 跨整個Interactive調用。此計數器含路由提問前自動施用之 `safe_auto` 修復（見 Step 2 Interactive mode）及路由選項A（逐步）或選項B（LFG）所執行之任何Apply決策。路由選項C（建票）及D（僅報告）加零於計數器；僅以Skip / Defer / Acknowledge結束之逐步過程亦然，一切推薦為Defer / Skip / Acknowledge之LFG亦然。

Step 5 僅於 `fixes_applied_count > 0` 時運行。若計數器為零——無 `safe_auto` 修復已施且路由路徑未產生額外Apply——跳過 Step 5 並於完成報告後退出。工作樹無變更時問「推送修復？」為不合邏輯。

常見結果：

- `safe_auto` 產生修復且用戶選任何路由選項 → Step 5 運行（僅safe_auto輪即 counter > 0）。
- 無 `safe_auto` 修復且用戶選選項C或D → Step 5 跳過。
- 無 `safe_auto` 修復且逐步 / LFG 以零Apply結束 → Step 5 跳過。
- 零剩餘情況（`safe_auto` 後無 `gated_auto` / `manual`）且至少一個 `safe_auto` 修復 → Step 5 運行；路由提問未被問但 counter > 0。

- **PR模式（經PR號/URL進入）：**
  - **Push fixes** -- 推送提交至既有PR分支
  - **Exit** -- 暫止
- **Branch模式（特性分支無PR，且非已解審閱基分支/預設分支）：**
  - **Create a PR (Recommended)** -- 推送並建pull request
  - **Continue without PR** -- 留於分支
  - **Exit** -- 暫止
- **於已解審閱基分支/預設分支：**
  - **Continue** -- 繼續後續步驟
  - **Exit** -- 暫止

若 "Create a PR"：先以 `git push --set-upstream origin HEAD` 發布分支，然後以 `gh pr create` 建PR，標題及摘要取自分支變更。
若 "Push fixes"：以 `git push` 推送分支更新既有PR。

**Autofix、report-only及headless模式：** 報告、產物發出及殘餘工作移交後止。不提交、推送或建PR。

## Fallback

若平台不支持並行子代理，依序運行審者。其餘一切（階段、輸出格式、合併管線）保持不變。

---

## Included References

### Persona Catalog

@./references/persona-catalog.md

### Subagent Template

@./references/subagent-template.md

### Diff Scope Rules

@./references/diff-scope.md

### Findings Schema

@./references/findings-schema.json

### Review Output Template

@./references/review-output-template.md
