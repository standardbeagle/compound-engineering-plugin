---
name: ce-plan
description: "Create structured plans for any multi-step task -- software features, research workflows, events, study plans, or any goal that benefits from structured breakdown. Also deepen existing plans with interactive review of sub-agent findings. Use for plan creation when the user says 'plan this', 'create a plan', 'write a tech plan', 'plan the implementation', 'how should we build', 'what's the approach for', 'break this down', 'plan a trip', 'create a study plan', or when a brainstorm/requirements document is ready for planning. Use for plan deepening when the user says 'deepen the plan', 'deepen my plan', 'deepening pass', or uses 'deepen' in reference to a plan. For exploratory or ambiguous requests where the user is unsure what to do, prefer ce-brainstorm first."
argument-hint: "[optional: feature description, requirements doc path, plan path to deepen, or any task to plan]"
---

# Create Technical Plan

**Note: The current year is 2026.** Use this when dating plans and searching for recent documentation.

`ce-brainstorm` 定義**做什麼**。`ce-plan` 定義**怎麼做**。`ce-work` 執行計劃。前置腦力激盪為有用上下文但非必要——`ce-plan` 可從任何輸入工作：需求文檔、缺陷報告、功能構想或粗略描述。

**直接調用時恆行規劃。** 永不將直接調用歸為「非規劃任務」而棄工作流。若輸入不明，問澄清問題或以規劃引導（Phase 0.4）建立足夠上下文——但恆留於規劃工作流中。

本工作流產生持久實作計劃。**不**實作碼、運行測試或從執行時結果學習。若答案依賴改碼後觀其效，屬 `ce-work`，非此。

## Interaction Method

用平台提問工具。向用戶提問時，若有阻塞式提問工具（Claude Code之 `AskUserQuestion`、Codex之 `request_user_input`、Gemini之 `ask_user`），優先用之。否則以編號選項呈現於對話，等候用戶回覆後繼續。

每次問一題。有自然選項時優先簡潔單選。

## Feature Description

<feature_description> #$ARGUMENTS </feature_description>

**若上方功能描述為空，問用戶：** "What would you like to plan? Describe the task, goal, or project you have in mind." 然後等候其回覆再續。

若輸入存在但不清晰或規格不足，勿棄——問一兩道澄清問題，或進入 Phase 0.4 規劃引導建立足夠上下文。目標恆為助用戶規劃，永不退出工作流。

**重要：計劃文檔中一切檔案引用須用倉庫相對路徑（如 `src/models/user.rb`），永不使用絕對路徑（如 `/Users/name/Code/project/src/models/user.rb`）。適用於一切處——實作單元檔案列表、模式引用、來源文檔連結及散文提及。絕對路徑破壞跨機器、worktree及團隊成員之可攜性。**

## Core Principles

1. **以需求為真實來源**——若 `ce-brainstorm` 已產需求文檔，規劃應自之建構，而非重新發明行為。
2. **決策，非碼**——捕獲方案、邊界、檔案、依賴、風險及測試場景。不預寫實作碼或shell命令編排。偽碼草圖或DSL語法表達高層技術設計可接受，惟須明確標為方向性指引，非實作規格。
3. **先研究後結構化**——必要時先探索碼庫、機構經驗及外部指引，再定稿計劃。
4. **適度調整產物**——小工作得精簡計劃。大工作得更多結構。理念於各深度一致。
5. **規劃與執行探索分離**——於此解決規劃時問題。明確將執行時未知數延遲至實作。
6. **保持計劃可攜**——計劃應可作為活文檔、審閱產物或issue body，不嵌入工具特定之執行器指令。
7. **輕帶執行姿態**——若請求、來源文檔或倉庫上下文明確暗示test-first、characterization-first或其他非預設執行姿態，於計劃中反映為輕量信號。勿將計劃變為逐步執行編排。
8. **尊重用戶命名之資源**——當用戶命名特定資源（CLI、MCP伺服器、URL、檔案、文檔連結或先前產物），視之為權威輸入，非建議。若未知則發現之（`command -v`、fetch、read），然後假定不可用。用之替代通用方案。若失敗或不存在，明確言之，而非靜默替換。

## Plan Quality Bar

每個計劃應含：
- 清晰之問題框架與範圍邊界
- 具體需求可追溯回請求或來源文檔
- 倉庫相對檔案路徑（永不絕對路徑——見 Planning Rules）
- 承載功能之實作單元的顯式測試檔案路徑
- 決策附理由，非僅任務
- 既有模式或碼引用以遵循
- 每個承載功能之單元的列舉測試場景，具體至實作者知確切測何物，無需自創覆蓋
- 清晰之依賴與順序

計劃就緒之標準：實作者可自信起步，無需計劃代寫碼。

## Workflow

### Phase 0: Resume, Source, and Scope

#### 0.1 Resume Existing Plan Work When Appropriate

若用戶引用既有計劃檔或 `docs/plans/` 中有明顯最近之匹配計劃：
- 讀之
- 確認就地更新或建新計劃
- 若更新，保留已完成勾選框，僅修訂仍相關之段落

**深化意圖：**「深化」（或 "deepening"）指計劃時為深化快速路徑之主要觸發。當用戶說「deepen the plan」、「deepen my plan」、「run a deepening pass」或類似語時，目標文檔為 `docs/plans/` 中之**計劃**，非需求文檔。用用戶提供之任何路徑、關鍵詞或上下文識別正確計劃。若提供路徑，驗證其確為計劃文檔。若匹配不明顯，先與用戶確認。

「strengthen」、「confidence」、「gaps」、「rigor」等詞**單獨不足以**觸發深化。此等詞出現於正常編輯請求（「strengthen that section about the diagram」、「there are gaps in the test scenarios」），不應導致全面深化過程。唯當請求明確針對計劃整體且未命名特定段落或內容區域時方視為深化意圖——即使如此，優先與用戶確認後再進入深化流程。

一旦識別計劃且顯完整（所有主要段落存在、實作單元已定義、`status: active`）：
- 若計劃缺YAML frontmatter（非軟體計劃用簡單 `# Title` 標題加 `Created:` 日期取代frontmatter），路由至 `references/universal-planning.md` 進行編輯或深化，而非 Phase 5.3。非軟體計劃不用軟體信心檢查。
- 否則，短路至 Phase 5.3（Confidence Check and Deepening），以**交互模式**。此避免重跑完整規劃工作流，並予用戶控制哪些發現被整合。

正常編輯請求（如「update the test scenarios」、「add a new implementation unit」、「strengthen the risk section」）**不**觸發快速路徑——循標準恢復流程。

若計劃已有 `deepened: YYYY-MM-DD` frontmatter欄位且無顯式用戶請求重新深化，快速路徑仍施相同之信心缺口評估——不強制深化。

#### 0.1b Classify Task Domain

若任務涉及建構、修改或架構軟體（引用碼、倉庫、API、資料庫，或要求建構/修改/部署），續至 Phase 0.2。

若領域真正模糊（如「plan a migration」無其它上下文），先問用戶再路由。

否則，讀 `references/universal-planning.md` 並依其工作流。跳過一切後續階段。具名工具或來源連結不改變路由——彼等為輸入，依核心原則8處理。

#### 0.2 Find Upstream Requirements Document

問規劃問題前，搜 `docs/brainstorms/` 尋匹配 `*-requirements.md` 之檔案。

**相關性標準：** 需求文檔相關若：
- 主題語義匹配功能描述
- 30日內建立（若文檔顯然仍相關或已過時則用判斷覆蓋）
- 似乎覆蓋相同用戶問題或範圍

若多個來源文檔匹配，以平台之阻塞式提問工具（可用時，見 Interaction Method）問用哪個。否則以編號選項呈現，等候用戶回覆。

#### 0.3 Use the Source Document as Primary Input

若有相關需求文檔：
1. 透徹閱之
2. 宣布其將作為規劃之來源文檔
3. 承載以下全部：
   - 問題框架
   - 需求及成功標準
   - 範圍邊界
   - 關鍵決策及理由
   - 依賴或假設
   - 未決問題，保留其為阻塞或延遲之標記
4. 以來源文檔為規劃與研究之主要輸入
5. 於計劃中引用重要之承載決策附 `(see origin: <source-path>)`
6. 勿靜默省略來源內容——若來源文檔討論之，計劃必須回應，即使簡略。定稿前掃描來源文檔每一段落，驗無內容被靜默丟棄。

若無相關需求文檔，規劃可直接從用戶請求進行。

#### 0.4 Planning Bootstrap (No Requirements Doc or Unclear Input)

若無相關需求文檔，或輸入需更多結構：
- 評估請求是否已夠清晰可直接技術規劃——若是，續至 Phase 0.5
- 若模糊主要為產品框架、用戶行為或範圍定義，建議 `ce-brainstorm` 為選項——但恆提供繼續規劃之選擇
- 若用戶願繼續此處（或已明確要計劃），運行下方規劃引導

規劃引導應建立：
- 問題框架
- 預期行為
- 範圍邊界及顯見非目標
- 成功標準
- 阻塞問題或假設

保持引導簡短。其存在為保留直接進入之便利，非取代完整腦力激盪。

若引導揭發重大未決產品問題：
- 再次建議 `ce-brainstorm`
- 若用戶仍欲繼續，要求顯式假設後方進

若引導揭示另一工作流更適用：

- **有症狀無根因**（用戶描述破壞行為但未識別原因）——宣布規劃前需調查，載 `ce-debug` 技能。計劃需已知問題方能解；除錯識別問題為何。明確宣告路由：「This needs investigation before planning — switching to ce-debug to find the root cause.」
- **明確任務可直接執行**（已知根因、顯見修復、無架構決策）——建議 `ce-work` 為更快替代，同時保留繼續規劃。用戶決定。

#### 0.5 Classify Outstanding Questions Before Planning

若來源文檔含 `Resolve Before Planning` 或類似阻塞問題：
- 續行前審視每個
- **唯若**其確為技術、架構或研究問題方重歸類為規劃所擁之工作
- 若其將改變產品行為、範圍或成功標準則保持為阻塞

若仍有真正產品阻塞：
- 明確呈現
- 以平台之阻塞式提問工具（可用時，見 Interaction Method），問用戶：
  1. 回到 `ce-brainstorm` 解決之
  2. 轉為顯式假設或決策並繼續
- 真正阻塞未解決前勿繼續規劃

#### 0.6 Assess Plan Depth

將工作歸為以下深度之一：

- **Lightweight**——小、有界、低模糊度
- **Standard**——正常功能或有界重構，有些技術決策需記錄
- **Deep**——跨領域、策略性、高風險或高度模糊之實作工作

若深度不明，問一道定向問題然後繼續。

### Phase 1: Gather Context

#### 1.1 Local Research (Always Runs)

備簡潔規劃上下文摘要（一兩段）傳予研究代理：
- 若有來源文檔，摘要其問題框架、需求及關鍵決策
- 否則直接用功能描述

並行運行：

- Task research:ce-repo-research-analyst(Scope: technology, architecture, patterns. {planning context summary})
- Task research:ce-learnings-researcher(planning context summary)
收集：
- 技術棧及版本（用於段落1.2做更精確之外部研究決策）
- 架構模式及慣例以遵循
- 實作模式、相關檔案、模組及測試
- AGENTS.md 指引對計劃有實質影響者，CLAUDE.md 僅於存在時作兼容回退
- `docs/solutions/` 之機構經驗

**Slack上下文**（選用）——永不自動分派。按條件路由：

- **工具可用 + 用戶要求**：與其它 Phase 1.1 代理並行分派 `research:ce-slack-researcher`，傳規劃上下文摘要。若來源文檔有Slack上下文段落，原文傳之俾研究者聚焦缺口。產出納入整合。
- **工具可用 + 用戶未要求**：於輸出注明："Slack tools detected. Ask me to search Slack for organizational context at any point, or include it in your next prompt."
- **無工具 + 用戶要求**：於輸出注明："Slack context was requested but no Slack tools are available. Install and authenticate the Slack plugin to enable organizational context search."

#### 1.1b Detect Execution Posture Signals

判斷計劃是否應攜帶輕量執行姿態信號。

尋找信號如：
- 用戶顯式要求TDD、test-first或characterization-first工作
- 來源文檔要求test-first實作或遺產碼之探索性強化
- 本地研究顯示目標區域為遺產、弱測試或歷史脆弱，暗示修改行為前先建characterization覆蓋

信號明確時，靜默攜帶於相關實作單元中。

僅當姿態將實質改變順序或風險且無法負責推斷時方問用戶。

#### 1.2 Decide on External Research

依來源文檔、用戶信號及本地發現判斷外部研究是否增值。

**讀言外之意。** 注意對話至此之信號：
- **用戶熟悉度**——指向特定檔案或模式？大概熟悉碼庫。
- **用戶意圖**——求速或求全？探索或執行？
- **主題風險**——安全、支付、外部API，不論用戶信號皆需更謹慎。
- **不確定性**——方案明確或仍開放？

**善用 ce-repo-research-analyst 之技術上下文：**

ce-repo-research-analyst 輸出含結構化 Technology & Infrastructure 摘要。用以做更精確之外部研究決策：

- 若偵測到特定框架及版本（如Rails 7.2、Next.js 14、Go 1.22），傳確切識別符予 ce-framework-docs-researcher 俾其取版本特定文檔
- 若功能觸及倉庫中已確立之技術層（如建新背景作業時已有Sidekiq作業），傾向跳過外部研究——本地模式大概足夠
- 若功能觸及倉庫中缺席或薄弱之技術層（如建新gRPC服務時無既有proto檔），傾向外部研究——無本地模式可循
- 若偵測到部署基礎設施（Docker、K8s、serverless），記於傳予下游代理之規劃上下文，俾其考慮部署約束
- 若偵測到monorepo且已限縮至特定服務，傳該服務之技術上下文予下游研究代理——非所有服務之聚合。若掃描呈現工作區映射而未限縮，以功能描述識別相關服務後再研究

**下列情況傾向外部研究：**
- 主題高風險：安全、支付、隱私、外部API、遷移、合規
- 碼庫缺乏相關本地模式——本計劃所需模式少於3個直接範例
- 本地模式存在於相鄰領域但非確切領域——如碼庫有HTTP客戶端但無webhook接收器，或有背景作業但無事件驅動pub/sub。相鄰模式表示團隊熟悉技術層但可能不知領域特定陷阱。此信號出現時，框架外部研究查詢圍繞領域缺口具體化，非一般技術
- 用戶探索陌生領域
- 技術掃描發現相關層於碼庫中缺席或薄弱

**下列情況跳過外部研究：**
- 碼庫已有強本地模式——多個直接範例（非相鄰領域）、最近觸及、循當前慣例
- 用戶已知預期形狀
- 額外外部上下文幾無實際價值
- 技術掃描發現相關層已確立，有既有範例可循

簡要宣布決定。示例：
- "Your codebase has solid patterns for this. Proceeding without external research."
- "This involves payment processing, so I'll research current best practices first."

#### 1.3 External Research (Conditional)

若 Step 1.2 表示外部研究有用，並行運行：

- Task research:ce-best-practices-researcher(planning context summary)
- Task research:ce-framework-docs-researcher(planning context summary)

#### 1.4 Consolidate Research

摘要：
- 相關碼庫模式及檔案路徑
- 相關機構經驗
- 組織上下文取自Slack對話（若已收集）——先前討論、決策或與功能相關之領域知識
- 外部引用及最佳實踐（若已收集）
- 相關issues、PRs或既有方案
- 任何應實質形塑計劃之約束

#### 1.4b Reclassify Depth When Research Reveals External Contract Surfaces

若當前分類為 **Lightweight** 且 Phase 1 研究發現工作觸及下列外部契約面，重歸為 **Standard**：

- 被外部系統、CI或其他倉庫消費之環境變數
- 導出之公開API、CLI旗標或命令行介面契約
- CI/CD配置檔（`.github/workflows/`、`Dockerfile`、部署腳本）
- 被下游消費者導入之共享類型或介面
- 被外部URL引用或從其他系統連結之文檔

此確保流程分析（Phase 1.5）運行且信心檢查（Phase 5.3）施關鍵段落加成。簡要宣布重歸類："Reclassifying to Standard — this change touches [environment variables / exported APIs / CI config] with external consumers."

#### 1.5 Flow and Edge-Case Analysis (Conditional)

對於 **Standard** 或 **Deep** 計劃，或用戶流程完備性仍不明時，運行：

- Task workflow:ce-spec-flow-analyzer(planning context summary, research findings)

以輸出：
- 識別缺失邊緣案例、狀態轉換或交接缺口
- 收緊需求追溯或驗證策略
- 僅添加實質改善計劃之流程細節

### Phase 2: Resolve Planning Questions

從以下建規劃問題清單：
- 來源文檔中之延遲問題
- 倉庫或外部研究中所發現之缺口
- 產出有用計劃所需之技術決策

對每問題決定其應：
- **規劃時解決**——答案可從倉庫上下文、文檔或用戶選擇得知
- **延遲至實作**——答案依賴碼變更、運行時行為或執行時發現

僅當答案實質影響架構、範圍、順序或風險且無法負責推斷時方問用戶。用平台之阻塞式提問工具（可用時，見 Interaction Method）。

**勿**於此階段運行測試、建置應用或探測運行時行為。目標為強計劃，非部分執行。

### Phase 3: Structure the Plan

#### 3.1 Title and File Naming

- 草擬清晰、可搜尋之標題，用慣例格式如 `feat: Add user authentication` 或 `fix: Prevent checkout double-submit`
- 定計劃類型：`feat`、`fix` 或 `refactor`
- 建檔名依倉庫慣例：`docs/plans/YYYY-MM-DD-NNN-<type>-<descriptive-name>-plan.md`
  - 建 `docs/plans/` 若不存在
  - 查今日日期既有檔以定下一序號（補零至3位，從001始）
  - 保持描述名精簡（3-5詞）且kebab-case
  - 示例：`2026-01-15-001-feat-user-authentication-flow-plan.md`、`2026-02-03-002-fix-checkout-race-condition-plan.md`
  - 避免：缺序號、模糊名如 "new-feature"、無效字元（冒號、空格）

#### 3.2 Stakeholder and Impact Awareness

對於 **Standard** 或 **Deep** 計劃，簡要考慮誰受此變更影響——終端用戶、開發者、運維、其他團隊——及如何形塑計劃。跨領域工作，於 System-Wide Impact 段落注明受影響方。

#### 3.3 Break Work into Implementation Units

將工作拆為邏輯實作單元。每單元應代表一個有意義之變更，實作者通常可作為原子提交落地。

良好單元：
- 聚焦一個組件、行為或整合接縫
- 通常觸及一小叢相關檔案
- 依依賴排序
- 具體至可執行，無需預寫碼
- 以勾選語法標記進度追蹤

避免：
- 2-5分鐘微步驟
- 跨多個不相關關切之單元
- 模糊至實作者仍需發明計劃之單元

#### 3.4 High-Level Technical Design (Optional)

詳列實作單元前，判斷概述是否有助審閱者驗證預期方案。此段溝通方案之*形狀*——各件如何組合——而不指示實作。

**何時包含：**

| Work involves... | Best overview form |
|---|---|
| DSL或API面設計 | 偽碼語法或契約草圖 |
| 多組件整合 | Mermaid序列圖或組件圖 |
| 數據管線或轉換 | 數據流草圖 |
| 狀態密集生命週期 | 狀態圖 |
| 複雜分支邏輯 | 流程圖 |
| 模式/旗標組合或多輸入行為 | 決策矩陣（輸入 -> 結果） |
| 單組件但形狀不明顯 | 偽碼草圖 |

**何時跳過：**
- 模式良好之工作，散文及檔案路徑即述全貌
- 直接之CRUD或循慣例之變更
- Lightweight計劃，方案顯而易見

擇適合工作之媒介。勿預設偽碼當圖表更佳時，反之亦然。

每草圖加框聲明：*"This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce."*

保持草圖精簡——足以驗證方向，不足以複製貼上至產品碼。

#### 3.4b Output Structure (Optional)

對於建立新目錄結構之greenfield計劃（新插件、服務、包或模組），含 `## Output Structure` 段落，以檔案樹展示預期佈局。俾審閱者先覽整體形狀再入逐單元細節。

**何時包含：**
- 計劃在新目錄層級建3+新檔案
- 目錄佈局本身為有意義之設計決策

**何時跳過：**
- 計劃僅修改既有檔案
- 計劃在既有目錄建1-2檔案——逐單元檔案列表已足

此樹為範圍聲明，展示預期輸出形狀。非約束——實作者可因實作揭示更佳佈局而調整結構。逐單元 `**Files:**` 段落仍為每單元創建或修改何物之權威。

#### 3.5 Define Each Implementation Unit

每單元含：
- **Goal**——本單元達成何事
- **Requirements**——推進哪些需求或成功標準
- **Dependencies**——須先存在何物
- **Files**——倉庫相對檔案路徑（創建、修改或測試）（永不絕對路徑）
- **Approach**——關鍵決策、數據流、組件邊界或整合備註
- **Execution note**——選用，僅當單元受益於非預設執行姿態如test-first或characterization-first
- **Technical design**——選用偽碼或圖表，當單元方案不明顯且散文不足以表達時。明確標為方向性指引，非實作規格
- **Patterns to follow**——既有碼或慣例以鏡像
- **Test scenarios**——列舉實作者應寫之具體測試案例，適度於單元之複雜度與風險。考慮下列各類，含每類適用於本單元之場景。簡單配置變更或需一場景；支付流程或需一打。品質信號為具體性——每場景應命名輸入、動作及預期結果，俾實作者無需自創覆蓋。無行為變更之單元（純配置、鷹架、樣式）用 `Test expectation: none -- [reason]` 取代留空欄位。
  - **Happy path behaviors**——核心功能及預期輸入輸出
  - **Edge cases**（當單元有有意義之邊界時）——邊界值、空輸入、nil/null狀態、並行存取
  - **Error and failure paths**（當單元有失敗模式時）——無效輸入、下游服務失敗、超時行為、權限拒絕
  - **Integration scenarios**（當單元跨層時）——mock單獨無法證明之行為，如「建X觸發回呼Y持久化Z」。對觸及回呼、中介層或多層交互之任何單元包含之
- **Verification**——實作者如何知單元完成，以結果表達而非shell命令腳本

每個承載功能之單元應於 `**Files:**` 含測試檔案路徑。

節用 `Execution note`。良好用法：
- `Execution note: Start with a failing integration test for the request/response contract.`
- `Execution note: Add characterization coverage before modifying this legacy parser.`
- `Execution note: Implement new domain behavior test-first.`

勿將單元擴展為字面 `RED/GREEN/REFACTOR` 子步驟。

#### 3.6 Keep Planning-Time and Implementation-Time Unknowns Separate

若某事重要但尚不可知，顯式記錄於延遲實作備註下，而非假裝在計劃中解決之。

示例：
- 確切方法或輔助名稱
- 觸及實際碼後之最終SQL或查詢細節
- 依賴觀察實際測試失敗之運行時行為
- 實作開始後可能變得多餘之重構

### Phase 4: Write the Plan

跨所有深度用同一規劃理念。改變細節量，非規劃與執行之邊界。

#### 4.1 Plan Depth Guidance

**Lightweight**
- 保持計劃精簡
- 通常2-4個實作單元
- 省略增值不大之選用段落

**Standard**
- 用完整核心模板，省略不增值之選用段落（含 High-Level Technical Design）
- 通常3-6個實作單元
- 相關時含風險、延遲問題及全系統影響

**Deep**
- 用完整核心模板加適用之選用分析段落
- 通常4-8個實作單元
- 當改善清晰度時將單元分組為階段
- 當適用時含備選方案、文檔影響及更深風險處理

#### 4.1b Optional Deep Plan Extensions

對於足夠大、風險高或跨領域之工作，加確有幫助之段落：
- **Alternative Approaches Considered**
- **Success Metrics**
- **Dependencies / Prerequisites**
- **Risk Analysis & Mitigation**
- **Phased Delivery**
- **Documentation Plan**
- **Operational / Rollout Notes**
- **Future Considerations** 僅當其實質影響當前設計

勿作樣板添加。僅於改善執行品質或利益相關者對齊時包含。

#### 4.2 Core Plan Template

省略顯然不適用之選用段落，尤其是Lightweight計劃。

```markdown
---
title: [Plan Title]
type: [feat|fix|refactor]
status: active
date: YYYY-MM-DD
origin: docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md  # include when planning from a requirements doc
deepened: YYYY-MM-DD  # optional, set when the confidence check substantively strengthens the plan
---

# [Plan Title]

## Overview

[What is changing and why]

## Problem Frame

[Summarize the user/business problem and context. Reference the origin doc when present.]

## Requirements Trace

- R1. [Requirement or success criterion this plan must satisfy]
- R2. [Requirement or success criterion this plan must satisfy]

## Scope Boundaries

- [Explicit non-goal or exclusion]

<!-- Optional: When some items are planned work that will happen in a separate PR, issue,
     or repo, use this sub-heading to distinguish them from true non-goals. -->
### Deferred to Separate Tasks

- [Work that will be done separately]: [Where or when -- e.g., "separate PR in repo-x", "future iteration"]

## Context & Research

### Relevant Code and Patterns

- [Existing file, class, component, or pattern to follow]

### Institutional Learnings

- [Relevant `docs/solutions/` insight]

### External References

- [Relevant external docs or best-practice source, if used]

## Key Technical Decisions

- [Decision]: [Rationale]

## Open Questions

### Resolved During Planning

- [Question]: [Resolution]

### Deferred to Implementation

- [Question or unknown]: [Why it is intentionally deferred]

<!-- Optional: Include when the plan creates a new directory structure (greenfield plugin,
     new service, new package). Shows the expected output shape at a glance. Omit for plans
     that only modify existing files. This is a scope declaration, not a constraint --
     the implementer may adjust the structure if implementation reveals a better layout. -->
## Output Structure

    [directory tree showing new directories and files]

<!-- Optional: Include this section only when the work involves DSL design, multi-component
     integration, complex data flow, state-heavy lifecycle, or other cases where prose alone
     would leave the approach shape ambiguous. Omit it entirely for well-patterned or
     straightforward work. -->
## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

[Pseudo-code grammar, mermaid diagram, data flow sketch, or state diagram — choose the medium that best communicates the solution shape for this work.]

## Implementation Units

- [ ] **Unit 1: [Name]**

**Goal:** [What this unit accomplishes]

**Requirements:** [R1, R2]

**Dependencies:** [None / Unit 1 / external prerequisite]

**Files:**
- Create: `path/to/new_file`
- Modify: `path/to/existing_file`
- Test: `path/to/test_file`

**Approach:**
- [Key design or sequencing decision]

**Execution note:** [Optional test-first, characterization-first, or other execution posture signal]

**Technical design:** *(optional -- pseudo-code or diagram when the unit's approach is non-obvious. Directional guidance, not implementation specification.)*

**Patterns to follow:**
- [Existing file, class, or pattern]

**Test scenarios:**
<!-- Include only categories that apply to this unit. Omit categories that don't. For units with no behavioral change, use "Test expectation: none -- [reason]" instead of leaving this section blank. -->
- [Scenario: specific input/action -> expected outcome. Prefix with category — Happy path, Edge case, Error path, or Integration — to signal intent]

**Verification:**
- [Outcome that should hold when this unit is complete]

## System-Wide Impact

- **Interaction graph:** [What callbacks, middleware, observers, or entry points may be affected]
- **Error propagation:** [How failures should travel across layers]
- **State lifecycle risks:** [Partial-write, cache, duplicate, or cleanup concerns]
- **API surface parity:** [Other interfaces that may require the same change]
- **Integration coverage:** [Cross-layer scenarios unit tests alone will not prove]
- **Unchanged invariants:** [Existing APIs, interfaces, or behaviors that this plan explicitly does not change — and how the new work relates to them. Include when the change touches shared surfaces and reviewers need blast-radius assurance]

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| [Meaningful risk] | [How it is addressed or accepted] |

## Documentation / Operational Notes

- [Docs, rollout, monitoring, or support impacts when relevant]

## Sources & References

- **Origin document:** [docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md](path)
- Related code: [path or symbol]
- Related PRs/issues: #[number]
- External docs: [url]
```

對於更大之 `Deep` 計劃，僅於有用時擴展核心模板：

```markdown
## Alternative Approaches Considered

- [Approach]: [Why rejected or not chosen]

## Success Metrics

- [How we will know this solved the intended problem]

## Dependencies / Prerequisites

- [Technical, organizational, or rollout dependency]

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk] | [Low/Med/High] | [Low/Med/High] | [How addressed] |

## Phased Delivery

### Phase 1
- [What lands first and why]

### Phase 2
- [What follows and why]

## Documentation Plan

- [Docs or runbooks to update]

## Operational / Rollout Notes

- [Monitoring, migration, feature flag, or rollout considerations]
```

#### 4.3 Planning Rules

- **一切檔案路徑須為倉庫相對**——永不使用絕對路徑如 `/Users/name/Code/project/src/file.ts`。用 `src/file.ts`。絕對路徑使計劃不可攜於機器、worktree及團隊成員間。當計劃針對文檔所在以外之倉庫時，於計劃頂部一次聲明目標倉庫（如 `**Target repo:** my-other-project`），全文用倉庫相對路徑
- 優先路徑加類別/組件/模式引用，而非脆弱之行號
- 保持實作單元可勾選，用 `- [ ]` 語法追蹤進度
- 不含實作碼——無導入、確切方法簽名或框架特定語法
- 偽碼草圖及DSL語法允許於 High-Level Technical Design 段落及逐單元 technical design 欄位，當其溝通設計方向時。明確標為方向性指引，非實作規格
- 鼓勵Mermaid圖表於其澄清散文難以跟隨之關係或流程時——ERD用於數據模型變更、序列圖用於多服務交互、狀態圖用於生命週期轉換、流程圖用於複雜分支邏輯
- 不含git命令、提交訊息或確切測試命令配方
- 不將實作單元擴展為微步 `RED/GREEN/REFACTOR` 指令
- 不假裝執行時問題已解決僅為使計劃看起來完整

#### 4.4 Visual Communication in Plan Documents

當計劃含4+個具非線性依賴之實作單元、System-Wide Impact中3+個交互面、Overview或Problem Frame中3+個行為模式/變體、或Key Technical Decisions或Alternative Approaches中3+個交互決策時，讀 `references/visual-communication.md` 取圖表及表格指引。此涵蓋計劃結構視覺化（依賴圖、交互圖、比較表）——非方案設計圖表，後者由 Section 3.4 涵蓋。

### Phase 5: Final Review, Write File, and Handoff

#### 5.1 Review Before Writing

定稿前檢查：
- 計劃不發明應在 `ce-brainstorm` 中定義之產品行為
- 若無來源文檔，有界規劃引導已建立足夠產品清晰度以負責規劃
- 每個主要決策植基於來源文檔或研究
- 每個實作單元具體、依依賴排序且實作就緒
- 若test-first或characterization-first姿態為顯式或強暗示，相關單元以輕量 `Execution note` 攜帶之
- 每個承載功能之單元有來自每個適用類別（happy path、edge cases、error paths、integration）之測試場景——適度於單元之複雜度，非填充或削減
- 測試場景命名具體輸入、動作及預期結果，不成為測試碼
- 承載功能之單元空白或缺失測試場景標記為不完整——承載功能之單元必有實際測試場景，非僅標註。`Test expectation: none -- [reason]` 標註僅對非承載功能之單元（純配置、鷹架、樣式）有效
- 延遲項目為顯式，非隱藏為虛假確定性
- 若含 High-Level Technical Design 段落，其用正確媒介、攜非規範框架且不含實作碼（無導入、確切簽名或框架特定語法）
- 逐單元 technical design 欄位（若有）精簡且為方向性而非可複製貼上
- 若計劃建新目錄結構，Output Structure 樹是否有助審閱者一覽整體形狀？
- 若 Scope Boundaries 列有為另一PR或任務之計劃工作，是否在 `### Deferred to Separate Tasks` 下而非與真正非目標混合？
- 視覺輔助（依賴圖、交互圖、比較表）是否較單掃散文更快助讀者掌握計劃結構？

若計劃源自需求文檔，重讀該文檔並驗：
- 所選方案仍匹配產品意圖
- 範圍邊界及成功標準保留
- 阻塞問題或已解決、或顯式假設、或退回 `ce-brainstorm`
- 來源文檔每一段落於計劃中回應——掃描每段確認無內容被靜默丟棄

#### 5.2 Write Plan File

**必須：先寫計劃檔至磁盤，再呈現任何選項。**

以Write工具存完整計劃至：

```text
docs/plans/YYYY-MM-DD-NNN-<type>-<descriptive-name>-plan.md
```

確認：

```text
Plan written to docs/plans/[filename]
```

**管線模式：** 若從自動化工作流如LFG、SLFG或任何 `disable-model-invocation` 上下文調用，跳過交互提問。自動做所需選擇並進至寫檔。

#### 5.3 Confidence Check and Deepening

寫計劃檔後，自動評估計劃是否需強化。

**兩種深化模式：**

- **自動模式**（計劃生成時預設）：不問用戶准許即運行。用戶可見正在強化何物但無需做決策。子代理發現直接合成入計劃。
- **交互模式**（由 Phase 0.1 之重新深化快速路徑激活）：用戶顯式要求深化既有計劃。子代理發現逐個呈現供審閱後方整合。用戶可接受、拒絕或討論每個代理之發現。僅接受之發現合成入計劃。

交互模式之存在因為按需深化為不同用戶姿態——用戶已有投入之計劃，欲精準控制何者變更。無論計劃由本技能生成、手寫或由其他工具產生，此皆適用。

`ce-doc-review` 與此信心檢查不同：
- 用 `ce-doc-review` 技能當文檔需清晰化、簡化、完備性或範圍控制
- 此信心檢查於計劃結構健全但仍需更強理據、順序、風險處理及全系統思維時強化之

**管線模式：** 此階段於管線/disable-model-invocation上下文中恆以自動模式運行。無需用戶交互。

##### 5.3.1 Classify Plan Depth and Topic Risk

從文檔定計劃深度：
- **Lightweight**——小、有界、低模糊度，通常2-4個實作單元
- **Standard**——中等複雜度，有些技術決策，通常3-6個單元
- **Deep**——跨領域、高風險或策略重要之工作，通常4-8個單元或分階段交付

建風險概況。將以下視為高風險信號：
- 認證、授權或安全敏感行為
- 支付、計費或金融流程
- 數據遷移、回填或持久數據變更
- 外部API或第三方整合
- 隱私、合規或用戶數據處理
- 跨介面平等或多面行為
- 重大推行、監控或運維關切

##### 5.3.2 Gate: Decide Whether to Deepen

- **Lightweight** 計劃通常不需深化，除非高風險
- **Standard** 計劃常受益當一或多重要段落仍顯薄弱
- **Deep** 或高風險計劃常受益於定向第二輪
- **薄弱本地基礎覆蓋：** 若 Phase 1.2 因本地模式薄弱（少於3個直接範例或相鄰領域匹配）而觸發外部研究，恆進至評分，不論計劃看起來多扎實。當計劃建於陌生領域時，關於系統行為之聲明更可能為假設而非驗證事實。評分過程成本低——若計劃確實扎實，評分無所獲且快速退出

若計劃已顯足夠扎實且薄弱基礎覆蓋不適用，報告 "Confidence check passed — no sections need strengthening" 並跳至 Phase 5.3.8（Document Review）。Document review恆運行不論深化是否需要——兩工具捕不同類問題。

##### 5.3.3–5.3.7 Deepening Execution

當深化適用時，讀 `references/deepening-workflow.md` 取信心評分檢查清單、段落至代理分派映射、執行模式選擇、研究執行、交互發現審閱及計劃合成指令。執行其中步驟5.3.3至5.3.7，然後返此做5.3.8。

##### 5.3.8–5.4 Document Review, Final Checks, and Post-Generation Options

至此階段時，讀 `references/plan-handoff.md` 取文檔審閱指令（5.3.8）、最終檢查及清理（5.3.9）、生成後選項菜單（5.4）及issue建立。勿提前載入此檔。Document review is mandatory——即使信心檢查已運行亦勿跳過。

NEVER CODE! Research, decide, and write the plan.
