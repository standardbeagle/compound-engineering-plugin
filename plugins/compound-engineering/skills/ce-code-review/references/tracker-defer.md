# 追蹤器偵測與遞延執行

此參考涵蓋互動模式之 Defer 動作如何於專案追蹤器建單。由 `SKILL.md` 於路徑問題需決定是否提供選項 C（建單）、逐步之 Defer 選項執行時、及選項 C（按發現建單）之批量預覽顯示時載入。

僅互動模式。Autofix、Report-only 及 Headless 模式不用此參考。

---

## 偵測

代理從顯而易見之文檔判斷專案追蹤器。主要來源：倉庫根及相關子目錄之 `CLAUDE.md` 及 `AGENTS.md`。補充信號（主要文檔不明確時）：`CONTRIBUTING.md`、`README.md`、`.github/` 下之 PR 模板、倉庫中可見之追蹤器 URL。

追蹤器可透過 MCP 工具（如 Linear MCP 伺服器）、CLI（如 `gh`）或直接 API 呈現。皆可接受。偵測輸出為含兩個可用性旗標之 tuple — 一為指定追蹤器（驅動標籤信心）、一為完整後備鏈（驅動 Defer 是否提供）：

```
{ tracker_name, confidence, named_sink_available, any_sink_available }
```

其中：
- `tracker_name` — 人類可讀名稱（"Linear"、"GitHub Issues"、"Jira"），或偵測無法識別特定追蹤器時為 `null`
- `confidence` — `high` 當追蹤器於文檔中明確命名（或透過連結 URL 至特定專案/工作區）且毫不含糊為專案正規追蹤器；`low` 當信號薄弱、衝突或僅為推斷
- `named_sink_available` — `true` 僅當代理實際可調用偵測到之追蹤器（MCP 工具已載入、CLI 已認證、或環境中有 API 憑證）；`false` 當追蹤器有文檔但無工具可達、或未找到追蹤器。驅動標籤信心：內聯追蹤器命名需此為 `true`。
- `any_sink_available` — `true` 當後備鏈中任何層（指定追蹤器、GitHub Issues 透過 `gh`、或Harness任務追蹤原語）可於本次會話調用。驅動 Defer 是否提供：無 sink 行為僅於此為 `false` 時觸發。

偵測為推理導向。勿維護列舉式待讀檔案清單。讀顯而易見之來源並形成信心結論；明顯來源未解決時，標籤回退至通用用語且代理執行前與用戶確認。

---

## 探測時機與快取

可用性探測**每會話至多一次**且**僅於路徑問題即將被問時**。非審閱開始時推測、非每次 Defer、非每逐步發現。快取 tuple 於同次運行中每個 Defer 動作重用。

典型探測序列：

1. 讀 `CLAUDE.md` / `AGENTS.md` 找追蹤器引用。無所獲則設 `tracker_name = null`、`confidence = low`。
2. **找到指定追蹤器時探測之。** GitHub Issues 執行 `gh auth status` 及 `gh repo view --json hasIssuesEnabled`。Linear 或其他 MCP 支援追蹤器，驗證相關 MCP 工具已載入且可回應。API 支援追蹤器，驗證環境中憑證。由探測結果設 `named_sink_available`。
3. **探測後備層計算 `any_sink_available`。** 即使找到並探測了指定追蹤器，後備層仍影響「無 sink」決策 — 無文檔追蹤器但 `gh` 可用時仍應提供 Defer。首個可用層即止：
   - 若 `named_sink_available = true`：`any_sink_available = true`（無需再探測）。
   - 否則，透過 `gh auth status` + `gh repo view --json hasIssuesEnabled` 探測 GitHub Issues（步驟 2 已探測則跳過）。成功則 `any_sink_available = true`。
   - 否則，檢查Harness任務追蹤原語。`TaskCreate` / `update_plan` 於技能在其Harness內運行時通常恆在 — 視為可用除非會話處於明確禁止之上下文（如轉換目標無任務綁定）。
   - 每層皆敗則 `any_sink_available = false`。

路徑問題完全跳過時（R2 零發現情況），不運行探測。快取 tuple 跨會話重用時，會話首次探測之 `named_sink_available = true` 保持快取 — 不每次 Defer 重新探測。

---

## 標籤邏輯

- 當 `confidence = high` 且 `named_sink_available = true`：路徑問題之選項 C 及逐步之逐發現 Defer 選項皆逐字包含追蹤器名。如 `File a Linear ticket per finding`、`Defer — file a Linear ticket`。
- 當 `any_sink_available = true` 但 `confidence = low` 或 `named_sink_available = false`（後備層在工作）：標籤用通用語 — `File an issue per finding`、`Defer — file a ticket`。執行會話首次 Defer 前，代理以平台阻塞式提問工具與用戶確認有效追蹤器選擇。
- 當 `any_sink_available = false`：選項 C 自路徑問題省略、選項 B（Defer）自逐步逐發現選項省略，代理於路徑問題題幹中告知用戶原因。

---

## 後備鏈

指定追蹤器不可用或未命名時，按此順序後備。偏好持久外部追蹤器而非僅會話內原語。

1. **指定追蹤器**（MCP 工具、CLI 或 API — 代理可直接調用）
2. **GitHub Issues 透過 `gh`** — `gh auth status` 成功且當前倉庫啟用 issues（`gh repo view --json hasIssuesEnabled` 返回 `true`）
3. **Harness 任務追蹤原語** — Claude Code 之 `TaskCreate`、Codex 之 `update_plan`、或其他目標平台之等價物 — 作為最後手段且僅於每次會話一次性持久確認後（見下）

永不後備至 `.context/compound-engineering/todos/`。內部待辦系統處於廢棄路徑（見計劃範圍邊界），不得由此 Defer 路徑擴展。

---

## 每會話一次性 Harness 後備確認

當後備至Harness任務追蹤原語生效時，於會話首次 Defer 動作執行前，代理以平台阻塞式提問工具（Claude Code 用 `AskUserQuestion`，Codex 用 `request_user_input`，Gemini 用 `ask_user`）向用戶確認一次。Claude Code 中 `AskUserQuestion` 為延遲工具 — 本次會話首次呼叫前，透過 `ToolSearch` 查詢 `select:AskUserQuestion` 載入其 schema。

> 未找到文檔記錄之追蹤器且 `gh` 不可用。Defer 動作將建立不逾本次會話之會話內任務。是否就此及後續 Defer 動作繼續？

選項：
- `以會話內任務繼續` — 代理以Harness任務建立處理本次運行所有 Defer
- `Cancel — 留發現為報告中之殘餘項` — 代理將所有待決 Defer 轉為 Skip 附註，並於完成報告之殘餘工作段呈現發現

確認按會話快取。後續 Defer 動作不再提示。

僅當 `ToolSearch` 明確返回無匹配或工具呼叫出錯 — 或於無阻塞式提問工具之平台 — 方回退至編號選項並等候用戶回覆。

---

## 單據組成

每個 Defer 動作建立包含以下內容之單據，按追蹤器能力調整：

- **標題：** 合併發現之 `title`（schema 上限 10 詞）。
- **正文：**
  - 純文字問題陳述 — 讀貢獻審閱者產物檔 `.context/compound-engineering/ce-code-review/<run-id>/{reviewer}.json` 中角色產生之 `why_it_matters`，用與 headless 模式相同之 `file + line_bucket(line, +/-3) + normalize(title)` 匹配。無產物匹配時回退至合併發現之 `title`、`severity`、`file` 及 `suggested_fix`（存在時） — 此等欄位保證在合併層精簡返回中。
  - 建議修復（發現 `suggested_fix` 存在時）。
  - 證據（審閱者產物中之直接引用）。
  - 元資料塊：`Severity: <level>`、`Confidence: <score>`、`Reviewer(s): <list>`、`Finding ID: <fingerprint>`。
- **標籤**（追蹤器支援時）：嚴重度標籤（`P0`、`P1`、`P2`、`P3`），追蹤器慣例支援時加來自審閱者名稱之類別標籤。
- **長度上限：** 組成正文超出追蹤器正文長度限制時，截斷並附 `... (continued in ce-code-review run artifact: .context/compound-engineering/ce-code-review/<run-id>/)` 且 finding_id 同時出現在截斷正文及元資料塊中以使產物可發現。

finding_id 為穩定指紋，組成為 `normalize(file) + line_bucket(line, +/-3) + normalize(title)` — 合併管線所用之同一指紋。

---

## 失敗路徑

單據建立於執行時失敗（API 錯誤、會話中途認證過期、速率限制、格式錯誤正文遭拒、4xx/5xx 回應），代理內聯呈現失敗並以平台阻塞式提問工具提問用戶：

題幹：
> Defer 失敗：<tracker name> 返回 <error summary>。代理應如何處理此發現？

選項：
- `於 <tracker> 重試` — 再試一次同一追蹤器（適用於暫時錯誤）
- `後備至下一 sink` — 將此發現之 Defer 移至後備鏈下一層（如從 Linear 到 GitHub Issues，或從 GitHub Issues 到Harness任務原語）
- `轉為 Skip — 記錄失敗` — 放棄此 Defer，於完成報告之失敗段註明失敗，繼續逐步或批量流程

高信心指定追蹤器執行時失敗時，快取之 `named_sink_available` 於會話其餘部分設為 `false`。後續 Defer 動作直接穿至下一層而不重試已確認損壞之 sink。`any_sink_available` 僅於每層皆確認損壞時方降為 `false` — 失敗之 Linear 呼叫若透過 `gh` 成功則保持 `any_sink_available = true`。

僅當 `ToolSearch` 明確返回無匹配或工具呼叫出錯 — 或於無阻塞式提問工具之平台 — 方回退至編號選項並等候用戶回覆。

---

## 各追蹤器行為

各追蹤器於執行時之具體行為。代理可透過適當介面（MCP、CLI 或 API）調用任一 — 選擇取決於當前環境中可用者。

| 追蹤器 | 介面 | 調用概要 | 正文格式 | 標籤 |
|---------|-----------|-------------------|-------------|--------|
| Linear | MCP（偏好）或 API | 於文檔識別之專案/工作區建單；MCP 工具暴露用戶上下文時指派給回報者 | Markdown | MCP 暴露時用嚴重度優先欄位；否則含嚴重度於正文 |
| GitHub Issues | `gh issue create` | 倉庫預設為當前倉庫。標籤存在時用 `--label` 加嚴重度標籤；無標籤配置時省略。首次失敗回退至無標籤單據。 | Markdown | 有標籤時 `--label P0` / `--label P1` 等 |
| Jira | MCP 或 API | 於文檔識別之專案建單；Jira 之 markdown 方言異於 GitHub — MCP 不處理轉換時正文用純文字 | MCP 不處理 markdown 時用純文字 | 嚴重度優先欄位 |
| Harness 任務原語（最後手段） | `TaskCreate` / `update_plan` / 平台等價 | 每發現建一任務，subject = title，description = 精簡版正文。無標籤。警告用戶任務不逾會話（見上方每會話確認）。 | 純文字，精簡 | 無 |
| 無 sink 可用 | — | Defer 選項省略；發現留於報告之殘餘工作段 | — | — |

不確定時，偏好「附明確用戶可見通知丟棄」而非「靜默通過並祈禱」。不產生持久產物且無用戶訊息之 Defer 為資料遺失。

---

## 跨平台備註

提問工具名稱因平台而異。用平台之阻塞式提問工具（Claude Code 用 `AskUserQuestion`，Codex 用 `request_user_input`，Gemini 用 `ask_user`）。Claude Code 中該工具應已由互動模式預載步驟載入 — 若未，即以 `ToolSearch` 查詢 `select:AskUserQuestion`。僅當該載入明確失敗或平台無阻塞工具時，方回退至編號選項並等候用戶下次回覆。

後備鏈之末層（Harness 任務追蹤原語）非每個目標平台皆有。轉換至無 `TaskCreate` / `update_plan` 等價物之平台時，代理應視該平台為「無Harness sink」並直接進入無 sink 行為（自選單省略 Defer 並告知用戶原因）。
