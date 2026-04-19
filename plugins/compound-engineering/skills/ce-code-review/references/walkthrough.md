# 逐發現逐步

此參考定義互動模式之逐發現逐步 — 用戶選選項 A（`Review each finding one by one — accept the recommendation or choose another action`）所入之路徑。亦涵蓋每個終端路徑（逐步、LFG、建單、零發現）所發出之統一完成報告。

僅互動模式。

---

## 入口

逐步自編排者接收：

- 按嚴重度排序（P0 → P1 → P2 → P3）之合併發現列表，經 Stage 5 信心門篩選為 `gated_auto` 及 `manual` 發現。建議性發現於被路由至此階段時包含（建議性發現通常居 report-only 佇列，但審閱流程路由至此作確認時取下方建議性變體）。
- 來自 `tracker-defer.md` 之快取追蹤器偵測 tuple（`{ tracker_name, confidence, named_sink_available, any_sink_available }`）。`any_sink_available` 決定 Defer 選項是否提供；`named_sink_available` + `confidence` 決定標籤是否內聯命名追蹤器。
- 供產物查閱之運行 ID。

每則發現之建議行動已由 Stage 5（步驟 7b — 行動決勝）正規化。逐步向用戶呈現該建議但不重新計算。

---

## 逐發現呈現

每則發現分兩部分呈現：**終端輸出塊**載說明，**提問**透過平台阻塞式提問工具（Claude Code 用 `AskUserQuestion`，Codex 用 `request_user_input`，Gemini 用 `ask_user`）載決策。勿合併二者 — 終端塊用 markdown；提問用純文字。

Claude Code 中工具應已由 `SKILL.md` 中互動模式預載步驟載入 — 若未，即以 `ToolSearch` 查詢 `select:AskUserQuestion`。以敘述文字渲染逐發現問題為缺陷，非有效後備。

### 終端輸出塊（觸發提問前印出）

以 markdown 渲染。標籤獨占一行，段落間空行：

```
## Finding {N} of {M} — {severity} {plain-English title}

{file}:{line}

**What's wrong**

{plain-English problem statement from why_it_matters}

**Proposed fix**

{suggested_fix — 依下方替換規則渲染：純文字優先、意圖語言}

**Why it works**

{簡短理據，可用時基於碼庫範式}

{R15 衝突上下文行，適用時}
```

替換：

- **`{plain-English title}`：** 3-8 詞摘要適作標題。取自合併發現之 `title` 欄位但改寫為可觀行為（如 "Path traversal in loadUserFromCache" 而非 "Missing userId validation on line 36"）。
- **`why_it_matters`：** 讀貢獻審閱者之產物檔 `.context/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`，用與 headless 模式相同之 `file + line_bucket(line, +/-3) + normalize(title)` 匹配。多位審閱者標記合併發現時，按合併發現審閱者列表順序嘗試。用首個匹配。
- **`suggested_fix`：** 取自合併發現之 `suggested_fix` 欄位。渲染為描述**意圖**之純文字，非語法。修復子代理擁有確切碼 — 逐步僅需足供用戶信任或拒絕行動。規則：
  - **預設 — 一句描述效果。** 修復達成什麼，位於何處？偏好意圖語言而非引用碼。
    - ✅ `Throw on non-2xx response before parsing JSON.`
    - ✅ `` Replace `==` with `===` on line 42. ``
    - ✅ `` Add a `response.ok` check after the fetch and throw on non-2xx. ``
    - ✅ `Extract the request-building logic into a helper and call it from both sites.`
    - ❌ `` Add `if (!response.ok) throw new Error(`HTTP ${response.status}`);` after the `await fetch(...)` call, before `response.json()`. `` — 巢狀反引號、多程式碼跨度、完整語句引用；終端中渲染破碎。
  - **程式碼跨度預算：每句至多 2 個內聯反引號跨度，各為單一識別符、運算符或短詞組**（如 `` `response.ok` ``、`` `===` ``、`` `fetchUserById` ``）。勿嵌入完整語句、模板字面量或需巢狀反引號之碼。意圖無法在此預算內表達時，純文字過近語法 — 改為更高層次重述，或改用摘要 + 產物指標。
  - **每個反引號跨度前後恆留空格。** 無之則終端 markdown 渲染器吞分隔符並合併文字。
  - **原始碼塊 — 僅用於簡短（≤5 行）真正新增之新碼**，無前狀態存在時（新檔、新函式、空體頂部之新守衛）。超過 5 行改用摘要 + 指標。
  - **摘要 + 產物指標** — 純文字無法捕捉修復時：一句轉換 + 關鍵符號/位置 + `Full fix: .context/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json → findings[].suggested_fix`。
  - **無 diff 塊。** 既有碼之修改以純文字渲染。
- **`Why it works`：** 紮實理據，儘可能引用碼庫中已有之類似範式（如「匹配 src/cli/io.ts:41 已用之格式驗證範式」）。一至三句。
- **R15 衝突上下文行（適用時）：** 貢獻審閱者隱含不同行動且 Stage 5 步驟 7b 決勝時，簡要呈現。如 `Correctness recommends Apply; Testing recommends Skip (low confidence). Agent's recommendation: Skip.` 編排者之建議 — 決勝後之值 — 為選單標記「推薦」者。

發現無產物匹配時（合併綜合發現，或角色產物寫入失敗），終端塊降級為僅標題 + `suggested_fix`（省略 `What's wrong` 及 `Why it works` 段）並為完成報告之 Coverage 段記錄缺口。

### 提問題幹（精簡、聚焦決策）

終端塊渲染後，以平台阻塞式提問工具觸發精簡雙行題幹：

```
Finding {N} of {M} — {severity} {short handle}.
{Action framing in a phrase}?
```

其中：

- **Short handle：** 匹配終端塊標題之 `{plain-English title}`。
- **Action framing：** 一詞組描述*單一建議行動*所為，作是非題。如 `Apply the format-validation + path.resolve guard?`、`Skip the fix since the fixture is being deleted?`、`Defer and file a rotation ticket?`。

勿於題幹中列舉替代方案。一項建議作是非 — 選項列表載替代。建議接近時，於 R15 衝突上下文行呈現分歧，非多選項題幹。

範例（建議 = Apply）：

```
Finding 3 of 8 — P1 path traversal in loadUserFromCache.
Apply the format-validation + path.resolve guard?
```

範例（建議 = Skip，因內容上下文覆蓋預設）：

```
Finding 1 of 9 — P0 hardcoded admin token.
Skip the fix since the fixture is being deleted?
(Security recommends Apply; file context recommends Skip. Agent's recommendation: Skip.)
```

勿嵌入碼塊、diff 語法或完整修復/理據於題幹。

### 發現間確認

用戶回答後、印下則發現之終端塊前，發出一行確認。如 `→ Applied. Fix staged at src/utils/api-client.ts:36-37.`、`→ Deferred. Ticket filed: <url>.`、`→ Skipped.`、`→ Acknowledged.`

### 選項（四項，或如註調整）

固定順序。勿重排：

```
1. Apply the proposed fix
2. Defer — file a [TRACKER] ticket
3. Skip — don't apply, don't track
4. LFG the rest — apply the agent's best judgment to this and remaining findings
```

按 `tracker-defer.md` 渲染 `[TRACKER]` 標籤：`confidence = high` 且 `named_sink_available = true` 時，`[TRACKER]` 替換為具體追蹤器名（如 `Defer — file a Linear ticket`）。`any_sink_available = true` 但 `confidence = low` 或 `named_sink_available = false` 時，用通用全標籤 `Defer — file a ticket` — 全標籤替換，非 `[TRACKER]` 代幣交換。

**於決勝後建議之選項標記 `(recommended)`。** 必要，非可選。四選項中任一皆可標：

```
1. Apply the proposed fix  (recommended)
2. Defer — file a ticket
3. Skip — don't apply, don't track
4. LFG the rest
```

```
1. Apply the proposed fix
2. Defer — file a ticket
3. Skip — don't apply, don't track  (recommended)
4. LFG the rest
```

審閱者分歧或內容上下文不利預設時，仍標一選項 — Stage 5 步驟 7b 所產出者 — 並於 R15 衝突上下文行呈現分歧。

### 調整

- **僅建議發現：** 發現 `autofix_class` 為 `advisory`（無可操作修復）時，選項 A 替換為 `Acknowledge — mark as reviewed`。其餘三選項保留。建議性變體為選單中出現 `Acknowledge` 之唯一情形。
- **N=1（恰一待決發現）：** 終端塊標題省略 `Finding N of M`，渲染為 `## {severity} {plain-English title}`。題幹首行去掉位置計數器，作 `{severity} {short handle}.`。選項 D（`LFG the rest`）因無後續發現而抑制 — 選單顯示三選項：Apply / Defer / Skip（建議性則為 Acknowledge）。
- **無 sink（Defer 選項不可用）：** 追蹤器偵測 tuple 報 `any_sink_available: false`（後備鏈每層 — 指定追蹤器、GitHub Issues、Harness 原語 — 皆不可達）時，選項 B（`Defer`）省略。題幹附一行解釋（如 `Defer unavailable on this platform — no tracker or task-tracking primitive detected.`）。選單顯示三選項：Apply / Skip / LFG the rest（僅建議發現以 Acknowledge 代 Apply）。**渲染選項前，將 Stage 5 步驟 7b 產生之任何逐發現 `Defer` 建議重映射為 `Skip`** 以使 `(recommended)` 標記恆落於選單中實際存在之選項。重映射觸發時，於 R15 衝突上下文行呈現（如 `Stage 5 recommended Defer; downgraded to Skip — no tracker sink available.`）。此為渲染時運行時步驟，映射 `bulk-preview.md` 對 LFG 預覽所做之 Defer→Skip 降級；Stage 5 步驟 7b 不悉 sink 可用性，僅排序衝突審閱者建議。
- **N=1 + 無 sink 組合：** 選單顯示二選項：Apply / Skip（或 Acknowledge / Skip）。

僅當 `ToolSearch` 明確返回無匹配或工具呼叫出錯 — 或於無阻塞式提問工具之平台 — 方回退至編號列表並等候用戶下次回覆。

---

## 逐發現路由

每則發現之回答：

- **Apply the proposed fix** — 加入記憶體 Apply 集。推進至下則發現。勿內聯分派修復器 — Apply 累積至逐步結束批次分派。
- **Acknowledge — mark as reviewed**（建議性變體）— 於記憶體決策列表記錄 Acknowledge。推進。無副作用。
- **Defer — file a [TRACKER] ticket** — 調用 `tracker-defer.md` 之 tracker-defer 流程。逐步位置指示器於任何失敗路徑子問題（Retry / Fall back / Convert to Skip）期間停留於當前發現。成功時，於記憶體決策列表記錄追蹤器 URL/引用並推進。從失敗路徑轉為 Skip 時，附失敗記錄於完成報告中推進。
- **Skip — don't apply, don't track** — 於記憶體決策列表記錄 Skip。推進。無副作用。
- **LFG the rest — apply the agent's best judgment to this and remaining findings** — 退出逐步迴圈。分派 `bulk-preview.md` 之批量預覽，範圍為當前發現及所有未決者。預覽標頭報告已決發現計數（"K already decided"）。用戶自預覽選 `Cancel` 時，返當前發現之逐發現問題（非路徑問題）。選 `Proceed` 時，依 `bulk-preview.md` 執行計劃 — Apply 發現與用戶逐步中已選者合併入記憶體 Apply 集，Defer 發現經 `tracker-defer.md` 路由，Skip / Acknowledge 無操作 — 然後進入逐步結束分派。

---

## 覆蓋規則

「覆蓋」意為用戶選不同預設行動（Defer 或 Skip 代 Apply，或 Apply 代代理建議）。無內聯自由形式自訂修復撰寫 — 逐步為決策迴圈，非結對程式介面。欲修復變體者選 Skip 並於流程外手動編輯；若亦欲追蹤該發現，自行建單。此取捨為 v1 範圍邊界之明確設計。

---

## 狀態

逐步狀態**僅存記憶體**。編排者維護：

- Apply 集（用戶選 Apply 之發現 ID）
- 決策列表（每則已回答發現及其行動及元資料如 Deferred 之 `tracker_url` 或 Skipped 之 `reason`）
- 發現列表中當前位置

無逐決策寫入磁碟。中斷之逐步（用戶取消提示、會話壓縮、網路斷裂）丟棄所有記憶體狀態。已執行之 Defer 動作留於追蹤器 — 此為外部副作用不可回滾。Apply 決策尚未分派（逐步結束批次分派），故隨碼不變而淨失。

正式跨會話恢復超出 v1 範圍。

---

## 逐步結束分派

迴圈終止後 — 每則發現已回答，或用戶取 `LFG the rest → Proceed` — 逐步交至分派階段：

1. **Apply 集：** 為完整累積 Apply 集生成一修復子代理。修復器以之作輸入佇列，一次遍歷對當前工作樹施所有變更。此保留既有「一修復器、一致樹」機制並使修復器一次得全集以處理跨修復依賴（兩 Apply 觸及重疊區域）。既有步驟 3 修復器提示需小幅更新以承認此佇列可能為異質（`gated_auto` 及 `manual` 混合，非僅 `safe_auto`） — 隨此參考一起撰寫。
2. **Defer 集：** 已於逐步中內聯執行。無需分派。
3. **Skip / Acknowledge：** 無操作。

分派完成後（或 `LFG the rest → Cancel` 後用戶逐一處理剩餘發現，或迴圈跑至完成），發出下方描述之統一完成報告。

---

## 統一完成報告

互動模式每個終端路徑發出相同完成報告結構。涵蓋：

- 逐步完成（所有發現已回答）
- 逐步經 `LFG the rest → Proceed` 退出
- 頂層 LFG（路徑 B）完成
- 頂層建單（路徑 C）完成
- `safe_auto` 後零發現（路徑問題被跳過 — 完成摘要為此結構之一行退化情況）

### 最低必含欄位（依 R12）

- **逐發現條目：** 流程觸及之每則發現，一行含 — 至少 — 標題、嚴重度、所採行動（Applied / Deferred / Skipped / Acknowledged）、Deferred 條目之追蹤器 URL 或會話內任務引用、及 Skipped 條目之一行原因（基於發現信心或一行 `why_it_matters` 摘要）。
- **按行動之摘要計數：** 各桶總數（如 `4 applied, 2 deferred, 2 skipped`）。
- **失敗明確標出：** 修復施用失敗、單據建立失敗（附追蹤器返回之原因）。失敗呈現於逐發現列表之上方以免遺漏。
- **審閱結束判定：** 既有 Stage 6 判定（Ready to merge / Ready with fixes / Not ready），由所有行動完成後之殘餘狀態計算。

### Coverage 段

延用既有 Coverage 資料（抑制發現計數、殘餘風險、測試缺口、失敗審閱者）並加一項：

- **框架增強缺口：** 產物查閱無匹配之發現數量（合併綜合發現或角色產物寫入失敗）。命名貢獻缺口之角色以供資料驅動未來角色升級決策。每次運行之缺口軌跡告知團隊哪些角色代理仍需關注。

### 報告順序

報告於所有執行完成後出現。報告內順序：失敗優先（逐發現列表上方），然後逐發現條目按行動桶排序為 `Applied / Deferred / Skipped / Acknowledged`，然後摘要計數，然後 Coverage，然後判定。

### 零發現退化情況

路徑問題因 `safe_auto` 後無 `gated_auto` / `manual` 發現而被跳過時，完成報告折疊為摘要計數 + 判定形式並加一行 — `safe_auto` 修復之計數。摘要用語映射 `SKILL.md` 步驟 2 互動模式零剩餘情況：無限制 `All findings resolved` 形式僅於無建議性或預存發現殘留時準確。報告中有建議性及/或預存發現殘留時，用限定形式指名已清除者及仍殘留者。範例：

無剩餘建議性或預存發現：

```
All findings resolved — 3 safe_auto fixes applied.

Verdict: Ready with fixes.
```

報告中有建議性及/或預存發現殘留：

```
All actionable findings resolved — 3 safe_auto fixes applied. (2 advisory, 1 pre-existing findings remain in the report.)

Verdict: Ready with fixes.
```

---

## 執行姿態

逐步運作上為唯讀，除兩處允許寫入：記憶體 Apply 集/決策列表（由編排者管理）及 tracker-defer 分派（外部單據建立，見 `tracker-defer.md`）。角色代理保持嚴格唯讀。逐步結束修復器分派為檔案修改之唯一點 — 由 `SKILL.md` 既有步驟 3 修復器合約治理。
