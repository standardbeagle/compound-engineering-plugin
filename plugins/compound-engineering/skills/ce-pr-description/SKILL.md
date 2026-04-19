---
name: ce-pr-description
description: "Write or regenerate a value-first pull-request description (title + body) for the current branch's commits or for a specified PR. Use when the user says 'write a PR description', 'refresh the PR description', 'regenerate the PR body', 'rewrite this PR', 'freshen the PR', 'update the PR description', 'draft a PR body for this diff', 'describe this PR properly', 'generate the PR title', or pastes a GitHub PR URL / #NN / number. Also used internally by ce-commit-push-pr (single-PR flow) and ce-pr-stack (per-layer stack descriptions) so all callers share one writing voice. Input is a natural-language prompt. A PR reference (a full GitHub PR URL, `pr:561`, `#561`, or a bare number alone) picks a specific PR; anything else is treated as optional steering for the default 'describe my current branch' mode. Returns structured {title, body_file} (body written to an OS temp file) for the caller to apply via gh pr edit or gh pr create — this skill never edits the PR itself and never prompts for confirmation."
argument-hint: "[PR ref e.g. pr:561 | #561 | URL] [free-text steering]"
---

# CE PR 描述

生 convention-commit 體題與價值為先之 PR 本文。返 `{title, body_file}` 結構，供調用者施用——此技不調 `gh pr edit` 或 `gh pr create`，亦不索確認。

何以別立一技：數調用者需同源撰述之理，而 `ce-commit-push-pr` 中之單 PR 交互腳手不宜共取。`ce-pr-stack` 逐層批量調之，`ce-commit-push-pr` 於全流及刷新路徑中調之。抽取以存一源之真。

**命名理據：** `ce-pr-description`，非 `git-pr-description`。堆疊與 PR 創建乃 GitHub 功能；名中 "PR" 指 GitHub 文物。`ce-` 前綴循插件命名之例。

---

## 輸入

輸入為自由格式之提示。析為二部：

- **PR 引用，若有。** 下列諸式皆可：完整 GitHub PR URL（`https://github.com/owner/repo/pull/NN`）、`pr:<number>` 或 `pr:<URL>`、裸 `#NN`、或參數獨為數字（`561`）。取其引用，餘為導引文本。
- **餘者皆導引文本**（如「著重基準測試」或「善述效能敘事」之類）。可與 PR 引用並存，亦可獨行。

無須特定語法——以自然語言讀之，辨其 PR 引用。若無引用，預設描述當前分支。

### 模式選擇

| 調用者所傳 | 模式 |
|---|---|
| 無 PR 引用（空參或僅導引文本） | **當前分支模式** — 述 HEAD 相對倉庫預設基之提交 |
| PR 引用（URL、`pr:`、`#NN`、裸數） | **PR 模式** — 述所指 PR |

導引文本恆為可選。若在，與差異所生敘事並用；勿令其凌駕價值為先之原則，亦勿憑空捏造差異所無之內容。

**可選 `base:<ref>` 覆寫（僅當前分支模式）。** 調用者已知目標基分支時（如 `ce-commit-push-pr` 測得 `origin/develop` 或 `origin/release/2026-04`），可傳 `base:<ref>` 以定之。引用須本地可解。此覆寫當前分支模式之自動偵測；PR 模式忽之（PR 已藉 `baseRefName` 自定其基）。多數調用不需此——自動偵測（既有 PR 之 `baseRefName` → `origin/HEAD`）足矣。

**示例**:

- `ce-pr-description` → 當前分支，無焦點，自動偵測基
- `ce-pr-description emphasize the benchmarks` → 當前分支，焦點 = "emphasize the benchmarks"
- `ce-pr-description base:origin/develop` → 當前分支，基定於 `origin/develop`
- `ce-pr-description base:origin/develop emphasize perf` → 同上 + 焦點
- `ce-pr-description pr:561` → PR #561，無焦點
- `ce-pr-description #561 do a good job with the perf story` → PR #561，焦點 = "do a good job with the perf story"
- `ce-pr-description https://github.com/foo/bar/pull/561 emphasize safety` → foo/bar 之 PR #561，焦點 = "emphasize safety"

## 輸出

返結構化結果，含二欄：

- **`title`** -- convention-commit 格式：`type: description` 或 `type(scope): description`。七十二字符以內。`type` 依意圖選（feat/fix/refactor/docs/chore/perf/test），非依檔類。取最狹有用之 `scope`（技能或代理名、CLI 區域、共享標籤）；無益則省。
- **`body_file`** -- OS 臨時檔之絕對路徑（以 `mktemp` 建），內含循下述原則所撰之本文 Markdown。勿將本文內嵌於返值。

調用者決定以 `gh pr edit`、`gh pr create` 施之或棄之，自 `body_file` 讀取（如 `--body "$(cat "$BODY_FILE")"`）。此技不調此等指令。無須清理——`mktemp` 檔居 OS 臨時處，系統自會回收。

---

## 此技不為之事

- 無交互確認提示。若差異含混（如焦點與實際變更相牾），於輸出中揭露或呈予調用者——勿直接問用戶。
- 無分支切換。當前分支模式述用戶當前檢出之 HEAD；PR 模式述所指 PR。皆不切分支。
- 無比較確認敘事。描述所述為終態；比較確認之框架歸調用者。
- 不自動以 `gh pr edit` 或 `gh pr create` 施用。返輸出即止。

交互腳手（確認提示、比較確認、施用步驟）乃調用者之責。

---

## 步驟一：解析差異與提交清單

析輸入（見上）並依模式分支。

### 當前分支模式（無 PR 引用時之預設）

以下列優先序定比較之基：

1. **調用者所傳 `base:<ref>`** — 若在，直用之。調用者斷言正確之基。引用須本地可解。
2. **既有 PR 之 `baseRefName`** — 若當前分支於此倉已有開放 PR，用其基。處理目標非預設基（如 `develop`）之特性分支。
3. **倉庫預設（`origin/HEAD`）** — 無 PR 亦無調用者所傳基時之後備。

```bash
# Detect current branch (fail if detached HEAD)
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "Detached HEAD — current-branch mode requires a branch. Pass a PR reference instead."
  exit 1
fi

# Priority: caller-supplied base: > existing PR's baseRefName > origin/HEAD
if [ -n "$CALLER_BASE" ]; then
  BASE_REF="$CALLER_BASE"
else
  EXISTING_PR_BASE=$(gh pr view --json baseRefName --jq '.baseRefName' 2>/dev/null)
  if [ -n "$EXISTING_PR_BASE" ]; then
    BASE_REF="origin/$EXISTING_PR_BASE"
  else
    BASE_REF=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null)
    BASE_REF="${BASE_REF:-origin/main}"
  fi
fi
```

若 `$BASE_REF` 本地不可解（`git rev-parse --verify "$BASE_REF"` 失敗），調用者（或用戶）需先取之。以 `"Base ref $BASE_REF does not resolve locally. Fetch it before invoking the skill."` 優雅退出——勿試恢復。

取合併基、提交清單及全量差異：

```bash
MERGE_BASE=$(git merge-base "$BASE_REF" HEAD) && echo "MERGE_BASE=$MERGE_BASE" && echo '=== COMMITS ===' && git log --oneline $MERGE_BASE..HEAD && echo '=== DIFF ===' && git diff $MERGE_BASE...HEAD
```

若提交清單為空，報 `"No commits between $BASE_REF and HEAD"` 並優雅退出——無可述者。

若步驟一中發現既有 PR，亦取其本文，供步驟三憑證保全之用。

### PR 模式（輸入含 PR 引用時）

正規化引用為 `gh pr view` 所受之形：裸數（`561`）、完整 URL（`https://github.com/owner/repo/pull/561`）、或自 `pr:561`/`#561` 所取之數。`gh pr view` 之位置參數受裸數、URL 及分支名——不受 `owner/repo#NN` 簡寫。跨倉數字引用無 URL 時，調用者用 `-R owner/repo`；此技受完整 URL 為最簡跨倉路徑，多數調用者亦用此。

```bash
gh pr view <pr-ref> --json number,state,title,body,baseRefName,baseRefOid,headRefName,headRefOid,headRepository,headRepositoryOwner,isCrossRepository,commits,url
```

關鍵 JSON 欄：`headRefOid`（PR 頭 SHA——優先於索引 `commits`）、`baseRefOid`（基分支 SHA）、`headRepository` + `headRepositoryOwner`（PR 來源倉）、`isCrossRepository`。無 `baseRepository` 欄——基倉即 `gh pr view` 所查之倉。

若返 `state` 非 `OPEN`，報 `"PR <number> is <state> (not open); cannot regenerate description"` 並優雅退出不輸出。期望 `{title, body_file}` 之調用者須處此空況。

**判 PR 是否居當前工作目錄之倉**，藉解析 URL 之 `<owner>/<repo>` 路徑段並與 `git remote get-url origin` 比對（去 `.git` 後綴；兼處 `git@github.com:owner/repo` 與 `https://github.com/owner/repo`）。若 URL 倉與 `origin` 倉相符，走本地 Git 路徑（情甲）。否則走僅 API 路徑（情乙）。裸數與 `#NN` 隱指當前倉 → 情甲。

**情甲 → 情乙後備：** URL 倉雖與 `origin` 相符，本地克隆或不可用於此 PR 之引用——淺克隆、缺少基分支之分離態、離線、認證問題、GHES 怪癖。若情甲之取或 `git merge-base` 失敗，退至情乙而非令技失敗。於調用者可見之輸出中註明後備。

**情甲 — PR 在當前倉：**

自上 JSON 響應直取 PR 頭 SHA `headRefOid`。一次調用取基引用與頭 SHA（引用已本地時取冪等）：

```bash
PR_HEAD_SHA=<headRefOid from JSON>
git fetch --no-tags origin <baseRefName> $PR_HEAD_SHA
```

下游指令用顯式 `$PR_HEAD_SHA`，避 `FETCH_HEAD` 多引用排序之弊（`git rev-parse FETCH_HEAD` 僅返首取引用之 SHA，多引用取時暗損）。

```bash
MERGE_BASE=$(git merge-base origin/<baseRefName> $PR_HEAD_SHA) && echo "MERGE_BASE=$MERGE_BASE" && echo '=== COMMITS ===' && git log --oneline $MERGE_BASE..$PR_HEAD_SHA && echo '=== DIFF ===' && git diff $MERGE_BASE...$PR_HEAD_SHA
```

若顯式 SHA 取遭拒（GitHub 罕見，某些 GHES 配置禁取非尖端 SHA 可遇），退取 `refs/pull/<number>/head` 並自 `.git/FETCH_HEAD` 按 PR 引用模式讀頭 SHA：

```bash
git fetch --no-tags origin "refs/pull/<number>/head"
PR_HEAD_SHA=$(awk '/refs\/pull\/[0-9]+\/head/ {print $1; exit}' "$(git rev-parse --git-dir)/FETCH_HEAD")
```

**情乙 — PR 在異倉：**

盡略本地 Git。自 API 讀差異與提交清單：

```bash
gh pr diff <pr-ref>
gh pr view <pr-ref> --json commits --jq '.commits[] | [.oid[0:7], .messageHeadline] | @tsv'
```

分類、框架、撰述管線同。於調用者可見之輸出中註明使用 API 後備。

亦取既有 PR 本文供步驟三憑證保全（二情皆然）。

---

## 步驟二：撰前分類提交

遍覽提交清單，逐一分類：

- **特性提交** — 實現 PR 意圖（新功能、有意的重構、設計變更）。此驅動描述。
- **修補提交** — 迭代之功（碼審修復、lint 修、測試修、變基解決、風格清理）。讀者不可見。

度量描述時，心扣修補提交：十二提交而九為修補者，實三提交之 PR 也。

---

## 步驟三：憑證決策

自全分支差異判憑證採集是否可行。

**憑證可行**：差異變更可觀察之行為，可自工作區演示——UI、CLI 輸出、可執行碼之 API 行為、生成文物、工作流輸出。

**憑證不可行**：
- 純文檔、純 Markdown、純更新日誌、發布元數據、純 CI/配置、純測試、純內部重構
- 行為需不可得之憑證、付費/雲服務、機器人令牌、僅部署基礎設施、或未提供之硬體

**此技不提示用戶採集憑證。** 決策邏輯：

1. **PR 模式調用**（任何形式：裸數、`#NN`、`pr:<N>`、完整 URL——凡解析為既有 PR 且已取其本文者）**且既有本文含 `## Demo` 或 `## Screenshots` 段並含圖片嵌入：** 原文保留，除非導引文本要求刷新或移除。將保留之塊納入返還之本文。此不拘輸入形式；關鍵在 PR 存在且其本文已讀。
2. **當前分支模式或 PR 模式無憑證塊：** 盡略憑證段。調用者若欲採集，自責另調 `ce-demo-reel` 並拼合結果，或俟採集後以更新之導引文本令此技再生。

勿標測試輸出為 "Demo" 或 "Screenshots"。任何保留之憑證塊置於 Compound Engineering 徽章之前。

---

## 步驟四：度量前構建敘事框架

闡述 PR 之敘事框架：

1. **之前**：何者損壞、受限、或不可為？（一句。）
2. **之後**：今有何可能或改善？（一句。）
3. **範圍理據**（僅當有二以上可分離之關切）：何以並投？（一句。）

此框架即開篇。小型簡單 PR，"之後" 一句或即全部描述。

---

## 步驟五：度量變更

衡大小（檔案數、差異量）與複雜度（設計決策、權衡、跨切關切）以選描述深度：

| 變更輪廓 | 描述方式 |
|---|---|
| 小而簡（筆誤、配置、依賴升級） | 一二句，無標題。約三百字符內。 |
| 小而繁（缺陷修、行為變更） | 短敘事，約三至五句。無標題，除非有二不同關切。 |
| 中型特性或重構 | 敘事框架（之前/之後/範圍），繼以所變與其理。指出設計決策。 |
| 大型或架構意義重大 | 完整敘事：問題背景、方案（及其理）、關鍵決策、遷移/回退（若相關）。 |
| 效能改善 | 若有度量，含之前/之後。Markdown 表格為佳。 |

疑則取短。描述之重當匹變更之重。

---

## 步驟六：施用撰述原則

### 撰述語調

若倉庫上下文中有文檔化之風格偏好，從之。否則：

- 主動語態。不用破折號或 `--` 代用品；用句號、逗號、冒號、或括號。
- 變換句長。勿連三等長之句。
- 勿先斷言後即釋之。信讀者。
- 純英文。技術術語可用；商務術語禁用。
- 無贅詞："it's worth noting"、"importantly"、"essentially"、"in order to"、"leverage"、"utilize"。
- 數字用阿拉伯數字（"3 files"），非文字（"three files"）。

### 撰述原則

- **價值為先**：以今可為或已修者開篇，非以所搬移者。微妙的失敗是以機制開篇（"Replace the hardcoded capture block with a tiered skill"）而非以結果開篇（"Evidence capture now works for CLI tools and libraries, not just web apps"）。
- **無孤立開篇段**：若描述某處用 `##` 標題，開篇亦須在標題下（如 `## Summary`）。短描述無分節者，裸段可也。
- **述淨結果，非歷程**：描述所述為終態，非所經之路。無迭代歷史、除錯步驟、中間失敗、或開發中發現並修復之缺陷。重新生成既有 PR 時亦然：自當前狀態重寫，非為上一版後變更之誌。例外：理解設計抉擇所必需之過程細節。
- **提交相牾時，信終差異**：提交清單為輔助上下文，非真源。提交描述其後已修正或回退之中間步驟者，以全分支差異描述終態。
- **釋不明顯者**：差異自明則不敘。以篇幅述差異所未見者：何以取此方案、何者見棄、審閱者應注意何處。
- **結構當有所值方用**：標題、要點、表格助理解，非必備模板段。
- **Markdown 表格述數據**：之前/之後比較、效能數值、或選項權衡以表格傳達為佳。
- **無空段**：段不適用則省之。勿書 "N/A" 或 "None"。
- **測試方案——僅當不明顯時**：測試需審閱者未必想到之邊界情況、難以驗證之行為、或特定設置時方含。「跑測試」為唯一有用指引時省之。分支增測試檔時，以其所覆者名之。

### 視覺傳達

僅當變更結構複雜至審閱者難自散文重建心智模型時，方含視覺輔助。

**核心區別——結構 vs. 平行變體：**

- **Mermaid 圖**用於變更具**拓撲**——組件間有向關係（調用、流、依賴、狀態轉換、數據路徑）。圖表達 "A 與 B 通，B 與 C 通，C 不與 A 通"，表格所不能。
- **Markdown 表格**用於變更具**單形之平行變體**——N 物共享相同屬性而值異。表格利 "選項一耗 X，選項二耗 Y，選項三耗 Z"。

架構變更幾皆為拓撲（組件 + 邊），故 Mermaid 常為正選——"交互組件"之表格失邊而成平表。保留表格於真正平行數據：之前/之後度量、選項權衡、旗標矩陣、配置列舉。

**何時含（架構/流優選 Mermaid，非表格）：**

| PR 變更... | 視覺輔助 |
|---|---|
| 架構觸及三以上交互組件（組件有*有向關係*——誰調誰、誰擁何物、哪個技能委託哪個） | **Mermaid** 組件或交互圖。勿以表格代之——表格不能示邊。 |
| 多步工作流或數據流，順序不明顯 | **Mermaid** 流程圖 |
| 三以上狀態且轉換非平凡之狀態機 | **Mermaid** 狀態圖 |
| 數據模型變更涉及三以上相關實體 | **Mermaid** ERD |
| 之前/之後效能或行為度量（同一指標，不同值） | **Markdown 表格** |
| 選項或旗標權衡（同一屬性跨變體評估） | **Markdown 表格** |
| 特性矩陣 / 相容性網格 | **Markdown 表格** |

**疑則問：「信息有邊（A → B）抑或有行（屬性 × 變體）？」** 邊 → Mermaid。行 → 表格。架構幾乎定義上即有邊。

**何時略一切視覺：**
- 度量歸為 "一二句"
- 散文已明晰傳達
- 圖僅視覺重述差異
- 機械變更（更名、依賴升級、配置、格式化）

**格式細節：**
- **Mermaid**（拓撲預設）。五至十節點為常，極複雜者至多十五。用 `TB` 方向。源碼當可讀作後備。
- **ASCII 圖**用於需豐富框內標註之流程。八十列為限。
- **Markdown 表格**僅用於平行變體數據。
- 置於相關處之內聯，非獨立段落。
- 散文與視覺衝突時，以散文為準。

含入前驗證所生圖表。

### 編號與引用

PR 描述中勿前置列表項以 `#`——GitHub 將 `#1`、`#2` 解析為議題引用並自動連結。

引用實際 GitHub 議題或 PR 時，用 `org/repo#123` 或完整 URL。勿用裸 `#123`，除非已驗證。

### 施用焦點提示

若提供 `focus:` 提示，與差異所生敘事並用。以焦點為導引，非覆寫：勿捏造差異所無之內容，亦勿因焦點未提而壓抑差異所要求之重要內容。焦點與差異實質相牾時（如焦點曰 "include benchmarking" 而差異無基準測試），以調用者可見之方式註明衝突（留簡短內聯註或呈予調用者），而非捏造內容。

---

## 步驟七：構建標題

標題格式：`type: description` 或 `type(scope): description`。

- **Type** 依意圖選，非依檔案副檔名。`feat` 為新功能，`fix` 為缺陷修，`refactor` 為行為保持不變之變更，`docs` 為純文檔，`chore` 為工具/維護，`perf` 為效能，`test` 為純測試。
- **Scope**（可選）為最狹有用標籤：技能/代理名、CLI 區域、或共享區域。無益則省。
- **Description** 為祈使語態，小寫，全長七十二字符以內。無尾隨句號。
- 若倉庫近期提交有可見之提交標題慣例，從之。

破壞性變更用 `!`（如 `feat!: ...`）或於本文中以 `BREAKING CHANGE:` 頁腳文檔化。

---

## 步驟八：構建本文

依此序組裝本文：

1. **開篇** — 步驟四之敘事框架，以步驟五所選深度。若描述某處用 `##` 標題，則在標題下（如 `## Summary`）；否則裸段。
2. **本文各段** — 僅為此變更所值之段落：所變與其理、設計決策、數據表格、複雜度所需之視覺輔助。盡略空段。
3. **測試方案** — 僅當撰述原則所定之不明顯時。否則省之。
4. **憑證塊** — 僅步驟三所保留之塊，若有。勿捏造或佔位。
5. **Compound Engineering 徽章** — 以 `---` 分隔線附加徽章頁腳。既有本文（`pr:` 輸入）已含徽章時略之。

**徽章：**

```markdown
---

[![Compound Engineering](https://img.shields.io/badge/Built_with-Compound_Engineering-6366f1)](https://github.com/EveryInc/compound-engineering-plugin)
![HARNESS](https://img.shields.io/badge/MODEL_SLUG-COLOR?logo=LOGO&logoColor=white)
```

**Harness 對照：**

| Harness | `LOGO` | `COLOR` |
|---------|--------|---------|
| Claude Code | `claude` | `D97757` |
| Codex | (omit logo param) | `000000` |
| Gemini CLI | `googlegemini` | `4285F4` |

**模型標識：** 空格替為下劃線。若已知，附上下文窗口與思考等級。示例：`Opus_4.6_(1M,_Extended_Thinking)`、`Sonnet_4.6_(200K)`、`Gemini_3.1_Pro`。

---

## 步驟九：返 `{title, body_file}`

將所構本文寫入 OS 臨時檔，然後返標題與檔案路徑。勿調 `gh pr edit`、`gh pr create` 或任何變更指令。勿問用戶確認——調用者主施用。

```bash
BODY_FILE=$(mktemp "${TMPDIR:-/tmp}/ce-pr-body.XXXXXX") && cat > "$BODY_FILE" <<'__CE_PR_BODY_END__' && echo "$BODY_FILE"
<the composed body markdown goes here, verbatim>
__CE_PR_BODY_END__
```

引號哨兵 `'__CE_PR_BODY_END__'` 使 `$VAR`、反引號、`${...}` 及任何字面 `EOF` 不被展開或與終止符衝突。以 `&&` 鏈接 `echo "$BODY_FILE"`，使 `mktemp` 或寫入失敗時不會產生指向缺失檔案之成功退出態與路徑。

格式返值為清晰標記之塊，調用者可乾淨提取：

```
=== TITLE ===
<title line>

=== BODY_FILE ===
<absolute path to the mktemp body file>
```

勿於返值塊中輸出本文 Markdown——調用者自 `BODY_FILE` 讀之。

若步驟一優雅退出（已關閉/合併之 PR、無效範圍、空提交清單），不建本文檔——僅返原因字串。

**返值塊乃交接，非任務完成。** 被父技能調用時（如 `git-commit-push-pr`），輸出返值塊後繼續執行父技能之後續步驟（通常為以所返標題與本文檔調 `gh pr create` 或 `gh pr edit`）。除非用戶直接調用且無父工作流，勿於返值塊後停止。

---

## 跨平台備註

此技不直接發問。若差異對調用者應決之事含混（如焦點與實際變更相牾，或憑證技術上可採集但調用者未預備），於輸出或簡短註記中揭露——勿調用平台發問工具。

需向用戶發問之調用者，自責用其平台之阻塞發問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）於此技前後調用。
