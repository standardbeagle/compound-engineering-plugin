---
name: ce-onboarding
description: "Generate or regenerate ONBOARDING.md to help new contributors understand a codebase. Use when the user asks to 'create onboarding docs', 'generate ONBOARDING.md', 'document this project for new developers', 'write onboarding documentation', 'vonboard', 'vonboarding', 'prepare this repo for a new contributor', 'refresh the onboarding doc', or 'update ONBOARDING.md'. Also use when someone needs to onboard a new team member and wants a written artifact, or when a codebase lacks onboarding documentation and the user wants to generate one."
---

# 生成入職文檔

爬取倉庫，於倉庫根生成 `ONBOARDING.md`——助新貢獻者理解碼庫，無需創建者親自解釋。

入職乃軟體通病，然於程式碼撰寫速度超越文檔之快節奏碼庫中更為尖銳——無論因 AI 輔助開發、快速原型、或團隊出貨快於文檔。此技自程式碼本身重建心智模型。

此技恆自零重新生成文檔。不讀亦不比對前版。若 `ONBOARDING.md` 已存，覆寫之。

## 核心原則

1. **先為人撰** — 清晰之散文，新開發者可讀可解。代理效用乃佳人文筆之副作用，非獨立目標。
2. **展示，非僅告知** — 架構與流程用 ASCII 圖、結構化信息用 Markdown 表格、所有檔案路徑、指令及程式碼引用用反引號格式。
3. **六段，各有所值** — 每段回答新貢獻者首小時內必問之問題。無臆測段落。純基礎設施無消費受眾者可略第二段，成五段。
4. **述可觀察者，非須推斷者** — 勿捏造設計理據或評估脆弱性。若程式碼未揭示決策原因，勿猜。
5. **永不納密鑰** — 入職文檔提交至倉庫。永不納 API 密鑰、令牌、密碼、含憑證之連接字串或任何密鑰值。引用環境變數*名*（`STRIPE_SECRET_KEY`），永不取其*值*。若 `.env` 檔含實際密鑰，僅取變數名。
6. **連結，勿重複** — 既有文檔已善述某主題時，內聯連結之而非重述。

## 執行流程

### 階段一：收集盤點

運行內建盤點腳本（`scripts/inventory.mjs`）以獲倉庫結構圖，無需逐檔閱讀：

```bash
node scripts/inventory.mjs --root .
```

解析 JSON 輸出。此提供：
- 專案名、語言、框架、包管理器、測試框架
- 目錄結構（頂層 + 來源目錄下一層）
- 各偵測生態系之入口點
- 可用腳本/指令
- 既有文檔檔案（含首標題以供分流）
- 測試基礎設施
- 基礎設施與外部依賴（env 檔、docker 服務、偵測之整合）
- Monorepo 結構（若適用）

若腳本失敗或返 error 欄，向用戶報告並停止。勿自不完整數據撰 `ONBOARDING.md`。

### 階段二：讀關鍵檔

依盤點指引，讀理解碼庫所必需之檔案。用原生檔案讀取工具（非 shell 指令）。

**讀何與為何：**

無依賴關係之檔案以並行批次讀之。如 README.md、入口點、AGENTS.md/CLAUDE.md 可於同一輪並行讀取，因其互不依賴彼此內容。

僅讀撰寫六段所需具體、特定細節之檔案。盤點已提供結構、語言、框架、腳本及入口點路徑——勿僅為確認盤點所言而重讀。不同倉庫需不同閱讀量；小型 CLI 工具或需四檔，複雜 monorepo 或需二十檔。以段落驅動所讀，非任意計數。

**優先序：**

1. **README.md**（若存） — 取專案用途與設置說明
2. **主要入口點** — 盤點 `entryPoints` 所列之檔。揭示應用啟動時所為。
3. **路由/控制器檔** — 自盤點結構尋 `routes/`、`app/controllers/`、`src/routes/`、`src/api/` 等目錄。讀主路由檔以理解主要流程。
4. **揭示架構與外部依賴之配置檔** — `docker-compose.yml`、`.env.example`、`.env.sample`、資料庫配置、`next.config.*`、`vite.config.*` 等同。僅盤點中有者方讀。**永不讀 `.env` 本身**——僅 `.env.example` 或 `.env.sample` 模板。僅取變數名，永不取值。
5. **AGENTS.md 或 CLAUDE.md**（若存） — 取已文檔化之專案慣例與模式。
6. **已發現之文檔** — 盤點 `docs` 清單含各檔標題（首標題）。以標題判斷哪些文檔與五段相關而無需先讀內容。僅讀標題表明直接相關之文檔全文。略過時序性腦暴/計劃檔，除非焦點提示特別要求。

勿投機性讀檔。每個檔案讀取應有盤點輸出及可追溯至需要它的段落為據。

### 階段三：撰 ONBOARDING.md

綜合盤點數據與關鍵檔內容為下列各段。寫檔至倉庫根。

**標題**：以 `# {Project Name} Onboarding Guide` 為文檔標題。自盤取專案名。勿以檔名為標題。

**撰作風格——文檔當如博學隊友咖啡間介紹專案，非如生成文檔。**

語調與語氣：
- 以第二人稱（"你"）撰——直接對新貢獻者說話
- 用主動語態與現在時：「路由器將請求分派至處理器」非「請求被路由器分派至處理器」
- 直接了當。句首置要點，非鋪墊：「運行 `bun dev` 以啟動伺服器」非「為了啟動開發伺服器，你需要運行以下命令」
- 匹配碼庫之正式度。草創原型用隨性筆調。企業系統用精確措辭。讀 README 與既有文檔取語調線索。

明晰度：
- 每句當教讀者某事或告其應為某事。刪不做此之句。
- 寧具體勿抽象：「`src/services/billing.ts` 扣客戶信用卡」非「計費模組處理支付相關業務邏輯」
- 引入術語時，即時於上下文中定義。勿令讀者捲至術語表。
- 用最簡而準確之詞。"Use" 非 "utilize"。"Start" 非 "initialize"。"Send" 非 "transmit"。

當避免：
- 贅詞與清喉：「值得注意的是」、「如上所述」、「在本節中我們將」
- 模糊概要：「此模組處理...的各個方面」——具體說明其所為
- 述事實時之模稜詞：「這基本上是」、「這實質上是」——若知其所為，直言
- 最高級與行銷語言：「robust」、「powerful」、「comprehensive」、「seamless」
- 關於文檔本身的元評論：「本文檔旨在...」——做即是

**格式要求——全文一致施用：**
- 所有檔案名（`package.json`）、路徑（`src/routes/`）、指令（`bun test`）、函數/類名、環境變數及技術術語用反引號
- 每段用 Markdown 標題（`##`）
- 依下述規定用 ASCII 圖與 Markdown 表格
- 粗體用於強調，節制使用
- 段落保持簡短——二至四句

**段落分隔符** — 每 `##` 段間插水平線（`---`）。此等文檔密集，掃描時受益於強視覺間隔。

**程式碼塊寬度限制——八十列為限。** Markdown 程式碼塊以 `white-space: pre` 渲染且永不換行，故寬行在 GitHub、平板及窄視窗上造成水平捲動。表格無礙——Markdown 渲染器換行。以下規則適用於 ``` 圍欄內所有內容：

- **ASCII 架構圖**：方塊垂直堆疊而非水平排列。同一水平線上勿置超過二方塊，各方塊標籤保持二十字符以內。此限圖寬約六十字符。
- **流程圖**：檔案路徑 + 標註保持八十字符以內。描述過長時移至下行或縮短。
- **目錄樹**：行內 `# 註釋` 保持三十字符以內。偏好簡要角色描述（"Editor plugins"）而非窮舉列表（"marks, heatmap, suggestions, collab cursors, etc."）。

#### 第一段：此為何物？

答：此專案做何事、為誰而做、解決何問題？

取材於 `README.md`、清單描述（如 `package.json` description 欄）、及入口點所揭示之應用目的。

若無法自程式碼清楚判斷專案目的，直言：「此專案之目的未見文檔。依程式碼結構觀之，似為...」

保持一至三段。

#### 第二段：如何使用

答：處於此專案消費端所見為何？

貢獻者理解架構前，需先了解專案從外部*做*什麼。此段銜接「此為何物」（第一段）與「如何構建」（第三段）。此段受眾——如文檔其餘部分——乃團隊新開發者。目標為展示產品從消費者角度的樣貌，俾後續架構與程式碼流程直覺可解。

依消費者類型定標題：

- **終端用戶產品**（Web 應用、行動應用、消費者工具） — 標題：**"User Experience"**。描述用戶所見及主要工作流（如「註冊、建立專案、邀請協作者、即時更新」）。取材於路由、入口點及 README。
- **開發者工具**（SDK、函式庫、開發 CLI、框架） — 標題：**"Developer Experience"**。描述開發者如何消費工具：安裝、展示主要 API 表面之最小使用範例、及二至三最常用指令或模式。此有別於第六段（開發者指南）——第六段涵蓋貢獻*此碼庫*，此段涵蓋*使用*此碼庫所產出之物。
- **兩者兼具**（有消費者產品及開發者 API/SDK 之平台） — 標題：**"User and Developer Experience"**。涵蓋兩個視角，先終端用戶體驗，次開發者表面。

每受眾保持一至三段或一短流程。若有完整之用戶或開發者文檔，連結之並各以一句摘要關鍵工作流。勿重複既有文檔。

僅純基礎設施、無消費受眾之內部部署工具可略此段。

---

#### 第三段：如何組織？

答：架構為何、關鍵模組為何、如何相連、系統外部依賴為何？

此段涵蓋**內部結構**與**系統邊界**——應用自身之外與何者通話。

**系統架構** — 有二種圖有助新貢獻者，系統複雜度決定用其一或二者：

1. **架構圖** — 組件、連接方式、所用協議或傳輸。開發者藉此理解程式碼所在與各部分如何通話。邊標交互類型（HTTP、WebSocket、bridge、queue 等）。頂為用戶面、中為內部管道、底為數據存儲與外部服務。

2. **用戶交互流程** — 用戶邏輯旅程。非關基礎設施，而是用戶視角——行動序列及系統回應。

**何時用其一或二者：**
- 簡明系統（單一 Web 應用、CLI 工具、簡單 API），架構圖已述用戶故事——一圖足矣。組件間之請求路徑*即*用戶流程。
- 多面產品（原生應用 + Web + API，或多種不同用戶類型之系統），兩者皆含。架構圖示開發者各部分如何連接；用戶交互流程示跨部分之邏輯產品體驗。此乃同一系統之不同視角。

以垂直堆疊保持圖寬八十列以內。

架構圖示例：

```
       User / Browser
            |
            |  HTTP / WebSocket
            v
+------------------+    bridge    +------------------+
| Browser Client   |<----------->| Native macOS App |
| (Vite bundle)    |             | (Swift/WKWebView)|
+--------+---------+             +--------+---------+
         |                                |
         |  WebSocket                     |  bridge
         v                               v
+------------------------------------------+
|            Express Server                |
|  routes -> services -> models            |
+--------------------+---------------------+
                     |
                     |  SQL / Yjs sync
                     v
              +--------------+
              | SQLite + Yjs |
              +--------------+
```

用戶交互流程示例（同一系統，不同視角）：

```
User opens app
  |
  v
Writes/edits document
  (Milkdown editor)
  |
  v
Changes sync in real-time
  (Yjs CRDT)
  |                \
  v                 v
Document persists   Other connected
  to SQLite         clients see edits
  |
  v
User shares doc
  -> generates link
  |
  v
Recipient opens
  in browser client
```

簡單專案（單一用途函式庫、CLI 工具）目錄樹已述全貌者，兩者皆略。

**內部結構** — 含 ASCII 目錄樹展示高層佈局：

```
project-name/
  src/
    routes/       # HTTP route handlers
    services/     # Business logic
    models/       # Data layer
  tests/          # Test suite
  config/         # Environment and app configuration
```

以簡要註釋標註目錄角色。僅納重要目錄——略構建產物、配置檔案及模板。

有明確職責之獨立模組或組件時，以表格呈之：

```
| Module | Responsibility |
|--------|---------------|
| `src/routes/` | HTTP request handling and routing |
| `src/services/` | Core business logic |
| `src/models/` | Database models and queries |
```

描述模組如何連接——誰調誰、數據在何處流轉。

**外部依賴與整合** — 揭露系統與自身碼庫外之一切通訊。此常為新貢獻者嘗試運行專案之最大阻礙。尋信號於：
- `docker-compose.yml`（資料庫、快取、訊息佇列）
- 配置檔或 `.env.example` 中之環境變數引用
- 客戶端函式庫之引入語句（資料庫驅動、API SDK、雲存儲）
- 盤點所偵測之框架（如 Prisma 暗示資料庫）

多項依賴時以表格呈之：

```
| Dependency | What it's used for | Configured via |
|-----------|-------------------|---------------|
| PostgreSQL | Primary data store | `DATABASE_URL` |
| Redis | Session cache and job queue | `REDIS_URL` |
| Stripe API | Payment processing | `STRIPE_SECRET_KEY` |
| S3 | File uploads | `AWS_*` env vars |
```

若未偵測到外部依賴，聲明之：「此專案似為自足，無外部服務依賴。」

#### 第四段：關鍵概念與抽象

答：何詞彙與模式為理解此碼庫所必需？

此段涵蓋二事：

**領域術語** — 專案特有之詞彙：實體名、API 資源名、資料庫表名、配置概念、新讀者不會立即辨識之行話。

**架構抽象** — 碼庫中塑造程式碼組織方式及貢獻者應如何看待變更的結構模式。此於原作者可能非自覺選擇這些模式之碼庫中尤為重要——或由 AI 引入、或自模板採用而無文檔。

值得呈現之架構抽象示例：
- "業務邏輯居服務層（`src/services/`），非路由處理器"
- "認證經 `src/middleware/auth.ts` 之中間件，於每條受保護路由前運行"
- "資料庫存取用儲存庫模式——每模型有對應儲存庫類"
- "背景工作定義於 `src/jobs/`，透過 Redis 支撐之佇列分派"

以單一表格呈領域術語與抽象：

```
| Concept | What it means in this codebase |
|---------|-------------------------------|
| `Widget` | The primary entity users create and manage |
| `Pipeline` | A sequence of processing steps applied to incoming data |
| Service layer | Business logic in `src/services/`, not handlers |
| Middleware chain | Requests flow through `src/middleware/` first |
```

目標五至十五項。僅納會使新讀者困惑或代表非顯而易見之架構決策的概念。略普遍理解之術語。

#### 第五段：主要流程

答：此應用主要功能實際運作時發生何事？

每個不同表面或用戶類型追蹤一條流程。「表面」為進入系統之意義不同路徑——原生應用、Web UI、API 消費者、CLI 用戶。每條流程應揭示前述流程未涵蓋之架構部分。當下一流程將大多重蹈已展示檔案時停止。

簡單函式庫或 CLI，一條流程。全端應用有 Web UI 與 API，二條。有原生 + Web + 代理表面之產品，三條。以架構驅動計數，非任意數字。

最重要之流程含 ASCII 流程圖：

```
User Request
  |
  v
src/routes/widgets.ts
  validates input, extracts params
  |
  v
src/services/widget.ts
  applies business rules, calls DB
  |
  v
src/models/widget.ts
  persists to PostgreSQL
  |
  v
Response (201 Created)
```

每步引用具體檔案路徑。檔案路徑 + 標註保持八十字符以內——必要時標註置於下行（如上所示）。

若首圖已建立結構模式，額外流程可用編號清單而非完整圖。

#### 第六段：開發者指南

答：如何設置專案、運行之、進行常見變更？

涵蓋以下方面：

1. **設置** — 先決條件、安裝步驟、環境配置。取材於 README 及盤點之腳本。指令以程式碼塊格式：
   ```
   bun install
   cp .env.example .env
   bun dev
   ```

2. **運行與測試** — 如何啟動開發伺服器、跑測試、跑 lint。用盤點所偵測之腳本。

3. **常見變更模式** — 二至三種最常見變更類型應去哪裡。例如：
   - "新增 API 端點，在 `src/routes/` 建路由處理器並於 `src/routes/index.ts` 註冊"
   - "新增資料庫模型，在 `src/models/` 建檔並運行 `bun migrate`"

4. **入門關鍵檔**（複雜專案適用） — 表格映射碼庫區域至具體入口檔，附簡要「何以始於此」之說明。此予新貢獻者具體閱讀清單，而非凝視大型目錄樹。例如：

   ```
   | Area | File | Why |
   |------|------|-----|
   | Editor core | `src/editor/index.ts` | All editor wiring |
   | Data model | `src/formats/marks.ts` | The annotation system everything builds on |
   | Server entry | `server/index.ts` | Express app setup and route mounting |
   ```

   源檔不到約十且目錄樹已是充分閱讀清單之簡單專案略此。

5. **實用提示**（複雜專案適用） — 若碼庫有特別大、複雜、或有非顯而易見陷阱之區域，作為簡要貢獻者提示呈現。此傳達真實的情境意識，助新貢獻者避坑。例如：
   - "編輯器模組約 450KB。多數行為透過 `src/editor/plugins/` 之插件連接——先理解插件架構再改編輯器。"
   - "協作子系統有諸多守衛與時期檢查。讀測試名以理解所維護之不變量。"

   碼庫小至可納於心智之簡單專案略此。

#### 內聯文檔連結

撰寫每段時，查盤點 `docs` 清單中是否有檔案直接相關於該段所述。若有，內聯連結：

> 認證使用基於令牌之中間件——見 [`docs/solutions/auth-pattern.md`](docs/solutions/auth-pattern.md) 取完整模式。

勿建獨立引用或延伸閱讀段。若某段無相關文檔，段自成之——勿提其缺失。

### 階段四：品質檢查

寫檔前，驗證：

- [ ] 每段回答其問題，無填充或贅詞
- [ ] 全文無任何密鑰、API key、令牌、密碼或憑證值
- [ ] 無捏造之設計理據（"we chose X because..."）
- [ ] 無脆弱性或風險評估
- [ ] 文中所引用之檔案路徑對應盤點中之真實檔案
- [ ] 所有檔案名、路徑、指令、程式碼引用及技術術語用反引號格式
- [ ] 文檔標題用 "# {Project Name} Onboarding Guide" 格式，非檔名
- [ ] 多表面專案含系統級架構圖（簡單函式庫/CLI 略）
- [ ] 所有程式碼塊內容（圖、樹、流程追蹤）符合八十列寬度
- [ ] 架構及/或主要流程段有 ASCII 圖
- [ ] 每個不同表面或用戶類型一條流程（架構驅動計數，非任意數字）
- [ ] 外部依賴與整合在架構段中呈現（或明確註明無）
- [ ] 模組職責、領域術語/抽象及外部依賴用表格
- [ ] Markdown 風格全文一致（標題、粗體、程式碼塊、表格）
- [ ] 既有文檔僅在直接相關處內聯連結
- [ ] 行文直接且具體——無贅詞、無模稜詞、無文檔元評論
- [ ] 語調匹配碼庫（草創專案隨性，企業專案精確）
- [ ] "如何使用"段在列，標題依受眾調整（User Experience / Developer Experience / 兩者），僅純基礎設施無消費受眾者可略
- [ ] 架構圖有標註邊（協議/傳輸），系統有多表面或多用戶類型時含用戶交互流程圖

寫檔至倉庫根，名 `ONBOARDING.md`。

### 階段五：呈現結果

寫畢後，告知用戶 `ONBOARDING.md` 已生成。以平台之阻塞發問工具（若可用）（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）提供後續選項。否則以編號選項呈於對話。

選項：
1. Open the file for review
2. Share to Proof
3. Done

依選擇：
- **Open for review** -> 以當前平台之檔案開啟或編輯器機制開啟 `ONBOARDING.md`
- **Share to Proof** -> 上傳文檔：
  ```bash
  CONTENT=$(cat ONBOARDING.md)
  TITLE="Onboarding: <project name from inventory>"
  RESPONSE=$(curl -s -X POST https://www.proofeditor.ai/share/markdown \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg title "$TITLE" --arg markdown "$CONTENT" --arg by "ai:compound" '{title: $title, markdown: $markdown, by: $by}')")
  PROOF_URL=$(echo "$RESPONSE" | jq -r '.tokenUrl')
  ```
  若成功，顯示 `View & collaborate in Proof: <PROOF_URL>`，然後返選項
- **Done** -> 無後續行動
