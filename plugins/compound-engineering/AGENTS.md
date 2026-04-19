# 插件指引

此指引適用於 `plugins/compound-engineering/` 下之作業，補充根 `AGENTS.md`。

# 複合工程插件開發

## 版本要求

**重要**：常規PR不應為此插件發版。

倉庫以自動化流程發版，含版本選定與更新日誌生成。多PR可能合併於下次發版前，貢獻者無從知曉最終版本。

### 貢獻者守則

- **勿**於常規PR手動提升 `.claude-plugin/plugin.json` 版本
- **勿**於常規PR手動提升 `.claude-plugin/marketplace.json` 版本
- **勿**於根 `CHANGELOG.md` 手動新增發版段落
- 應更新實質文檔（`README.md`、組件表、用法說明、計數等），以免失準

### 提交前清單

提交任何變更前：

- [ ] `.claude-plugin/plugin.json` 無手動版本提升
- [ ] `.claude-plugin/marketplace.json` 無手動版本提升
- [ ] 根 `CHANGELOG.md` 無手動發版條目
- [ ] `README.md` 組件計數已驗
- [ ] `README.md` 表格準確（代理、指令、技能）
- [ ] `plugin.json` 描述與當前計數相符

### 目錄結構

```
agents/
├── review/           # 碼審代理
├── document-review/  # 計劃與需求文檔審查代理
├── research/         # 研究分析代理
├── design/           # 設計與UI代理
└── docs/             # 文檔代理

skills/
├── ce-*/          # 核心工作流技能 (ce-plan, ce-code-review 等)
└── */             # 其餘技能
```

> **註：** 指令於v2.39.0遷移至技能。所有昔日 `/command-name` 斜線指令今存於 `skills/command-name/SKILL.md`，Claude Code中運作如初。其他目標可能另行轉換或映射。

## 除錯插件缺陷

插件開發者亦透過市場安裝使用（`~/.claude/plugins/`）。開發者回報技能或代理缺陷時，已安裝版本或舊於倉庫。以glob搜尋組件名於 `~/.claude/plugins/`，比對已安裝內容與倉庫版本。

- **倉庫已有修正**：安裝版本過舊。告其重裝或以 `--plugin-dir` 載入倉庫技能。無需改碼。
- **兩版皆有缺陷**：如常修正。

重要：已安裝版本雖或過舊，新舊版本可能皆有同一缺陷。正確做法仍為修正倉庫版本。

## 命名慣例

**所有技能與代理** 使用 `ce-` 前綴以明確標識為 compound-engineering 組件：
- `/ce-brainstorm` - 規劃前探索需求與方案
- `/ce-plan` - 創建實施計劃
- `/ce-code-review` - 執行全面碼審
- `/ce-work` - 系統化執行工作項
- `/ce-compound` - 記錄已解決問題

**何以 `ce-`？** Claude Code內建 `/plan` 與 `/review` 指令。`ce-` 前綴（compound-engineering之略）使人即知此組件屬本插件。用連字符而非冒號，避免Windows檔案系統問題，並使目錄名與frontmatter名一致。

**代理** 亦循此慣例：`ce-adversarial-reviewer`、`ce-learnings-researcher` 等。技能中引用代理時，用分類限定格式：`<category>:ce-<agent-name>`（如 `review:ce-adversarial-reviewer`）。

## 已知外部限制

**Proof HITL顯示虛幻「AI協作者」代理**（記於2026-04-16，可能變更）：Proof API自動以合成 `ai:auto-<hash>` 身分加入無header之 `/state` 讀取，故 `skills/proof/` HITL工作流所建文檔會顯示虛幻參與者於 `Compound Engineering` 旁。唯一抑制方式為設 `ownerId: "agent:ai:compound-engineering"`——然此將文檔所有權轉予代理，使用者無法收入其Proof庫，故不用之。視為表面噪音；勿重啟 `ownerId` 變通。上游追蹤：https://github.com/EveryInc/proof/issues/951。

## 技能合規清單

新增或修改技能時，驗證是否符合技能規範：

### YAML Frontmatter（必須）

- [ ] `name:` 存在且與目錄名相符（lowercase-with-hyphens）
- [ ] `description:` 存在且描述**功能與觸發時機**（依官方規範："Explains code with diagrams. Use when exploring how code works."）
- [ ] `description:` 值含冒號時須加引號——未引號之冒號破壞 `js-yaml` 嚴格解析，致 `install --to opencode/codex` 崩潰。以 `bun test tests/frontmatter.test.ts` 驗證。
- [ ] `description:` 值不含原始角括號標記如 `<skill-name>`、`<tag>`、`<placeholder>`——Cowork插件驗證器將描述解析為HTML，拒絕未知標記並顯示通用「Plugin validation failed」橫幅（見issue #602）。Claude Code容許之，故缺陷僅於下游浮現。以反引號包裹（`` `<skill-name>` ``）或改寫。由 `tests/frontmatter.test.ts` 強制執行。

### 參考檔引用（references/ 存在時必須）

- [ ] 勿用markdown連結如 `[filename.md](./references/filename.md)`——代理將其解讀為Read指令，以CWD相對路徑執行，因CWD從非技能目錄而失敗
- [ ] **預設：用反引號路徑。** 大多數參考檔以反引號路徑引用，代理按需載入：
  ```
  `references/architecture-patterns.md`
  ```
  此保持技能精簡，避免載入時膨脹token佔用。適用於：大型參考文檔、路由表目標、程式碼腳手架、可執行腳本/模板
- [ ] **例外：小結構檔用 `@` 行內引入**——技能運作所必需且不超過~150行者（schema、輸出合約、子代理分派模板）。以 `@` 檔引入置於獨立行：
  ```
  @./references/schema.json
  ```
  此相對於SKILL.md解析，於模型可見前替換內容。若檔案超過~150行，即使必用亦應以反引號路徑引用
- [ ] 代理需*執行*之檔案（腳本、shell模板），必用反引號路徑——`@` 會將腳本作為文字內容行內嵌入，而非保持為可執行檔

### 條件式與後段提取

技能觸發時載入之內容隨後每則訊息攜帶——每次工具呼叫、代理分派及回應。此攜帶成本於會話中複利累積。對於編排多個工具/代理呼叫之技能，當區塊為條件式（僅於特定條件執行）或後段式（需多次前驅呼叫後方用）且佔技能相當份量（~20%+）時，提取至 `references/`。工具/代理呼叫越多，提取應越積極。以1-3行殘樁替換，載明條件及反引號路徑引用（如「讀取 `references/deepening-workflow.md`」）。勿以 `@` 引用提取區塊——其於載入時行內嵌入，破壞提取之目的。

### 行文風格

- [ ] 用祈使/不定式（動詞先行）
- [ ] 避免第二人稱（"you should"）——用客觀語言（"To accomplish X, do Y"）

### 理據紀律

`SKILL.md` 每行於每次調用時載入。僅當理據改變代理運行時行為方納入——若無該句行為無異，則刪之。

理據置於涵蓋範圍最廣之處；行為指令重述於其生效之處。500行技能不應仰賴代理記住第9行至第400行。可攜性備註、對代理不會犯之錯誤的防禦、以及關於本倉庫撰寫規則之元評論，應置於提交訊息或 `docs/solutions/`，而非技能正文。

### 跨平台用戶互動

- [ ] 技能需向用戶提問時，指示使用平台之阻塞式提問工具，並列舉已知等價工具（Claude Code之 `AskUserQuestion`、Codex之 `request_user_input`、Gemini之 `ask_user`）
- [ ] 含無提問工具環境之後備方案（如呈現編號選項，等候用戶回覆後方繼續）

### 互動式提問工具設計

阻塞式提問選單（`AskUserQuestion` / `request_user_input` / `ask_user`）之設計規則。違規於隱藏次要描述文字或截斷標籤之框架中悄然劣化UX。

- [ ] 每個選項標籤必須自足——部分框架僅呈現標籤，不呈現附帶描述；標籤本身須傳達選項功能
- [ ] 選項總數不超過4（`AskUserQuestion` 於所涉平台上限為4）
- [ ] 勿提供「仍在進行」/「稍後回來」選項——阻塞工具已等候；此類選項為空操作。若用戶需做他事，僅需保持提示開啟
- [ ] 標籤與題幹中以第三人稱指代理（"the agent"）——第一人稱 "me"/"I'll" 於工具中介之交換中含糊不清，無法分辨發言者為用戶、代理或工具
- [ ] 以用戶意圖措辭標籤，而非系統內部狀態——每個選項應能補完用戶視角之「我想___」；避免將模式名如 "end-sync" 或 "phase-3" 洩入標籤
- [ ] 以題幹作為首次機制之教學面——於該處教授機制（如「在Proof中反白文字以留言」），而非於可能被隱藏之選項描述中
- [ ] 更名顯示標籤時，同一編輯中更名其匹配之路由區塊（`**If user selects "X":**`）——模型以逐字標籤字串匹配選擇，遺漏更名則悄然破壞路由
- [ ] 選項共用前綴時，將區分詞前置——"Proceed to planning" 與 "Proceed directly to work" 截斷時外觀相同；將區分詞置於前3-4詞
- [ ] 產物不明確時指明目標——「save to my local file」優於「save to my file」，當多個產物（Proof文檔、本地markdown、快取副本）並存時
- [ ] 選單中保持語氣一致——同一組內混用祈使語氣（"Pause"）與用戶語氣狀態（"I'm done — save…"）讀來如同不同代理所撰

### 跨平台任務追蹤

- [ ] 技能需創建或追蹤任務時，描述意圖（如「創建任務列表」）並列舉已知等價工具（Claude Code之 `TaskCreate`/`TaskUpdate`/`TaskList`、Codex之 `update_plan`）
- [ ] 勿引用 `TodoWrite` 或 `TodoRead`——此為舊版Claude Code工具，已由 `TaskCreate`/`TaskUpdate`/`TaskList` 取代
- [ ] 技能分派子代理時，偏好並行執行，但為不支援並行分派之平台包含串行後備方案

### 技能中腳本路徑引用

- [ ] bash程式碼區塊中，以相對路徑引用同目錄腳本（如 `bash scripts/my-script ARG`）——而非 `${CLAUDE_PLUGIN_ROOT}` 或其他平台特定變數
- [ ] 所有平台相對於技能目錄解析腳本路徑；無需環境變數前綴
- [ ] 以反引號路徑引用腳本（如 `` `scripts/my-script` ``）以便代理定位；無需markdown連結，因bash程式碼區塊已提供呼叫方式

### 跨平台引用規則

本插件一次撰寫，轉換至其他代理平台。指令與代理於轉換時變換，但 `plugin.skills` 通常原樣複製。

- [ ] 故指令或代理內容中之斜線引用，若指向已發布指令，可接受；目標特定轉換可重映射。
- [ ] 透傳 `SKILL.md` 中，勿假定斜線引用會為另一平台重映射。按技能原樣複製後仍合理之方式撰寫引用。
- [ ] 一技能引用另一技能時，偏好語義措辭如「載入 `ce-doc-review` 技能」，而非斜線語法。
- [ ] 僅於引用已發布指令或工作流（如 `/ce-work` 或 `/ce-compound`）時使用斜線語法。

### 代理與技能中之工具選擇

探索碼庫之代理與技能必須偏好原生工具而非shell指令。

緣由：重度shell探索於子代理工作流中引發可避免之權限提示；原生檔案搜尋、內容搜尋及檔案讀取工具可避免之。

- [ ] 勿指示代理透過shell使用 `find`、`ls`、`cat`、`head`、`tail`、`grep`、`rg`、`wc` 或 `tree` 進行常規檔案發現、內容搜尋或檔案讀取
- [ ] 以能力類別描述工具並附平台提示——如「使用原生file-search/glob工具（如Claude Code之Glob）」——而非僅以Claude Code特定工具名稱
- [ ] shell為唯一選項時（如 `ast-grep`、`bundle show`、git指令），每次指示一條簡單指令——禁止動作鏈接（`cmd1 && cmd2`、`cmd1 ; cmd2`）與錯誤抑制（`2>/dev/null`、`|| true`）。兩項狹義例外：if/while守衛內之布林條件（`[ -n "$X" ] || [ -n "$Y" ]`）無妨——此為正常條件邏輯，非動作鏈接。**產值預備指令**（`VAR=$(cmd1) && cmd2 "$VAR"`）亦可，當 `cmd2` 嚴格消費 `cmd1` 輸出且拆分需跨bash呼叫手動穿線值時（如 `BODY_FILE=$(mktemp -u) && cat > "$BODY_FILE" <<EOF ... EOF`）。簡單管道（如 `| jq .field`）與輸出重定向（如 `> file`）在不掩蓋失敗時可接受
- [ ] **前置解析例外：** `!` 反引號前置解析指令於技能載入時執行，非代理運行時。可用鏈接（`&&`、`||`）、錯誤抑制（`2>/dev/null`）及後備哨兵（如 `|| echo '__NO_CONFIG__'`）以產生乾淨、可解析之值。此為環境探測（CLI可用性、配置檔讀取）之偏好模式。範例：`` !`command -v codex >/dev/null 2>&1 && echo "AVAILABLE" || echo "NOT_FOUND"` ``
- [ ] 原生工具可勝任時，勿為常規探索編碼shell配方；改為編碼意圖與偏好工具類別
- [ ] shell專用工作流（如 `gh`、`git`、`bundle show`、專案CLI），明確指令範例可接受，當其簡單、任務範圍內且未鏈接時

### 向子代理傳遞參考資料

技能編排需碼庫參考資料之子代理時，偏好傳遞檔案路徑而非檔案內容。子代理僅讀取所需。對於小型、靜態、全文消費之資料（如~50行以下之JSON schema），傳遞內容亦可。

### 子代理權限模式

分派子代理時，**省略 `mode` 參數**於Agent/Task工具呼叫，除非技能明確需要特定模式（如計劃審批工作流之 `mode: "plan"`）。傳遞 `mode: "auto"` 或任何其他值將覆蓋用戶已配置之權限設定（如用戶級配置之 `bypassPermissions`），此非常規子代理分派之所願。省略 `mode` 讓用戶自身之 `defaultMode` 設定生效。

### 從技能讀取配置檔

插件配置存於倉庫根 `.compound-engineering/config.local.yaml`。此檔被gitignore（機器本地設定），有兩個陷阱：

1. **路徑解析：** 勿相對於CWD讀取配置——用戶或從子目錄調用技能。始終從倉庫根解析。前置解析指令中，用 `git rev-parse --show-toplevel` 找根。

2. **Worktree：** Gitignored檔案為每worktree獨立。主checkout所建之配置檔於worktree中不存在。讀取配置時，若當前worktree缺檔，則回退至主倉庫根：
   ```
   !`cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || cat "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)")/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'`
   ```
   第一個 `cat` 嘗試當前worktree根。第二個從 `git-common-dir` 推導主倉庫根作後備。常規（非worktree）checkout中，兩路徑相同。

若兩路徑皆無此檔，回退至預設值——勿因缺配置而失敗或阻塞。

### 快速驗證指令

```bash
# 檢查損壞之markdown連結引用（應無輸出）
grep -E '\[.*\]\(\./references/|\[.*\]\(\./assets/|\[.*\]\(references/|\[.*\]\(assets/' skills/*/SKILL.md

# 檢查描述格式 - 應描述功能+時機
grep -E '^description:' skills/*/SKILL.md
```

## 新增組件

- **新技能：** 建立含必要YAML frontmatter（`name`、`description`）之 `skills/<name>/SKILL.md`。參考檔置於 `skills/<name>/references/`。將技能加入 `README.md` 適當分類表並更新技能計數。
- **新代理：** 建立含frontmatter之 `agents/<category>/<name>.md`。分類：`review`、`document-review`、`research`、`design`、`docs`、`workflow`。將代理加入 `README.md` 並更新代理計數。

## Beta技能

Beta技能用 `-beta` 後綴及 `disable-model-invocation: true` 防止意外自動觸發。見 `docs/solutions/skill-design/beta-skills-framework.md` 了解命名、驗證及晉升規則。

**非beta用途之 `disable-model-invocation` 注意：** 該旗標阻擋所有透過Skill工具之模型發起調用，包括 `/loop` 之排程重入。僅用戶直接輸入斜線指令方可繞過。若技能需可排程（如 `resolve-pr-feedback`），勿設此旗標——改以描述特異性與參數要求防止意外自動觸發。

### 穩定版/Beta同步

修改有 `-beta` 對應版之技能時（或反之），必查另一版本，並於提交前**明確陳述同步決定**——如「已傳播至beta——共用測試指引」或「不傳播——此為beta存在以測試之實驗性委託模式」。同步至兩者、僅穩定版、僅beta皆為合理結果。目標為審慎推理，非預設規則。

## 文檔

見 `docs/solutions/plugin-versioning-requirements.md` 了解詳細版本管理工作流。
