# 角色目錄

17 位審閱者角色分為常駐、跨切條件式及技術棧條件式層，外加 CE 專用代理。編排者以此目錄選擇每次審閱分派哪些審閱者。

## 常駐（4 角色 + 2 CE 代理）

每次審閱皆分派，無論 diff 內容。

**角色代理（結構化 JSON 輸出）：**

| 角色 | 代理 | 焦點 |
|---------|-------|-------|
| `correctness` | `review:ce-correctness-reviewer` | 邏輯錯誤、邊界案例、狀態缺陷、錯誤傳播、意圖合規 |
| `testing` | `review:ce-testing-reviewer` | 覆蓋缺口、弱斷言、脆弱測試、缺失邊界測試 |
| `maintainability` | `review:ce-maintainability-reviewer` | 耦合、複雜度、命名、死碼、過早抽象 |
| `project-standards` | `review:ce-project-standards-reviewer` | CLAUDE.md 及 AGENTS.md 合規 — frontmatter、引用、命名、跨平台可攜性、工具選擇 |

**CE 代理（非結構化輸出，分開綜合）：**

| 代理 | 焦點 |
|-------|-------|
| `review:ce-agent-native-reviewer` | 驗證新功能可為代理所用 |
| `research:ce-learnings-researcher` | 搜 docs/solutions/ 找與此 PR 模組及範式相關之既往議題 |

## 條件式（8 角色）

當編排者於 diff 中識別相關範式時分派。編排者讀完整 diff 並推理選擇 — 此為代理判斷，非關鍵詞匹配。

| 角色 | 代理 | 選擇時機（diff 觸及…） |
|---------|-------|---------------------------|
| `security` | `review:ce-security-reviewer` | 認證中介、公開端點、用戶輸入處理、權限檢查、密鑰管理 |
| `performance` | `review:ce-performance-reviewer` | 資料庫查詢、ORM 呼叫、迴圈密集資料轉換、快取層、非同步/並行碼 |
| `api-contract` | `review:ce-api-contract-reviewer` | 路由定義、序列化器/介面變更、事件 schema、匯出型別簽名、API 版本化 |
| `data-migrations` | `review:ce-data-migrations-reviewer` | 遷移檔、schema 變更、回填腳本、資料轉換 |
| `reliability` | `review:ce-reliability-reviewer` | 錯誤處理、重試邏輯、熔斷器、超時、背景任務、非同步處理器、健康檢查 |
| `adversarial` | `review:ce-adversarial-reviewer` | Diff 有 >=50 行非測試、非生成、非鎖檔之變更行，或觸及認證、支付、資料變更、外部 API 整合或其他高風險領域 |
| `cli-readiness` | `review:ce-cli-readiness-reviewer` | CLI 命令定義、參數解析、CLI 框架使用、命令處理器實作 |
| `previous-comments` | `review:ce-previous-comments-reviewer` | **僅 PR。** 審閱具前輪審閱留言或討論串之 PR。Stage 1 未收集 PR 元資料時完全跳過。 |

## 技術棧條件式（5 角色）

此等審閱者保持其原有獨到視角。與跨切角色相加，非取代。

| 角色 | 代理 | 選擇時機（diff 觸及…） |
|---------|-------|---------------------------|
| `dhh-rails` | `review:ce-dhh-rails-reviewer` | Rails 架構、服務物件、認證/會話選擇、Hotwire-vs-SPA 邊界、或可能違 Rails 慣例之抽象 |
| `kieran-rails` | `review:ce-kieran-rails-reviewer` | Rails 控制器、模型、視圖、任務、組件、路由、或其他清晰與慣例重要之應用層 Ruby 碼 |
| `kieran-python` | `review:ce-kieran-python-reviewer` | Python 模組、端點、服務、腳本、或帶型別之領域碼 |
| `kieran-typescript` | `review:ce-kieran-typescript-reviewer` | TypeScript 組件、服務、鉤子、工具、或共享型別 |
| `julik-frontend-races` | `review:ce-julik-frontend-races-reviewer` | Stimulus/Turbo 控制器、DOM 事件接線、計時器、非同步 UI 流程、動畫、或有競態潛力之前端狀態轉換 |

## CE 條件代理（遷移專用）

此等 CE 原生代理提供角色代理未涵蓋之專門分析。diff 含資料庫遷移、schema.rb、或資料回填時分派。

| 代理 | 焦點 |
|-------|-------|
| `review:ce-schema-drift-detector` | 交叉比對 schema.rb 變更與所含遷移以捕獲無關漂移 |
| `review:ce-deployment-verification-agent` | 產出附 SQL 驗證查詢及回滾程序之 Go/No-Go 部署清單 |

## 選擇規則

1. **恆分派全部 4 常駐角色** 加 2 CE 常駐代理。
2. **每個跨切條件角色**，編排者讀 diff 判斷角色領域是否相關。此為判斷，非關鍵詞匹配。
3. **每個技術棧條件角色**，以檔案型別及變更範式為起點，再判斷 diff 是否引入該審閱者之意義工作。勿僅因一個配置或生成檔案碰巧符合副檔名即分派語言特定審閱者。
4. **CE 條件代理**，diff 含遷移檔（`db/migrate/*.rb`、`db/schema.rb`）或資料回填腳本時分派。
5. **分派前公告團隊**，每個被選條件審閱者附一行理據。
