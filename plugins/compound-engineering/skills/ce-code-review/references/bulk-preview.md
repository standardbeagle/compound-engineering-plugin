# 批量動作預覽

此參考定義互動模式於每次批量動作前顯示之精簡計劃預覽 — LFG（路徑 B）、按發現建單（路徑 C）、及逐步之 `LFG the rest`（逐發現問題之選項 D）。預覽提供用戶單屏概覽代理即將執行之事，僅兩選項：Proceed 或 Cancel。

僅互動模式。

---

## 預覽觸發時機

三處呼叫：

1. **路徑 B（頂層 LFG）** — 用戶選 `LFG. Apply the agent's best-judgment action per finding` 後、任何動作執行前。範圍：所有待決 `gated_auto` / `manual` 發現。
2. **路徑 C（頂層建單）** — 用戶選 `File a [TRACKER] ticket per finding without applying fixes` 後、任何單建立前。範圍：所有待決 `gated_auto` / `manual` 發現。每則發現皆列於 `Filing [TRACKER] tickets (N):` 下，無論代理自然建議為何 — 因選項 C 為批量遞延。
3. **逐步 `LFG the rest`** — 用戶選 `LFG the rest — apply the agent's best judgment to this and remaining findings` 後、剩餘發現解決前。範圍：當前發現及所有未決者。逐步中已決之發現不含於預覽。

三種情形用戶皆以 `Proceed` 確認或以 `Cancel` 退出。預覽內無逐項決策 — 逐項決策屬逐步之職。

---

## 預覽結構

預覽按代理擬採行動分組。桶標頭僅於其桶非空時出現。

```
<Path label> — <scope summary>[ (tracker: <name>)]:

Applying (N):
  [P0] <file>:<line> — <one-line plain-English summary>
  [P1] <file>:<line> — <one-line plain-English summary>

Filing [TRACKER] tickets (N):
  [P2] <file>:<line> — <one-line plain-English summary>

Skipping (N):
  [P2] <file>:<line> — <one-line plain-English summary>

Acknowledging (N):
  [P3] <file>:<line> — <one-line plain-English summary>
```

示例，路徑 B（頂層 LFG）：

```
LFG plan — 8 findings (tracker: Linear):

Applying (4):
  [P0] orders_controller.rb:42 — Add ownership guard before order lookup
  [P1] webhook_handler.rb:120 — Raise on unhandled error instead of swallowing
  [P2] user_serializer.rb:14 — Drop internal_id from serialized response
  [P3] string_utils.rb:8 — Rename ambiguous helper for clarity

Filing Linear tickets (2):
  [P2] billing_service.rb:230 — N+1 on refund batch (no concrete fix)
  [P2] session_helper.rb:12 — Session reset behavior needs discussion

Skipping (2):
  [P2] report_worker.rb:55 — Recommendation is speculative; low confidence
  [P3] readme.md:14 — Style preference, subjective
```

---

## 各路徑之範圍摘要用語

- **路徑 B（頂層 LFG）：** 標頭作 `LFG plan — N findings[ (tracker: <name>)]:`。
- **路徑 C（頂層建單）：** 標頭作 `File plan — N findings as [TRACKER] tickets:`。每則發現入 `Filing [TRACKER] tickets (N):` 桶。
- **逐步 LFG the rest：** 標頭作 `LFG plan — N remaining findings (K already decided)[ (tracker: <name>)]:`。已決發現**不含**於預覽或桶計數。`K already decided` 計數表達逐步已部分完成。

偵測之追蹤器為低信心或通用時（見 `tracker-defer.md`），標頭省略 `(tracker: <name>)` 註解，桶標頭用通用形式（`Filing tickets (N):`）。

---

## 逐發現行格式

每行用計劃中框架品質條之精簡形式（R22-R25 — 可觀行為優先，除非定位所需否則無函式/變數名）。單行摘要取自角色產生之 `why_it_matters` 首句（首句過長時緊縮改寫以適預覽寬度）。

- **格式：** `[<severity>] <file>:<line> — <one-line summary>`
- **寬度目標：** 保持近 80 欄以於窄終端中整潔渲染。必要時以省略號截斷。
- **無函式/變數名內聯** 除非讀者需之定位問題。
- **建議桶用語：** `Acknowledging (N):` 桶以一行描述建議內容。無「fix」措辭 — 建議性發現無具體修復。

當某發現無 `why_it_matters`（如 Unit 2 模板升級未完全傳播至角色運行，或產物檔不可讀），回退至發現標題直接。若影響同次運行中多數發現，於完成報告之 Coverage 段註明此缺口。

---

## 提問及選項

預覽正文渲染後，以平台阻塞式提問工具提問用戶（Claude Code 用 `AskUserQuestion`，Codex 用 `request_user_input`，Gemini 用 `ask_user`）。Claude Code 中該工具應已由互動模式預載步驟載入 — 若未，即以 `ToolSearch` 查詢 `select:AskUserQuestion`。以下文字後備僅於該載入明確失敗時適用。

題幹（隨路徑調整）：
- 路徑 B：`The agent is about to apply the plan above. Proceed?`
- 路徑 C：`The agent is about to file the tickets above. Proceed?`
- 逐步 `LFG the rest`：`The agent is about to resolve the remaining findings above. Proceed?`

選項（三種情形皆固定兩項）：
- `Proceed` — 如所示執行計劃
- `Cancel` — 無動作，返原始問題

僅當 `ToolSearch` 明確返回無匹配或工具呼叫出錯 — 或於無阻塞式提問工具之平台 — 方回退至呈現編號選項並等候用戶下次回覆。

---

## Cancel 語義

- **路徑 B 之 Cancel：** 返用戶至路徑問題（四選項選單）。不施修復、不建單、不錄狀態。會話快取之追蹤器偵測 tuple 保留。
- **路徑 C 之 Cancel：** 同上 — 返路徑問題，無副作用。
- **逐步 `LFG the rest` 之 Cancel：** 返用戶至當前發現之逐發現問題（非路徑問題）。逐步從原處續行，先前決策完整保留。

任何情形，`Cancel` 不變更磁碟或外部狀態。

---

## Proceed 語義

用戶選 `Proceed` 時：

- **路徑 B（頂層 LFG）：** 對計劃中每則發現執行建議行動。Apply 發現入 Apply 集合以供單次批次結束之修復器分派（見 `walkthrough.md` Apply 批次規則）。Defer 發現經 `tracker-defer.md` 路由。Skip / Acknowledge 發現記錄為無動作。所有動作完成後，發出統一完成報告（見 `walkthrough.md`）。
- **路徑 C（頂層建單）：** 每則發現經 `tracker-defer.md` 建單。不施修復。所有單建畢（或失敗）後，發出統一完成報告。
- **逐步 `LFG the rest`：** 同路徑 B，但範圍限於用戶未決之發現。Apply 發現與逐步中用戶已選者合併入記憶體 Apply 集合；全部於單次逐步結束修復器呼叫中一起分派。

`Proceed` 期間失敗（如批量 Defer 中某發現建單失敗）依 `tracker-defer.md` 定義之失敗路徑 — 內聯呈現失敗並附 Retry / Fallback / Skip，繼續計劃其餘部分，於完成報告之失敗段捕獲失敗。

---

## 邊界案例

- **某桶零發現：** 省略桶標頭。僅有 Apply 及 Skip 之預覽不顯示空 `Filing tickets (0):` 或 `Acknowledging (0):` 行。
- **所有發現在同一桶：** 預覽仍顯示桶標頭；仍提供 Proceed / Cancel。此為路徑 C 常見情形（每則發現在 `Filing tickets` 下）。
- **N=1 預覽（範圍僅一發現）：** 仍用分組格式，僅單行桶。`Proceed` / `Cancel` 仍適用。
- **無追蹤器：** 選項 C 上游不提供（見 `tracker-defer.md` 無 sink 處理）。LFG（選項 B）及逐步 `LFG the rest` 仍可運行 — 其或含 Stage 5 每發現之 Defer 建議。渲染任何 LFG 形預覽前，當會話快取 `any_sink_available` 為 false 時，將每則 Defer 建議降級為 Skip，並於預覽上呈現降級（如 `Skipping — defer sink unavailable (N):` 桶，或標頭註：`N Defer recommendations downgraded to Skip — no tracker sink`）。此為預覽時運行時步驟，非 Stage 5 決勝 — 步驟 7b 僅排序衝突審閱者建議（`Skip > Defer > Apply > Acknowledge`，如 `SKILL.md` Stage 5 步驟 7b 所定）且不悉 sink 可用性。
- **逐步 `LFG the rest` 零剩餘發現：** 逐步自身邏輯於 N=1 時抑制 `LFG the rest` 為選項，故預覽不應以零剩餘發現調用。若仍如此，渲染 `LFG plan — 0 remaining findings` 並以無操作通過 Proceed。
