---
name: ce-work-beta
description: "[BETA] Execute work with external delegate support. Same as ce-work but includes experimental Codex delegation mode for token-conserving code implementation."
disable-model-invocation: true
argument-hint: "[Plan doc path or description of work. Blank to auto use latest plan doc] [delegate:codex]"
---

# 工作執行指令

高效執行工作，同時保持品質、完成特性。

## 緒論

此指令取工作文檔（計劃、規格、待辦檔）或裸提示描述工作，系統化執行之。要旨為**交付完整特性**——速悉需求、循既有模式、全程保持品質。

**Beta 推行註：** 欲試 Codex 委託時手動調 `ce-work-beta`。Beta 期間，規劃與工作流交接仍指穩定版 `ce-work`，以避雙路徑編排之複。

## 輸入文檔

<input_document> #$ARGUMENTS </input_document>

## 參數解析

自 `$ARGUMENTS` 解析下列可選令牌。識別後各自剝除，餘者作為計劃檔路徑或裸提示。

| 令牌 | 示例 | 效果 |
|-------|---------|--------|
| `delegate:codex` | `delegate:codex` | 啟用 Codex 委託模式執行計劃 |
| `delegate:local` | `delegate:local` | 停用委託，即使配置中已啟用 |

所有令牌可選。缺省時，循下述解析鏈。

**模糊啟用：** 亦識別祈使委託意圖語句如 "use codex"、"delegate to codex"、"codex mode"、"delegate mode"為 `delegate:codex` 等價。提示中單提 "codex"（如 "fix codex converter bugs"）**不得**啟用委託——僅明確委託意圖方觸發。

**模糊停用：** 亦識別 "no codex"、"local mode"、"standard mode" 等為 `delegate:local` 等價。

### 設定解析鏈

自參數提取令牌後，以下列優先鏈解析委託狀態：

1. **參數旗標** — 本次調用之 `delegate:codex` 或 `delegate:local`（最高優先）
2. **配置檔** — 自下方配置塊提取設定。值 `codex` 啟用委託；`false` 停用。
3. **硬預設** — `false`（委託關閉）

**配置（預解析）：**
!`cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || cat "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)")/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'`

若上塊含 YAML 鍵值對，提取下列鍵之值。
若顯 `__NO_CONFIG__`，檔不存在——所有設定降至預設。
若顯未解析之指令字串，以原生檔案讀取工具（如 Claude Code 之 Read、Codex 之 read_file）自倉庫根讀 `.compound-engineering/config.local.yaml`。若檔不存在，所有設定降至預設。

若任何設定有不識之值，該設定降至硬預設。

配置鍵：
- `work_delegate` — `codex` 或預設 `false`
- `work_delegate_consent` — `true` 或預設 `false`
- `work_delegate_sandbox` — `yolo`（預設）或 `full-auto`
- `work_delegate_decision` — `auto`（預設）或 `ask`
- `work_delegate_model` — 所用 Codex 模型（預設 `gpt-5.4`）。透傳——接受任何有效模型名。
- `work_delegate_effort` — `minimal`、`low`、`medium`、`high`（預設）、或 `xhigh`

儲存已解析之狀態供下游消費：
- `delegation_active` — 布林，委託模式是否開啟
- `delegation_source` — `argument` 或 `config` 或 `default` — 委託如何解析（環境守衛用以決定通知詳略）
- `sandbox_mode` — `yolo` 或 `full-auto`（自配置或預設 `yolo`）
- `consent_granted` — 布林（自配置 `work_delegate_consent`）
- `delegate_model` — 字串（自配置或預設 `gpt-5.4`）
- `delegate_effort` — 字串（自配置或預設 `high`）

---

## 執行工作流

### 階段零：輸入分流

依 `<input_document>` 所供決定進路。

**計劃文檔**（輸入為既有計劃、規格或待辦檔之路徑） → 赴階段一。

**裸提示**（輸入為工作描述，非檔案路徑）：

1. **掃描工作區**

   - 依提示識別可能變更之檔案
   - 尋相關區域之既有測試檔（搜尋引入、引用、或與實現檔同名之 test/spec 檔）
   - 記受影響區域之本地模式與慣例

2. **評估複雜度並路由**

   | 複雜度 | 信號 | 行動 |
   |-----------|---------|--------|
   | **微不足道** | 一二檔，無行為變更（筆誤、配置、更名） | 赴階段一步驟二（環境設置），隨即直施——無任務清單、無執行循環。若觸及承載行為之程式碼，施測試發現 |
   | **小/中** | 範圍明確，約十檔以內 | 自發現建任務清單。赴階段一步驟二 |
   | **大** | 跨切、架構決策、十檔以上、觸及認證/支付/遷移 | 告用戶宜先 `/ce-brainstorm` 或 `/ce-plan` 以暴露邊界情況與範圍界限。尊其選擇。若續行，建任務清單，赴階段一步驟二 |

---

### 階段一：速啟

1. **讀計劃並釐清** _(自階段零裸提示而來者略)_

   - 完整讀工作文檔
   - 視計劃為決策文物，非執行腳本
   - 若計劃含 `Implementation Units`、`Work Breakdown`、`Requirements Trace`、`Files`、`Test Scenarios`、或 `Verification` 等段，以此為執行之主要素材
   - 查每實現單元之 `Execution note`——載計劃對該單元之執行姿態信號（如測試先行或特徵化先行）。建任務時記之
   - 查 `Deferred to Implementation` 或 `Implementation-Time Unknowns` 段——此為規劃者刻意留待執行時解決之問題。開始前記之，俾指導方法而非中途驚擾
   - 查 `Scope Boundaries` 段——此為明確之非目標。若實現拉向鄰接工作，回顧之
   - 審閱計劃中所提供之引用或連結
   - 若用戶於本次會話明確要求 TDD、測試先行、或特徵化先行，尊其所求，即使計劃無 `Execution note`
   - 若有不明白或含混，即刻釐清
   - 若需釐清，獲用戶認可後方行。若無需釐清，無需另求認可——計劃範圍即計劃之權威，非待重新談判者
   - **勿略此** — 寧今問，勝過誤建

2. **設置環境**

   先查當前分支：

   ```bash
   current_branch=$(git branch --show-current)
   default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')

   # Fallback if remote HEAD isn't set
   if [ -z "$default_branch" ]; then
     default_branch=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "main" || echo "master")
   fi
   ```

   **若已在特性分支**（非預設分支）：

   先查分支名是否**有意義**——如 `feat/crowd-sniff` 或 `fix/email-validation` 可令未來讀者知工作內容。自動生成之 worktree 名（如 `worktree-jolly-beaming-raven`）或其他晦澀名則否。

   若分支名無意義或為自動生成，建議續行前更名：
   ```bash
   git branch -m <meaningful-name>
   ```
   自計劃標題或工作描述推導新名（如 `feat/crowd-sniff`）。以更名為建議選項，與保持原狀並列。

   繼問："Continue working on `[current_branch]`, or create a new branch?"
   - 若續行（更名與否），赴步驟三
   - 若新建，依下選項甲或乙

   **若在預設分支**，選進路：

   **選項甲：建新分支**
   ```bash
   git pull origin [default_branch]
   git checkout -b feature-branch-name
   ```
   基於工作取有意義之名（如 `feat/user-authentication`、`fix/email-validation`）。

   **選項乙：用 worktree（並行開發推薦）**
   ```bash
   skill: ce-worktree
   # The skill will create a new branch from the default branch in an isolated worktree
   ```

   **選項丙：續行於預設分支**
   - 需用戶明確確認
   - 用戶明確言 "yes, commit to [default_branch]" 方行
   - 未獲明確許可不得直接提交於預設分支

   **建議**：以下情形用 worktree：
   - 欲同時開發多項特性
   - 欲保持預設分支整潔以利實驗
   - 計劃頻繁切換分支

3. **建待辦清單** _(階段零已建者，或階段零路由為微不足道者，略)_
   - 以可用任務追蹤工具（如 TodoWrite、任務清單）拆計劃為可執行任務
   - 自計劃之實現單元、依賴、檔案、測試目標及驗證標準推導任務
   - 單元有 `Execution note` 時帶入任務
   - 每單元實施前讀其 `Patterns to follow` 欄——此指明應模仿之特定檔案或慣例
   - 以每單元之 `Verification` 欄為該任務之首要「完成」信號
   - 勿期計劃含實現程式碼、微步 TDD 指令、或精確 shell 指令
   - 納任務間依賴
   - 依優先序排列
   - 納測試與品質檢查任務
   - 任務保持具體且可完成

4. **選執行策略**

   **委託路由門控：** 若 `delegation_active` 為真且輸入為計劃檔（非裸提示），讀 `references/codex-delegation-workflow.md` 並循其預委託檢查與委託決策流程。若所有檢查通過且委託進行，強制**串行執行**並直赴階段二，循其批量執行循環。若任一檢查停用委託，降至下方標準策略表。若委託啟用但輸入為裸提示（無計劃檔），設 `delegation_active` 為假並簡註："Codex delegation requires a plan file -- using standard mode." 續以下方標準策略選擇。

   建任務清單後，依計劃大小與依賴結構選執行策略：

   | 策略 | 何時用 |
   |----------|-------------|
   | **內聯** | 一二小任務，或需中途用戶互動者。**裸提示工作之預設**——裸提示鮮能產生足夠結構化上下文以支撐子代理分派 |
   | **串行子代理** | 三以上任務且有依賴。每子代理獲聚焦一單元之新鮮上下文窗口——防跨多任務之上下文退化。需計劃單元元數據（Goal、Files、Approach、Test scenarios） |
   | **並行子代理** | 三以上任務且通過並行安全檢查（見下）。同時分派獨立單元，依賴單元俟前置完成後運行。需計劃單元元數據 |

   **並行安全檢查** — 選並行分派前必行：

   1. 自每候選單元之 `Files:` 段（Create、Modify 及 Test 路徑）建檔至單元映射
   2. 查交集——任何檔案路徑現於二以上單元即為重疊
   3. 若有重疊，降至串行子代理。記因（如 "Units 2 and 4 share `config/routes.rb` — using serial dispatch"）。串行子代理仍提供上下文窗口隔離而無共享目錄風險

   縱無檔案重疊，並行子代理共享工作目錄仍面臨 git 索引爭用（並行暫存/提交損索引）與測試干擾（並行測試運行拾取彼此進行中變更）。下列並行子代理約束緩解之。

   **子代理分派**用可用之子代理或任務生成機制。每單元予子代理：
   - 完整計劃檔路徑（供全局上下文）
   - 該單元之 Goal、Files、Approach、Execution note、Patterns、Test scenarios 及 Verification
   - 該單元相關之已解決延遲問題
   - 指令檢查單元測試場景是否涵蓋所有適用類別（正常路徑、邊界情況、錯誤路徑、集成）並於撰寫測試前補闕

   **並行子代理約束** — 並行分派單元時（非串行或內聯）：
   - 指示每子代理："Do not stage files (`git add`), create commits, or run the project test suite. The orchestrator handles testing, staging, and committing after all parallel units complete."
   - 此約束防 git 索引爭用與並行子代理間測試干擾

   **權限模式：** 分派子代理時省略 `mode` 參數，俾用戶已配置之權限設定生效。勿傳 `mode: "auto"`——其覆寫用戶級設定如 `bypassPermissions`。

   **每子代理完成後（串行模式）：**
   1. 審閱子代理之差異——驗證變更匹配單元範圍及 `Files:` 清單
   2. 跑相關測試套件確認樹健康
   3. 若測試失敗，診斷並修復後方續——勿於破損之樹上分派依賴單元
   4. 更新計劃核取框與任務清單
   5. 分派下一單元

   **並行批次中所有子代理完成後：**
   1. 俟當前並行批次中每子代理完成後方處理任何結果
   2. 交叉查驗發現之檔案衝突：比對批次中所有子代理實際修改之檔案（非僅其聲明之 `Files:` 清單）。子代理可能建立或修改計劃時未預見之檔案——此為預期，因計劃描述*何者*而非*如何*。衝突僅在二以上子代理於同批次修改同檔時方重要。共享工作目錄中僅末寫者存——另一單元對該檔之變更盡失。若偵測衝突：先提交所有單元之非衝突檔，然後串行重跑受影響單元處理共享檔，俾各基於已提交工作續建
   3. 每完成單元，依依賴序：審閱差異、跑相關測試套件、僅暫存該單元之檔案、以單元 Goal 衍生之 convention 訊息提交
   4. 若提交某單元後測試失敗，診斷並修復後方提交下一單元
   5. 更新計劃核取框與任務清單
   6. 分派下一批獨立單元或下一依賴單元

### 階段二：執行

1. **任務執行循環**

   依優先序逐任務：

   ```
   while (tasks remain):
     - 標任務為進行中
     - 讀計劃所引或階段零所發現之檔案
     - 於碼庫中尋類似模式
     - 尋實現檔之既有測試檔（測試發現——見下）
     - 若 delegation_active：分支至 Codex 委託執行循環
       (見 `references/codex-delegation-workflow.md`)
     - 否則：循既有慣例實施
     - 增、改、刪測試以匹配實現變更（見下方測試發現）
     - 行系統全域測試檢查（見下）
     - 變更後跑測試
     - 評測試覆蓋：此任務是否變更行為？若是，測試已撰或已更新？若無新測試，理由是否經深思（如純配置、無行為變更）？
     - 標任務為完成
     - 評增量提交（見下）
   ```

   單元有 `Execution note` 時，從之。測試先行單元，先撰失敗測試再實施。特徵化先行單元，先捕既有行為再變更。無 `Execution note` 者，務實行之。

   執行姿態護欄：
   - 測試先行時勿於同一步撰測與實現
   - 勿略驗證新測試先行失敗再實施修復或特性
   - 測試先行時勿過實超出當前行為切片
   - 微不足道之更名、純配置、純風格工作略測試先行紀律

   **測試發現** — 實施檔案變更前，尋其既有測試檔（搜尋引入、引用、或與實現檔共享命名模式之 test/spec 檔）。計劃指定測試場景或測試檔時，自彼處始，復查計劃可能未列舉之額外覆蓋。實現檔變更應伴以相應測試更新——新行為加新測試、變更行為改測試、刪除行為移或改測試。

   **測試場景完整性** — 為承載特性之單元撰測試前，查計劃之 `Test scenarios` 是否涵蓋本單元所有適用類別。若類別缺失或場景模糊（如 "validates correctly" 未列輸入與預期結果），以單元自身上下文補充後再撰測試：

   | 類別 | 適用時機 | 缺失時如何推導 |
   |----------|----------------|------------------------|
   | **正常路徑** | 承載特性之單元恆適用 | 讀單元之 Goal 與 Approach 取核心輸入/輸出對 |
   | **邊界情況** | 單元有意義邊界（輸入、狀態、並行） | 識別邊界值、空/nil 輸入、並行存取模式 |
   | **錯誤/失敗路徑** | 單元有失敗模式（驗證、外部調用、權限） | 列舉單元應拒之無效輸入、應執行之權限/認證拒絕、應處理之下游失敗 |
   | **集成** | 單元跨層（回調、中間件、多服務） | 識別跨層鏈，撰不用 mock 之場景驅動之 |

   **系統全域測試檢查** — 標任務完成前，暫停自問：

   | 問題 | 所為 |
   |----------|------------|
   | **此運行時何者觸發？** 回調、中間件、觀察者、事件處理器——自變更向外追蹤二層。 | 讀實際程式碼（非文檔）以查所觸模型之回調、請求鏈中間件、`after_*` 鉤子。 |
   | **測試是否驅動真實鏈？** 若每個依賴皆 mock，測試僅證邏輯*孤立可用*——對交互毫無所言。 | 至少撰一集成測試以真實物件貫穿完整回調/中間件鏈。交互層不用 mock。 |
   | **失敗能否留孤兒狀態？** 若程式碼於調用外部服務前持久化狀態（DB 行、快取、檔案），服務失敗時如何？重試是否生重複？ | 以真實物件追蹤失敗路徑。若狀態於風險調用前建立，測試失敗清理或重試冪等性。 |
   | **其他介面是否暴露此功能？** Mixin、DSL、替代入口（Agent vs Chat vs ChatMethods）。 | 於相關類中搜尋方法/行為。若需平價，即時加——非作後續。 |
   | **各層錯誤策略是否一致？** 重試中間件 + 應用後備 + 框架錯誤處理——是否衝突或致雙重執行？ | 列各層之具體錯誤類。驗證 rescue 清單匹配下層實際所拋。 |

   **何時略：** 葉節點變更，無回調、無狀態持久化、無平行介面。若變更純增量（新輔助方法、新視圖局部），檢查耗時十秒，答案為「無觸發，略。」

   **何時最關鍵：** 任何觸及有回調之模型、含後備/重試之錯誤處理、或多介面暴露之功能的變更。


2. **增量提交**

   每任務完成後，評估是否建增量提交：

   | 提交當... | 不提交當... |
   |----------------|---------------------|
   | 邏輯單元完成（模型、服務、元件） | 較大單元之小部分 |
   | 測試通過 + 有意義進展 | 測試失敗 |
   | 將切換上下文（後端 → 前端） | 純腳手架無行為 |
   | 將嘗試風險/不確定變更 | 需要 "WIP" 提交訊息 |

   **經驗法則：** 「能撰述描述完整、有價值變更之提交訊息乎？能，則提交。訊息將為 'WIP' 或 'partial X'，則候。」

   若計劃有實現單元，以之為提交邊界之初導——然依實施所見調整。單元或較預期為大而需多次提交，或相關小單元可合併。以每單元之 Goal 指導提交訊息。

   **提交工作流：**
   ```bash
   # 1. Verify tests pass (use project's test command)
   # Examples: bin/rails test, npm test, pytest, go test, etc.

   # 2. Stage only files related to this logical unit (not `git add .`)
   git add <files related to this logical unit>

   # 3. Commit with conventional message
   git commit -m "feat(scope): description of this unit"
   ```

   **處理合併衝突：** 變基或合併時若生衝突，立即解決。增量提交使衝突解決更易，因每提交小而聚焦。

   **註：** 增量提交用簡潔 convention 訊息，不含歸屬頁腳。最終階段四提交/PR 含完整歸屬。

   **並行子代理模式：** 單元以並行子代理運行時，子代理不提交——編排者於整個並行批次完成後處理暫存與提交（見階段一步驟四之並行子代理約束）。本節提交指引適用於內聯及串行執行，以及並行批次完成後編排者之提交決策。

3. **循既有模式**

   - 計劃應引用類似程式碼——先讀那些檔案
   - 精確匹配命名慣例
   - 盡可能復用既有元件
   - 循專案編碼標準（見 AGENTS.md；若倉庫仍保留相容墊片方用 CLAUDE.md）
   - 疑則搜尋類似實現

4. **持續測試**

   - 每顯著變更後跑相關測試
   - 勿待末尾方測
   - 失敗即修
   - 新行為加新測試、變更行為改測試、刪除行為移測試
   - **帶 mock 之單元測試證邏輯孤立可用。以真實物件之集成測試證各層協作。** 若變更觸及回調、中間件、或錯誤處理——兩者皆需。

5. **隨行簡化**

   完成一組相關實現單元（或每二三單元）後，審閱近期變更檔案尋簡化之機——合併重複模式、抽取共享輔助、改善程式碼復用與效率。使用子代理時尤為重要，因每代理以隔離上下文工作，無法察覺跨單元浮現之模式。

   勿於每單元後即簡化——早期模式或看似重複而於後續單元中刻意分化。俟自然階段邊界或察覺累積複雜度時方行。

   若有 `/simplify` 技能或等價工具可用，用之。否則自行審閱變更檔案尋復用與整合之機。

6. **Figma 設計同步**（若適用）

   UI 工作有 Figma 設計時：

   - 依設計規格實施元件
   - 迭代使用 ce-figma-design-sync 代理比對
   - 修復所見視覺差異
   - 重複至實現匹配設計

7. **前端設計指引**（若適用）

   無 Figma 設計之 UI 任務——實現觸及視圖、模板、元件、佈局或頁面檔案，創建用戶可見路由，或計劃含明確 UI/前端/設計語言時：

   - 實施前載入 `ce-frontend-design` 技能
   - 循其偵測、指引與驗證流程
   - 若技能產生驗證截圖，即滿足階段四之截圖要求——無需另取。若技能退回心智審閱（無瀏覽器訪問），階段四之截圖捕獲仍適用

8. **追蹤進度**
   - 任務完成時更新任務清單
   - 記任何阻塞或意外發現
   - 範圍擴展時建新任務
   - 重大里程碑告知用戶

### 階段三至四：品質檢查與交付

所有階段二任務完成、執行轉入品質檢查時，讀 `references/shipping-workflow.md` 獲完整交付工作流：品質檢查、碼審、最終驗證、PR 創建及通知。

---

## Codex 委託模式

參數解析後 `delegation_active` 為真時，讀 `references/codex-delegation-workflow.md` 獲完整委託工作流：預檢查、批量、提示模板、執行循環及結果分類。

---

## 核心原則

### 速啟速行

- 開始時釐清一次，隨即執行
- 勿候完美理解——邊問邊行
- 目標為**完成特性**，非創建完美流程

### 計劃為指南

- 工作文檔應引用類似程式碼與模式
   - 載入引用並從之
   - 勿重新發明——匹配既有者

### 隨行測試

- 每次變更後跑測試，非待末尾
- 失敗即修
- 持續測試防大驚

### 品質內建

- 循既有模式
- 為新程式碼撰測試
- 推送前跑 lint
- 審閱每項變更——簡單增量工作行內審、餘者全面審

### 交付完整特性

- 所有任務完成後方移
- 勿留特性八成完成
- 完成而交付之特性，勝於完美而未交者

## 常見陷阱

- **分析癱瘓** — 勿過思，讀計劃即行
- **略釐清之問** — 今問，勝過誤建後問
- **忽視計劃引用** — 計劃有連結，其來有自
- **末尾方測** — 持續測試或後患
- **忘追蹤進度** — 隨行更新任務狀態，否則不知何者已畢
- **八成完成症候** — 完成特性，勿提前移
- **略審閱** — 每項變更皆受審；僅深度有別
- **將計劃重劃為人類時間階段** — 計劃之實現單元定義執行範圍。勿估人類工時/單元、提多日拆分、或請用戶選「本次會話」之子集。代理以代理速度執行，上下文窗口壓力以子代理分派（階段一步驟四）處理，非以分階段會話。若計劃檔輸入確實過大，坦言之並建用戶回 `/ce-plan` 縮範圍——勿捏造會話階段為變通。裸提示輸入時，階段零之大型路由已處理過大工作
