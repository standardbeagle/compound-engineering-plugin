# Compounding Engineering Plugin

AI驅動開發工具，愈用愈智。使每單位工程工作比上次更易。

## 入門

安裝後，於任意專案執行 `/ce-setup`。一互動流程中診斷環境、安裝缺失工具、引導專案配置。

## 組件

| 組件 | 數量 |
|-----------|-------|
| 代理 | 50+ |
| 技能 | 42+ |

## 技能

### 核心工作流

工程工作之主要入口，以斜線指令調用：

| 技能 | 說明 |
|-------|-------------|
| `/ce-ideate` | 透過發散構思與對抗過濾發現高影響力專案改善 |
| `/ce-brainstorm` | 規劃前探索需求與方案 |
| `/ce-plan` | 為任意多步任務創建結構化計劃——軟體功能、研究工作流、活動、學習計劃——含自動信心檢查 |
| `/ce-code-review` | 結構化碼審，含分層角色代理、信心閘門與去重管線 |
| `/ce-work` | 系統化執行工作項 |
| `/ce-debug` | 系統化尋找根因並修復缺陷——追蹤因果鏈、形成可測假說、實施測試先行修復 |
| `/ce-compound` | 記錄已解決問題以累積團隊知識 |
| `/ce-compound-refresh` | 刷新陳舊或偏移之學習，決定保留、更新、替換或歸檔 |
| `/ce-optimize` | 以並行實驗、量測閘門及LLM-as-judge品質評分執行迭代優化迴圈 |

`/ce-optimize` 詳見 [`skills/ce-optimize/README.md`](./skills/ce-optimize/README.md)。

### 研究與脈絡

| 技能 | 說明 |
|-------|-------------|
| `/ce-sessions` | 跨Claude Code、Codex與Cursor查詢會話歷史 |
| `/ce-slack-research` | 搜尋Slack獲取組織脈絡——決策、約束與討論脈絡 |

### Git工作流

| 技能 | 說明 |
|-------|-------------|
| `ce-pr-description` | 從當前分支或指定PR撰寫或重新生成價值優先之PR標題與正文；直接使用或由其他技能調用 |
| `ce-clean-gone-branches` | 清理遠端追蹤分支已刪之本地分支 |
| `ce-commit` | 以傳達價值之訊息建立git提交 |
| `ce-commit-push-pr` | 提交、推送並開PR，含適應性描述；亦更新既有PR描述（委託標題/正文生成予 `ce-pr-description`） |
| `ce-worktree` | 管理Git worktree以行並行開發 |

### 工作流工具

| 技能 | 說明 |
|-------|-------------|
| `/ce-demo-reel` | 為PR擷取視覺demo reel（GIF演示、終端錄製、截圖），含專案類型感知之分層選擇 |
| `/ce-changelog` | 為近期合併創建引人入勝之更新日誌 |
| `/ce-report-bug` | 回報compound-engineering插件缺陷 |
| `/ce-resolve-pr-feedback` | 並行解決PR審查回饋 |
| `/ce-test-browser` | 於PR影響頁面執行瀏覽器測試 |
| `/ce-test-xcode` | 以XcodeBuildMCP於模擬器建置並測試iOS應用 |
| `/ce-onboarding` | 生成 `ONBOARDING.md` 助新貢獻者理解碼庫 |
| `/ce-setup` | 診斷環境、安裝缺失工具、引導專案配置 |
| `/ce-update` | 檢查compound-engineering插件版本並修復陳舊快取（限Claude Code） |
| `/ce-release-notes` | 摘要近期compound-engineering插件版本，或附版本引用回答關於過往版本之問題 |
| `/ce-todo-resolve` | 並行解決待辦事項 |
| `/ce-todo-triage` | 分類並排定待辦事項優先級 |

### 開發框架

| 技能 | 說明 |
|-------|-------------|
| `ce-agent-native-architecture` | 以提示詞原生架構構建AI代理 |
| `ce-andrew-kane-gem-writer` | 依Andrew Kane模式撰寫Ruby gem |
| `ce-dhh-rails-style` | 以DHH之37signals風格撰寫Ruby/Rails程式碼 |
| `ce-dspy-ruby` | 以DSPy.rb構建型別安全LLM應用 |
| `ce-frontend-design` | 創建生產級前端介面 |

### 審查與品質

| 技能 | 說明 |
|-------|-------------|
| `ce-doc-review` | 以並行角色代理審查文檔，獲角色特定回饋 |

### 內容與協作

| 技能 | 說明 |
|-------|-------------|
| `ce-every-style-editor` | 審查文案是否符合Every風格指南 |
| `ce-proof` | 透過Proof協作編輯器創建、編輯並分享文檔 |
| `ce-todo-create` | 基於檔案之待辦追蹤系統 |

### 自動化與工具

| 技能 | 說明 |
|-------|-------------|
| `ce-gemini-imagegen` | 以Google Gemini API生成並編輯圖像 |

### Beta / 實驗性

| 技能 | 說明 |
|-------|-------------|
| `/ce-polish-beta` | `/ce-code-review` 後之人工介入潤飾階段——驗證審查+CI、從 `.claude/launch.json` 啟動開發伺服器、生成可測試清單、分派潤飾子代理執行修復。超量工作則產出堆疊PR種子 |
| `/lfg` | 全自主工程工作流 |

## 代理

代理為技能調用之專門子代理——通常不直接呼叫。

### 審查

| 代理 | 說明 |
|-------|-------------|
| `ce-agent-native-reviewer` | 驗證功能為代理原生（動作+脈絡對等） |
| `ce-api-contract-reviewer` | 偵測破壞性API合約變更 |
| `ce-cli-agent-readiness-reviewer` | 依7項核心原則評估CLI代理友善度 |
| `ce-cli-readiness-reviewer` | ce-code-review之CLI代理就緒角色（條件式、結構化JSON） |
| `ce-architecture-strategist` | 分析架構決策與合規性 |
| `ce-code-simplicity-reviewer` | 簡約與極簡之最終把關 |
| `ce-correctness-reviewer` | 邏輯錯誤、邊界案例、狀態缺陷 |
| `ce-data-integrity-guardian` | 資料庫遷移與資料完整性 |
| `ce-data-migration-expert` | 驗證ID映射符合生產環境，檢查值是否互換 |
| `ce-data-migrations-reviewer` | 含信心校準之遷移安全性 |
| `ce-deployment-verification-agent` | 為高風險資料變更建立Go/No-Go部署清單 |
| `ce-dhh-rails-reviewer` | DHH視角之Rails審查 |
| `ce-julik-frontend-races-reviewer` | 審查JavaScript/Stimulus程式碼之競態條件 |
| `ce-kieran-rails-reviewer` | 嚴格慣例之Rails碼審 |
| `ce-kieran-python-reviewer` | 嚴格慣例之Python碼審 |
| `ce-kieran-typescript-reviewer` | 嚴格慣例之TypeScript碼審 |
| `ce-maintainability-reviewer` | 耦合、複雜度、命名、死碼 |
| `ce-pattern-recognition-specialist` | 分析程式碼之模式與反模式 |
| `ce-performance-oracle` | 效能分析與優化 |
| `ce-performance-reviewer` | 含信心校準之運行時效能 |
| `ce-reliability-reviewer` | 生產可靠性與故障模式 |
| `ce-schema-drift-detector` | 偵測PR中無關之schema.rb變更 |
| `ce-security-reviewer` | 含信心校準之可利用漏洞 |
| `ce-security-sentinel` | 安全稽查與漏洞評估 |
| `ce-testing-reviewer` | 測試覆蓋缺口、弱斷言 |
| `ce-project-standards-reviewer` | CLAUDE.md與AGENTS.md合規 |
| `ce-adversarial-reviewer` | 構建失敗場景以跨組件邊界破壞實現 |

### 文檔審查

| 代理 | 說明 |
|-------|-------------|
| `ce-coherence-reviewer` | 審查文檔之內部一致性、矛盾與術語偏移 |
| `ce-design-lens-reviewer` | 審查計劃之設計決策缺漏、互動狀態與AI冗餘風險 |
| `ce-feasibility-reviewer` | 評估所提技術方案能否經受現實考驗 |
| `ce-product-lens-reviewer` | 挑戰問題框架、評估範圍決策、揭露目標偏移 |
| `ce-scope-guardian-reviewer` | 挑戰不正當複雜性、範圍蔓延與過早抽象 |
| `ce-security-lens-reviewer` | 於計劃層面評估安全缺口（認證、資料、API） |
| `ce-adversarial-document-reviewer` | 挑戰前提、揭露未言假設、壓力測試決策 |

### 研究

| 代理 | 說明 |
|-------|-------------|
| `ce-best-practices-researcher` | 收集外部最佳實踐與範例 |
| `ce-framework-docs-researcher` | 研究框架文檔與最佳實踐 |
| `ce-git-history-analyzer` | 分析git歷史與程式碼演進 |
| `ce-issue-intelligence-analyst` | 分析GitHub議題以揭露重複主題與痛點模式 |
| `ce-learnings-researcher` | 搜尋機構學習以尋相關過往方案 |
| `ce-repo-research-analyst` | 研究倉庫結構與慣例 |
| `ce-session-historian` | 搜尋過往Claude Code、Codex與Cursor會話之相關調查脈絡 |
| `ce-slack-researcher` | 搜尋Slack獲取當前任務相關之組織脈絡 |
| `ce-web-researcher` | 執行迭代網路研究並回傳結構化外部依據（先前技術、相鄰方案、市場信號、跨域類比） |

### 設計

| 代理 | 說明 |
|-------|-------------|
| `ce-design-implementation-reviewer` | 驗證UI實現是否匹配Figma設計 |
| `ce-design-iterator` | 透過系統化設計迭代逐步精煉UI |
| `ce-figma-design-sync` | 同步Web實現與Figma設計 |

### 工作流

| 代理 | 說明 |
|-------|-------------|
| `ce-pr-comment-resolver` | 處理PR評論並實現修復 |
| `ce-spec-flow-analyzer` | 分析用戶流程並識別規範缺口 |

### 文檔

| 代理 | 說明 |
|-------|-------------|
| `ce-ankane-readme-writer` | 依Ankane風格模板為Ruby gem創建README |

## 安裝

```bash
claude /plugin install compound-engineering
```

然後執行 `/ce-setup` 檢查環境並安裝建議工具。

## 版本歷史

見倉庫根 [CHANGELOG.md](../../CHANGELOG.md) 為正式版本歷史。

## 授權

MIT
