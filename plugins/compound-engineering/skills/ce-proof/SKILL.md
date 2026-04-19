---
name: ce-proof
description: "Create, edit, comment on, share, and run human-in-the-loop iteration loops over markdown documents via Proof's web API. Use when asked to \"proof\", \"share a doc\", \"create a proof doc\", \"comment on a document\", \"suggest edits\", \"review in proof\", \"iterate on this doc in proof\", \"HITL this doc\", \"sync a Proof doc to local\", when a caller needs an HITL review loop over a local markdown file (e.g., ce-brainstorm, ce-ideate, or ce-plan handoff), or when given a proofeditor.ai URL. Prefer this skill for any workflow whose output is a Proof URL or that uses a Proof doc as the review surface, even when not named explicitly."
allowed-tools:
  - Bash
  - Read
  - Write
  - WebFetch
---

# Proof — 協作 Markdown 編輯器

Proof 為人類與代理共構之協作文檔編輯器。支援兩種模式：

1. **Web API** - 透過 HTTP 建立及編輯共享文檔（無需安裝）
2. **本機橋接** - 透過 localhost:9847 驅動 macOS Proof 應用

## 身份與屬性

每次對 Proof 文檔之寫入皆須歸屬。兩個欄位承載代理身份：

- **機器 ID（每次操作之 `by`，`X-Agent-Id` 標頭）：** `ai:compound-engineering`——穩定、小寫連字符、機器可解析。出現於標記、事件及 API 回應。
- **顯示名稱（`POST /presence` 之 `name`）：** `Compound Engineering`——人類可讀，顯示於 Proof 之出席晶片及評論作者徽章。

每次文檔會話以帶 `X-Agent-Id` 標頭之 presence 請求設置顯示名稱一次；Proof 將名稱綁定至該代理 ID。此為本技能所有調用者之預設值；執行 HITL 審閱（`references/hitl-review.md`）之調用者可傳遞不同之 `identity` 對以指定歸屬子代理。勿使用 `ai:compound` 或其他臨時變體——身份保持一致，除非調用者明確覆寫。

## 人機協作審閱模式

當調用者（如 `ce-brainstorm`、`ce-plan`）需上傳本機 markdown 文檔、收集結構化人類回饋並同步最終文檔回磁碟時，載入 `references/hitl-review.md` 以獲完整循環規格：調用合約、標記分類（change / question / objection / ambiguous）、冪等攝入遍歷、基於異常之終端報告及 end-sync 原子寫入。

## Web API（分享之主要方式）

### 建立共享文檔

無需認證。回傳含存取令牌之可分享 URL。

```bash
curl -X POST https://www.proofeditor.ai/share/markdown \
  -H "Content-Type: application/json" \
  -d '{"title":"My Doc","markdown":"# Hello\n\nContent here."}'
```

**回應格式：**
```json
{
  "slug": "abc123",
  "tokenUrl": "https://www.proofeditor.ai/d/abc123?token=xxx",
  "accessToken": "xxx",
  "ownerSecret": "yyy",
  "_links": {
    "state": "https://www.proofeditor.ai/api/agent/abc123/state",
    "ops": "https://www.proofeditor.ai/api/agent/abc123/ops"
  }
}
```

以 `tokenUrl` 作為分享連結。`_links` 提供精確 API 路徑。

### 讀取共享文檔

```bash
curl -s "https://www.proofeditor.ai/api/agent/{slug}/state" \
  -H "x-share-token: <token>"
```

### 編輯共享文檔

所有操作送至 `POST https://www.proofeditor.ai/api/agent/{slug}/ops`

**註：** 使用 `/api/agent/{slug}/ops` 路徑（取自建立回應之 `_links`），而非 `/api/documents/{slug}/ops`。

**受保護文檔之認證：**
- 標頭：`x-share-token: <token>` 或 `Authorization: Bearer <token>`
- 令牌取自 URL 參數：`?token=xxx` 或建立回應之 `accessToken`
- 標頭：`X-Agent-Id: ai:compound-engineering`（presence 所需；包含於 ops 以確保歸屬一致）

**線格式提醒。** `/api/agent/{slug}/ops` 使用頂層 `type` 欄位；`/api/agent/{slug}/edit/v2` 使用 `operations` 陣列，各條目含 `op`。勿混用——向 `/ops` 發送 `op` 回傳 422。

**每次變更需 `baseToken`。** 寫入前立即自 `/state.mutationBase.token`（或 `/snapshot.mutationBase.token`）讀取，並含入請求體。遇 `BASE_TOKEN_REQUIRED` 或 `STALE_BASE` 時重新讀取並重試一次。見 `references/hitl-review.md` 中之 baseToken 食譜。

**`Idempotency-Key` 標頭**建議用於每次變更以利自動化重試；`/state.contract.idempotencyRequired` 為 true 時必須。

**對文字評論：**
```json
{"type": "comment.add", "quote": "text to comment on", "by": "ai:compound-engineering", "text": "Your comment here", "baseToken": "<token>"}
```

**回覆評論：**
```json
{"type": "comment.reply", "markId": "<id>", "by": "ai:compound-engineering", "text": "Reply text", "baseToken": "<token>"}
```

**解決 / 取消解決評論：**
```json
{"type": "comment.resolve", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
{"type": "comment.unresolve", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

**建議取代（待定——用戶須接受/拒絕）：**
```json
{"type": "suggestion.add", "kind": "replace", "quote": "original text", "by": "ai:compound-engineering", "content": "replacement text", "baseToken": "<token>"}
```

**建議並立即套用（已追蹤但已提交——用戶可拒絕以回復）：**
```json
{"type": "suggestion.add", "kind": "replace", "quote": "original text", "by": "ai:compound-engineering", "content": "replacement text", "status": "accepted", "baseToken": "<token>"}
```

`status: "accepted"` 於一次呼叫中建立建議標記並提交變更。標記作為稽核軌跡保留，附逐項編輯歸屬及拒絕回復功能。適用於 `kind: "insert" | "delete" | "replace"`。

**接受或拒絕既有建議：**
```json
{"type": "suggestion.accept", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
{"type": "suggestion.reject", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

`suggestion.resolve` 不受支援——改用接受或拒絕。

**批量重寫（全檔取代）：**
```json
{"type": "rewrite.apply", "content": "full new markdown", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

**透過 `/edit/v2` 之區塊級編輯**（獨立端點，獨立格式）：
```bash
curl -X POST "https://www.proofeditor.ai/api/agent/{slug}/edit/v2" \
  -H "Content-Type: application/json" \
  -H "x-share-token: <token>" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: <uuid>" \
  -d '{
    "by": "ai:compound-engineering",
    "baseToken": "mt1:<token>",
    "operations": [
      {"op": "replace_block", "ref": "b3", "block": {"markdown": "Updated paragraph."}},
      {"op": "insert_after", "ref": "b3", "block": {"markdown": "## New section"}}
    ]
  }'
```

`operations` 內支援之 `op` 類型：`replace_block`、`insert_before`、`insert_after`、`delete_block`、`replace_range`（使用 `fromRef` + `toRef`）、`find_replace_in_block`（取 `occurrence: "first" | "all"`）。讀取 `/snapshot` 以取得穩定區塊 `ref` ID 及 `mutationBase.token`。

**客戶端連線時編輯無礙。** `/edit/v2`、`suggestion.add`（含 `status: "accepted"`）及所有評論操作於活躍協作中可用。僅 `rewrite.apply` 受 `LIVE_CLIENTS_PRESENT` 阻擋——其會覆蓋進行中之 Yjs 編輯。

**當循環中斷時。** 若變更在重新讀取及一次重試後仍持續失敗，或跨次讀取之狀態不一致，呼叫 `POST https://www.proofeditor.ai/api/bridge/report_bug` 並附上失敗請求 ID、slug 及原始回應。伺服器將豐富化並提報問題。

### 已知限制（Web API）

- 橋接風格端點（`/d/{slug}/bridge/*`）需要客戶端版本標頭（`x-proof-client-version`、`x-proof-client-build`、`x-proof-client-protocol`），缺少時回傳 426 CLIENT_UPGRADE_REQUIRED。改用 `/api/agent/{slug}/ops`。

## 本機橋接（macOS 應用）

需 Proof.app 運行中。橋接位於 `http://localhost:9847`。

**必要標頭：**
- `X-Agent-Id: claude`（presence 身份）
- `Content-Type: application/json`
- `X-Window-Id: <uuid>`（多文檔開啟時）

### 主要端點

| 方法 | 端點 | 用途 |
|--------|----------|---------|
| GET | `/windows` | 列出開啟文檔 |
| GET | `/state` | 讀取 markdown、游標、字數 |
| GET | `/marks` | 列出所有建議及評論 |
| POST | `/marks/suggest-replace` | `{"quote":"old","by":"ai:compound-engineering","content":"new"}` |
| POST | `/marks/suggest-insert` | `{"quote":"after this","by":"ai:compound-engineering","content":"insert"}` |
| POST | `/marks/suggest-delete` | `{"quote":"delete this","by":"ai:compound-engineering"}` |
| POST | `/marks/comment` | `{"quote":"text","by":"ai:compound-engineering","text":"comment"}` |
| POST | `/marks/reply` | `{"markId":"<id>","by":"ai:compound-engineering","text":"reply"}` |
| POST | `/marks/resolve` | `{"markId":"<id>","by":"ai:compound-engineering"}` |
| POST | `/marks/accept` | `{"markId":"<id>"}` |
| POST | `/marks/reject` | `{"markId":"<id>"}` |
| POST | `/rewrite` | `{"content":"full markdown","by":"ai:compound-engineering"}` |
| POST | `/presence` | `{"status":"reading","summary":"..."}` |
| GET | `/events/pending` | 輪詢用戶操作 |

### 出席狀態

`thinking`、`reading`、`idle`、`acting`、`waiting`、`completed`

## 工作流：審閱共享文檔

當收到 Proof URL 如 `https://www.proofeditor.ai/d/abc123?token=xxx`：

1. 自 URL 擷取 slug（`abc123`）及令牌
2. 透過 API 讀取文檔狀態
3. 使用 ops 端點新增評論或建議編輯
4. 作者即時看到變更

```bash
# 讀取
curl -s "https://www.proofeditor.ai/api/agent/abc123/state" \
  -H "x-share-token: xxx"

# 取得下次變更之 baseToken
BASE=$(curl -s "https://www.proofeditor.ai/api/agent/abc123/state" \
  -H "x-share-token: xxx" | jq -r '.mutationBase.token')

# 評論
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"comment.add",quote:"text",by:"ai:compound-engineering",text:"comment",baseToken:$base}')"

# 建議編輯（已追蹤，待定）
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"suggestion.add",kind:"replace",quote:"old",by:"ai:compound-engineering",content:"new",baseToken:$base}')"

# 建議並立即套用（已追蹤，已提交）
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"suggestion.add",kind:"replace",quote:"old",by:"ai:compound-engineering",content:"new",status:"accepted",baseToken:$base}')"
```

## 工作流：建立並分享新文檔

```bash
# 1. 建立
RESPONSE=$(curl -s -X POST https://www.proofeditor.ai/share/markdown \
  -H "Content-Type: application/json" \
  -d '{"title":"My Doc","markdown":"# Title\n\nContent here."}')

# 2. 擷取 URL 及令牌
URL=$(echo "$RESPONSE" | jq -r '.tokenUrl')
SLUG=$(echo "$RESPONSE" | jq -r '.slug')
TOKEN=$(echo "$RESPONSE" | jq -r '.accessToken')

# 3. 透過 presence 綁定顯示名稱
curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/presence" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d '{"name":"Compound Engineering","status":"reading","summary":"Uploaded doc"}'

# 4. 分享 URL
echo "$URL"

# 5. 使用 ops 端點編輯（需 baseToken）
BASE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN" | jq -r '.mutationBase.token')
curl -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"comment.add",quote:"Content here",by:"ai:compound-engineering",text:"Added a note",baseToken:$base}')"
```

## 工作流：拉取 Proof 文檔至本機

同步當前 Proof 文檔狀態至本機 markdown 檔案。用於：

- HITL 審閱 end-sync（`references/hitl-review.md` 階段五），當文檔源自本機檔案
- Proof 文檔之臨時快照至磁碟（關閉分頁前、歸檔、交接）
- 刷新本機工作副本以對照即時 Proof 版本

```bash
SLUG=<slug>
TOKEN=<accessToken>
LOCAL=<absolute-path>

# 一次讀取至暫存檔——避免透過 $(...) 傳遞 markdown，因其會去除尾隨換行。
STATE_TMP=$(mktemp)
curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN" > "$STATE_TMP"
REVISION=$(jq -r '.revision' "$STATE_TMP")

# 原子寫入：直接將 .markdown 位元組串流至暫存同檔，然後更名。
TMP="${LOCAL}.proof-sync.$$"
jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$LOCAL"
rm "$STATE_TMP"
```

`jq -jr`（`-j` 無尾隨換行，`-r` 原始字串）直接將 markdown 位元組串流至暫存檔，不經 shell 變數，故尾隨換行完整保留。同一檔案系統內 `mv` 為原子操作——崩潰之寫入保留原始檔案不變，而非半寫檔案。

**拉取非直接請求時先確認。** 若工作流因其他操作之副作用而拉取（如 HITL 審閱完成），顯示即將寫入之提示如「同步已審閱文檔至 `<localPath>`？」靜默覆寫令人驚訝——用戶可能已忘記該會話中存在本機檔案，或預期 Proof 保持正本直至明確要求拉取。

## 安全

- 編輯前以 `/state` 內容為真實來源
   - 活躍協作中使用 `edit/v2`（直接區塊變更）或 `suggestion.add`（追蹤變更）；`rewrite.apply` 僅用於無客戶端場景，因其於任何人連線時受 `LIVE_CLIENTS_PRESENT` 阻擋
   - 勿於單一 replace 中跨越表格單元格
   - 每次操作必含 `by: "ai:compound-engineering"`，標頭必含 `X-Agent-Id: ai:compound-engineering` 以確保歸屬一致
   - 每次變更前讀取新鮮 `baseToken`；遇 `STALE_BASE` 時重新讀取並重試一次
