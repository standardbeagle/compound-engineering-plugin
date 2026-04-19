# HITL 審閱模式

透過 Proof 分享之 markdown 文檔之人工介入迭代循環。由上游技能（`ce-brainstorm`、`ce-ideate`、`ce-plan`）交接其產出之草稿調用，或由用戶直接要求迭代其已有之本地 markdown 檔案（「分享至 proof 並迭代」、「與我 HITL 此文檔」）。兩種情況下機制相同：上傳本地文檔、讓用戶於 Proof 網頁 UI 標註、以線程內回覆及追蹤編輯吸收反饋、將最終文檔同步回磁碟。

此模式假設本地 markdown 檔案存在。無「從零開始」入口——若用戶需要新文檔，先用正常 proof 建立工作流建立，再調用 HITL。

HITL 審閱模式被要求時載入此文——無論由上游呼叫者或用戶直接。

---

## 調用約定

輸入：

- **來源檔案路徑**（必須）：本地 markdown 檔案之絕對或倉庫相對路徑。上游呼叫者調用此模式時顯式傳入路徑。用戶直接調用時（「分享此文檔至 proof 並迭代」），從對話上下文推導路徑——用戶剛引用、建立或編輯之檔案。不明確時詢問用戶哪個檔案。
- **文檔標題**（必須）：Proof 文檔之顯示標題。上游呼叫者顯式傳入；用戶直接調用時，預設為檔案之 H1 標題，無 H1 時回退至檔名（減去副檔名）。
- **建議下一步**（可選，呼叫者特定）：呼叫者希望在最終終端輸出中回顯之短字串（如 "Recommended next: `/ce-plan`"）。用戶直接調用時不使用——終端報告僅摘要迭代並詢問下一步。

代理身份固定，非參數：每個 API 呼叫使用代理 ID `ai:compound-engineering` 及顯示名稱 `Compound Engineering`。呼叫者不覆寫此值。

返回形式（上游呼叫者用於恢復交接；用戶直接調用時亦顯示於終端）：

- `status`：`proceeded` | `done_for_now` | `aborted`
- `localPath`：來源檔案路徑（與輸入相同）
- `localSynced`：`true` 若第五階段將審閱後文檔寫回 `localPath`；`false` 若用戶拒絕同步且本地過時。僅於 `proceeded` 時存在。
- `docUrl`：Proof 文檔之 tokenUrl
- `openThreadCount`：文檔中仍未解決之線程數
- `revision`：結束同步後之最終文檔修訂版（僅於 `proceeded`）

---

## 第一階段：上傳並等待

1. 將本地 markdown 檔案讀入記憶體。記住此內容為 `uploadedMarkdown`——第五階段與之比較以偵測會話期間是否有任何變更。
2. `POST https://www.proofeditor.ai/share/markdown` 附 `{title, markdown}` → 捕獲 `slug`、`accessToken`、`tokenUrl`
3. `POST /api/agent/{slug}/presence` 附 `X-Agent-Id: ai:compound-engineering`、`x-share-token: <token>`、body `{"name":"Compound Engineering","status":"reading","summary":"Uploaded doc for review"}`
4. 於終端顯著展示：

    ```
    Doc ready for review: <tokenUrl>
    ```

5. 以平台之阻斷式提問工具詢問用戶（Claude Code 之 `AskUserQuestion`，Codex 之 `request_user_input`，Gemini 之 `ask_user`）。若無提問工具，於聊天中呈現選項並等候回覆。

    **問題：** "Highlight text in Proof to leave a comment. The agent will read each one, reply in-thread or apply the fix, then sync changes back to your local file. What's next?"

    **選項：**
    - **I'm done with feedback — read it and apply**
    - **I have no feedback — proceed**

    若用戶仍在審閱，保持提示開啟——阻斷式提問自然等待。第三個「仍在進行」選項為無操作包裝。

    **I have no feedback — proceed**：跳至第五階段（結束同步）；以 `status: proceeded` 返回呼叫者。

    **I'm done with feedback**：繼續至第二階段。

---

## 第二階段：吸收通過

單次通過當前文檔狀態。確定性、冪等性、可從標記推導——無會話快取、無附帶狀態。

通過開始時，更新在場狀態為 `status: "acting"` 附簡短摘要如 `"Reading your feedback"` 使任何觀看 Proof 標籤者可見代理正在處理其留言。第三階段終端報告前更新為 `status: "waiting"` 使標籤發出「球在你方」之信號，同時終端詢問下一信號。與第一階段相同之 `POST /presence` 呼叫——僅 `status`/`summary` 不同。

### 2.1 讀取新鮮狀態

```
GET /api/agent/{slug}/state
Headers: x-share-token: <token>
```

捕獲：
- `markdown`（當前主體——包含任何用戶直接編輯及已接受建議）
- `revision`
- `marks`（以 markId 為鍵之物件）
- `mutationBase.token` —— 此輪變更所需之 baseToken

### 2.2 識別需要關注之標記

篩選 `marks` 至**全部**符合以下條件之項目：

- `by` 以 `human:` 開頭（由人類撰寫，非代理）
- `resolved` 為 `false`
- `thread` 無任何 `ai:*` 身分撰寫之條目，**或** `thread` 中最新條目由 `human:*` 撰寫且 `at` 時間戳晚於最新 `ai:*` 條目（用戶回覆了先前之代理回覆）

跳過其餘。代理撰寫之標記、已解決線程及已回覆且無新人類回應之線程已完成。

### 2.3 讀取各標記並決定如何回應

HITL 之意義為給用戶自然方式引導文檔，而無需將每個決策拖入終端。多數反饋可自動套用。僅在代理真正無法自信獨立判斷時升級。

真實反饋混合類型——「這是錯的，改名為 Y」同時為反對及指令；「為何 X？我偏好 Z」同時為問題及建議。勿強制乾淨分類。閱讀留言文字、錨定之 `quote` 及任何先前線程回覆，決定：

**代理能否自信地直接套用修正？** 祈使句（「將 X 改名為 Y」、「移除這個」、「添加關於 Z 的章節」）通常符合。套用編輯、以一行摘要回覆變更內容、解決。

**這是一個有明確答案之問題？** 線程內回答。若答案自成一體則解決。若回答浮現用戶應權衡之新決策，保持開放並於終端報告中呈現。

**這是不同意見？**（「這是錯的」、「與 §2 矛盾」、「這行不通」）。依當前內容評估主張。若代理同意，修正並回覆 "Agreed — updated to X"。若代理不同意，以理據回覆並保持開放。勿未經評估即默默套用反對——重點正是用戶因其認為計劃有誤而標記之。

**意圖是否真正不明確？** 先嘗試：以最合理之詮釋套用，回覆 "I read this as X — let me know if I should revert." 當風險低時這比往返更便宜。僅當詮釋導致實質不同結果時請求澄清。請求時，選項離散時使用平台之阻斷式提問工具快速多選，或自由形式回應更自然時留作開放線程留言。兩者皆保持線程開放使下次通過拾取用戶回覆。

**不變量：** 每個需要關注之標記在通過結束時皆有代理回覆在其線程中。未回覆 =「仍待處理」——下次通過重新分類。此使循環無附帶狀態即冪等：標記狀態*即*狀態。即使代理不同意或無法決定，亦回覆（含理據或問題）而非默默跳過。

### 2.4 套用編輯

用戶在文檔中協作，非等待批准。每個變更操作與即時客戶端協作——僅整份文檔 `rewrite.apply` 受閘門控制。選擇匹配意圖之工具：

**預設：`suggestion.add` 搭配 `status: "accepted"`** 用於基於引用錨定之內容變更（改寫、改名、釐清、修正、行內添加句子）。一次呼叫建立追蹤建議標記*並*提交變更。用戶看到已提交文字（無需待批准），標記作為審計軌跡保留，附逐編輯歸因及一鍵拒絕還原。此為 HITL 自動套用編輯之正確原語——給予用戶可逆軌跡而無需重新審閱。

```json
{"type":"suggestion.add","kind":"replace","quote":"<anchor>","content":"<new>","by":"ai:compound-engineering","status":"accepted","baseToken":"<token>"}
```

依情況使用 `kind: "insert" | "delete" | "replace"`；三種皆支援 `status: "accepted"`。

**僅在以下情況靜默使用 `/edit/v2`**：

- **需要原子性** —— 多個協調編輯必須全部提交或全部不提交（如插入新章節 + 更新另一區塊之引用 + 刪除過時段落）。`/edit/v2` 接受 `operations` 陣列原子提交；獨立之 `suggestion.add` 呼叫可能部分成功。
- **用戶前之自我修正** —— 代理在用戶查看文檔*之前*修正自身輸出（如吸收通過中途發現錯誤）。追蹤標記會暗示「曾有舊版本」，從用戶角度具誤導性。
- **純結構插入無引用錨點** —— 添加全新區塊/章節而無現有文字可作錨點。`suggestion.add` 需要 `quote`；`/edit/v2` 有基於區塊 `ref` 之 `insert_before` / `insert_after`。
- **結構列表項或區塊移除** —— `suggestion.add` 搭配 `kind: "delete"` 僅刪除列表項內之文字；項目符號（`*`、`-` 或數字 `1.`）作為孤立行保留。使用 `/edit/v2 delete_block` 移除整個區塊，或 `find_replace_in_block` 乾淨地拼出項目及其周圍空白。

```bash
# 取得快照以獲取區塊引用 + baseToken
curl -s "https://www.proofeditor.ai/api/agent/{slug}/snapshot" -H "x-share-token: <token>"
# 套用
curl -X POST "https://www.proofeditor.ai/api/agent/{slug}/edit/v2" \
  -H "Content-Type: application/json" -H "x-share-token: <token>" \
  -H "X-Agent-Id: ai:compound-engineering" -H "Idempotency-Key: <uuid>" \
  -d '{"by":"ai:compound-engineering","baseToken":"<token>","operations":[...]}'
```

支援之 `op` 類型：`replace_block`、`insert_before`、`insert_after`、`delete_block`、`replace_range`（`fromRef`+`toRef`）、`find_replace_in_block`（`occurrence: "first"|"all"`）。

操作主體形狀（區塊內容必須包裹在 `block: {markdown}` 中——伺服器拒絕扁平之 `{op, ref, markdown}` 形狀）：

```json
{"op":"replace_block","ref":"b8","block":{"markdown":"new content"}}
{"op":"insert_after","ref":"b3","block":{"markdown":"new block"}}
{"op":"delete_block","ref":"b6"}
{"op":"find_replace_in_block","ref":"b4","find":"old","replace":"new","occurrence":"first"}
{"op":"replace_range","fromRef":"b2","toRef":"b5","block":{"markdown":"..."}}
```

區塊 `ref` 值跨修訂版漂移——各 `/edit/v2` 呼叫前恆重新獲取 `/snapshot` 以取得新鮮引用。

**使用待定 `suggestion.add`（無 status）** 當變更之判斷敏感度足夠高至代理希望用戶在提交前明確批准——HITL 中罕見，因自動套用編輯之意義正是減少往返。多數判斷敏感之情況更適合以澄清問題保持線程開放。

**`rewrite.apply` 在即時審閱中不需要。** 其已被 `LIVE_CLIENTS_PRESENT` 阻擋。

**變更要求（每次寫入，包含回覆及解決）：**

- 頂層欄位為 `/ops` 之 `type`；`/edit/v2` 之 `operations[].op`。勿混用。
- 包含 `/state.mutationBase.token`（或 `/edit/v2` 之 `/snapshot.mutationBase.token`）之 `baseToken`。`STALE_BASE` 或 `BASE_TOKEN_REQUIRED` 時重新讀取並重試一次。
- 設 `by: "ai:compound-engineering"` 及標頭 `X-Agent-Id: ai:compound-engineering`。
- 包含 `Idempotency-Key` 標頭（每次邏輯寫入新鮮 UUID）使重試安全。
- 回覆：`{"type":"comment.reply","markId":"<id>","by":"ai:compound-engineering","text":"..."}`。解決：`{"type":"comment.resolve","markId":"<id>","by":"ai:compound-engineering"}`。需要時重新開啟：`{"type":"comment.unresolve", ...}`。

**當循環中斷時。** 若變更在新鮮讀取及一次重試後仍持續失敗，或兩次讀取對狀態不同意，先呼叫 `POST https://www.proofeditor.ai/api/bridge/report_bug` 附請求 ID、slug 及原始回應主體，再回退。勿默默跳過——那會丟失用戶依賴之審計軌跡。

---

## 第三階段：終端報告

基於例外。勿重播用戶已在 Proof 文檔中可見者——各線程之完整理據存於彼處。終端用於用戶需要做之決策。

每份報告涵蓋三件事，針對當前狀態自然措辭：

- **處理了什麼**（如多少留言已解決、任何自動套用之編輯）
- **仍開放者** —— 若有任何升級殘留，各則一行錨定引用加一行代理回覆或問題。完整上下文保留在 Proof 線程中
- **文檔 URL** —— 恆包含；用戶可能已關閉標籤

保持整份報告一目了然。三種常見形態自然產出：

- 乾淨通過（一切處理完畢）摺疊為一行加文檔 URL
- 升級通過在處理摘要後精簡列出開放線程
- 無新反饋之通過僅註明並指向文檔

以匹配情境之語氣措辭而非匹配模板——"handled 4, 1 still needs you" 及 "all 5 addressed, doc's ready" 皆可。

---

## 第四階段：下一信號提示

以平台之阻斷式提問工具詢問用戶（Claude Code 之 `AskUserQuestion`，Codex 之 `request_user_input`，Gemini 之 `ask_user`）。若無提問工具，於聊天中呈現選項並等候回覆。

**問題：** "Proof review pass done. What's next?"

提供涵蓋這些意圖之選項——使用具體之用戶面向標籤，非代理內部術語（無 "end-sync"、"ingest pass" 等）。僅包含適合當前狀態之選項。保持標籤祈使式及第三人稱（無 "I'll" / "I'm" ——工具中介選單中發言者為用戶或代理不明確）並保持 `[短標籤] — [描述]` 形狀於每個選項一致。「仍在進行，稍後再回來」選項不提供：阻斷式提問已等待，該選項為無操作包裝（依 `plugins/compound-engineering/AGENTS.md` 中互動式提問工具設計規則）。

- **討論** → `Discuss — walk through the open threads in terminal`
  於終端討論開放線程；代理將決策回傳至 Proof 線程。僅在有升級開放時有用。
- **繼續** → `Save — save the reviewed doc back to the local file`
  進入第五階段結束同步。若仍有升級開放，於標籤中命名（如 `Save with 3 threads still open`）使用戶明確接受取捨而非透過嵌套確認。
- **再次通過** → `Re-check — look for new comments in Proof`
  重新讀取狀態並重新吸收。乾淨通過後仍值得提供，因用戶可能於報告渲染期間添加了留言。
- **暫停** → `Pause — stop without saving`
  不同步即停止；以 `status: done_for_now` 返回呼叫者，無結束同步。

同步確認於第五階段進行，無論線程是否開放——此步驟僅詢問用戶下一步，非是否覆寫本地檔案。

---

## 第五階段：結束同步

用戶選擇**繼續**時運行。提示任何內容前，先檢查 Proof 內容是否實際偏離上傳者——若無，無需同步亦無需詢問。

1. 獲取當前狀態：`GET /api/agent/{slug}/state` 附 `x-share-token: <token>`。將完整回應主體儲存至臨時檔案（`$STATE_TMP`）使 markdown 位元組隨後可直接串流至磁碟而不經 `$(...)`（會去除尾隨換行）。從該檔案提取 `state.revision` 至 `$REVISION`。從該檔案讀取 `state.markdown` 用於步驟 2 之比較。

2. 比較 `state.markdown` 與 `uploadedMarkdown`（第一階段捕獲）。

    **若相同** —— 會話期間無內容變更。完全跳過同步提示。顯示：

    ```
    No changes to sync. Local file is unchanged.
    Doc: <tokenUrl>
    ```

    設在場狀態 `status: completed`、摘要 `"Review complete, no changes"`。以 `status: proceeded`、`localSynced: true`（本地匹配 Proof——無需寫入，本地不過時）、`revision: <state.revision>` 及其餘標準欄位返回呼叫者。

    **若不同** —— 繼續至步驟 3。

3. 以平台之阻斷式提問工具詢問（Claude Code 之 `AskUserQuestion`，Codex 之 `request_user_input`，Gemini 之 `ask_user`）。若無提問工具，於聊天中呈現選項並等候回覆。

    **問題：** "Sync the reviewed doc back to `<localPath>`? Proof has your review changes; local still has the pre-review copy."

    **選項：**
    - **Yes, sync now**（預設，推薦）
    - **Not yet, I'll pull it later**（以 `localSynced: false` 返回呼叫者）

    何以需要額外提示：用戶可能數小時前開始審閱，已忘記本地檔案之重要性。簡短確認使檔案寫入可見而非點擊先前 Proceed 之無聲副作用。呼叫者透過 `localSynced` 發出信號使下游工作流可警告本地過時。

4. **Yes, sync now** 時，將獲取之 markdown 寫入本地——見 SKILL.md 中 `Workflow: Pull a Proof Doc to Local`：

    ```bash
    # $STATE_TMP 為持有 /state 回應之臨時檔案（步驟 1）。
    TMP="${SOURCE}.proof-sync.$$"
    jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$SOURCE"
    rm "$STATE_TMP"
    ```

    以 `jq -jr` 直接從保存之狀態檔案串流 `.markdown` 位元組——勿將 markdown 捕獲至 shell 變數，因 `$(...)` 會去除尾隨換行並損壞寫入。`$REVISION`（步驟 1 中分別提取）作為變數安全；其為不透明純量。

    **Not yet** 時，跳過寫入（仍清理 `$STATE_TMP`）。

5. 設在場狀態 `status: completed`、摘要 `"Review synced to <localPath>"`（或同步被拒時 `"Review complete, local not updated"`）使 Proof UI 顯示循環已完成。

6. 顯示以下之一：

    已同步：
    ```
    Doc synced to <localPath> (revision <N>).
    Doc: <tokenUrl>
    ```

    已拒絕：
    ```
    Review complete. Local file kept as-is — pull from Proof when ready.
    Doc: <tokenUrl>
    ```

7. 返回呼叫者：
    ```
    status: proceeded
    localPath: <source>
    localSynced: true | false
    docUrl: <tokenUrl>
    openThreadCount: <K>
    revision: <N>
    ```

**勿**刪除 Proof 文檔。其保持為持久審閱記錄；呼叫者之工作流可能需要連回。

---

## 配方

### BaseToken 感知之變更

```bash
SLUG=<slug>
TOKEN=<accessToken>
AGENT_ID=ai:compound-engineering

mutate() {
  local PAYLOAD="$1"  # 不含 baseToken 之 jq 模板
  local BASE
  BASE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
    -H "x-share-token: $TOKEN" | jq -r '.mutationBase.token')
  curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
    -H "Content-Type: application/json" \
    -H "x-share-token: $TOKEN" \
    -H "X-Agent-Id: $AGENT_ID" \
    -H "Idempotency-Key: $(uuidgen)" \
    -d "$(jq -n --arg base "$BASE" --argjson payload "$PAYLOAD" '$payload + {baseToken: $base}')"
}
```

每次變更發送新鮮 `Idempotency-Key` 使網路波動之重試不會重複套用操作。當 `/state.contract.idempotencyRequired` 為 true 時此為必要，其他情況無害。

回應中 `STALE_BASE` 時，重新運行——狀態讀取自動拾取新鮮 token。

### 檢查回應時之 jq 陷阱

以 jq `//` 替代運算子從 API 回應提取欄位時，物件建構器內加括號——jq 將 `{markId: .markId // .result.markId}` 解析為語法錯誤。使用 `{markId: (.markId // .result.markId)}`，或將值拉出物件外：`jq -r '.markId // .result.markId'`。

### 身份

所有操作必須包含：
- 請求主體中之 `by: "ai:compound-engineering"`
- 標頭中之 `X-Agent-Id: ai:compound-engineering`（presence 必要；ops 建議用於一致歸因）

顯示名稱 `Compound Engineering` 透過 `POST /presence` 附 `{"name":"Compound Engineering", ...}` 綁定。上傳後設置一次；後續操作沿用。
