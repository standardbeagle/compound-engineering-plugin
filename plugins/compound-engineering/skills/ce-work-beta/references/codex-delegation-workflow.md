# Codex 委託工作流

當 `delegation_active` 為 true 時，程式碼實施委託至 Codex CLI（`codex exec`）而非直接實施。編排之 Claude Code 代理保留規劃、審閱、git 操作及編排之控制權。

## 委託決策

若 `work_delegate_decision` 為 `ask`，呈現建議並等候用戶選擇再繼續。

**建議 Codex 委託時：**

> "Codex delegation active. [N] implementation units -- delegating in one batch."
> 1. Delegate to Codex *(recommended)*
> 2. Execute with Claude Code instead

**建議 Codex 委託且多批次時：**

> "Codex delegation active. [N] implementation units -- delegating in [X] batches."
> 1. Delegate to Codex *(recommended)*
> 2. Execute with Claude Code instead

**建議 Claude Code 時（所有單元皆為 trivial）：**

> "Codex delegation active, but these are small changes where the cost of delegating outweighs having Claude Code do them."
> 1. Execute with Claude Code *(recommended)*
> 2. Delegate to Codex anyway

用戶選擇委託選項時，繼續至下方預委託檢查。選擇 Claude Code 選項時，設 `delegation_active` 為 false 並返回父技能之標準執行。

若 `work_delegate_decision` 為 `auto`（預設），以一行陳述執行計劃並不等待繼續："Codex delegation active. Delegating [N] units in [X] batch(es)." 若所有單元皆為 trivial，設 `delegation_active` 為 false 並繼續："Codex delegation active. All units are trivial -- executing with Claude Code."

## 預委託檢查

**於首批次前運行一次**。任何檢查失敗時，回退至標準模式執行剩餘計劃。後續批次不重新運行。

**0. 平台閘門**

Codex 委託僅在編排代理運行於 Claude Code 時支援。若當前會話為 Codex、Gemini CLI、OpenCode 或任何其他平台，設 `delegation_active` 為 false 並以標準模式繼續。

**1. 環境守衛**

檢查當前代理是否已在 Codex 沙箱內運行：

```bash
if [ -n "$CODEX_SANDBOX" ] || [ -n "$CODEX_SESSION_ID" ]; then
  echo "inside_sandbox=true"
else
  echo "inside_sandbox=false"
fi
```

`inside_sandbox` 為 true 時，委託會遞迴或失敗。

- 若 `delegation_source` 為 `argument`：發出 "Already inside Codex sandbox -- using standard mode." 並設 `delegation_active` 為 false。
- 若 `delegation_source` 為 `config` 或 `default`：靜默設 `delegation_active` 為 false。

**2. 可用性檢查**

**Codex 可用性（預解析）：**
!`command -v codex >/dev/null 2>&1 && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_FOUND"`

上方顯示 `CODEX_AVAILABLE` 時，繼續下一檢查。
顯示 `CODEX_NOT_FOUND` 時，Codex CLI 未安裝。發出 "Codex CLI not found (install via `npm install -g @openai/codex` or `brew install codex`) -- using standard mode." 並設 `delegation_active` 為 false。
顯示未解析之命令字串時，使用 shell 工具運行 `command -v codex`。若命令印出路徑，繼續。若失敗或無輸出，發出相同訊息並設 `delegation_active` 為 false。

**3. 同意流程**

若 `consent_granted` 不為 true（來自配置 `work_delegate_consent`）：

以平台之阻斷式提問工具呈現一次性同意警告（Claude Code 中之 AskUserQuestion）。同意警告解釋：
- 委託將實施單元作為結構化提示發送至 `codex exec`
- **yolo 模式**（`--yolo`）：完整系統存取包含網路。運行測試或安裝依賴之驗證步驟所需。**推薦。**
- **full-auto 模式**（`--full-auto`）：工作區寫入沙箱，無網路存取。

呈現沙箱模式選擇：(1) yolo（推薦），(2) full-auto。

接受時：
- 解析倉庫根：`git rev-parse --show-toplevel`。寫入 `work_delegate_consent: true` 及 `work_delegate_sandbox: <chosen-mode>` 至 `<repo-root>/.compound-engineering/config.local.yaml`
- 寫入方式：(1) 檔案或目錄不存在時，建立 `<repo-root>/.compound-engineering/` 並寫入 YAML 檔案；(2) 檔案存在時，合併新鍵保留既有鍵
- 更新已解析狀態中之 `consent_granted` 及 `sandbox_mode`

拒絕時：
- 詢問是否完全禁用此專案之委託
- 是：寫入 `work_delegate: false` 至 `<repo-root>/.compound-engineering/config.local.yaml`（使用上述相同倉庫根）。寫入方式：(1) 檔案或目錄不存在時建立並寫入；(2) 檔案存在時合併新鍵保留既有鍵。設 `delegation_active` 為 false，以標準模式繼續
- 否：僅本次調用設 `delegation_active` 為 false，以標準模式繼續

**無頭同意：** 若運行於無頭或非互動上下文，僅在配置檔中已記錄 `work_delegate_consent` 為 `true` 時委託繼續。未記錄同意時，靜默設 `delegation_active` 為 false。

## 批次處理

所有單元作為一批委託。若計劃超過 5 單元，按計劃自身之階段邊界拆分，或約每 5 個一組——永不拆分共享檔案之單元。若每個單元皆為 trivial 則完全跳過委託。

## 提示模板

委託執行開始時，透過 `mktemp -d` 建立每次運行之 OS 臨時臨時目錄並捕獲其**絕對路徑**用於所有下游用途。此調用之所有臨時檔案存於該目錄下。勿使用 `.context/`——這些臨時檔案為每次運行之一次性品，委託執行結束時清理（見下方清理），符合倉庫臨時空間慣例中之一-shot 產物。勿將未解析之 shell 變數字串傳遞至非 shell 工具（Write, Read）；使用 `mktemp -d` 返回之絕對路徑。

```bash
SCRATCH_DIR="$(mktemp -d -t ce-work-codex-XXXXXX)"
echo "$SCRATCH_DIR"
```

將回顯之絕對路徑稱為 `<scratch-dir>`，貫穿此工作流其餘部分。

各批次前，寫入提示檔案至 `<scratch-dir>/prompt-batch-<batch-num>.md`。

從批次之實施單元使用以下 XML 標記章節建構提示：

```xml
<task>
[單單元批次：實施單元之目標。
多單元批次：列出各單元及其目標，陳述各單元之具體工作、
倉庫上下文及預期最終狀態。]
</task>

<files>
[批次中所有單元之合併檔案列表——欲建立、修改或讀取之檔案。]
</files>

<patterns>
[所有單元 "Patterns to follow" 欄位之檔案路徑。若無模式：
"No explicit patterns referenced -- follow existing conventions in the
modified files."]
</patterns>

<approach>
[單單元批次：單元之方法。
多單元批次：列出各單元之方法，注明依賴及建議排序。]
</approach>

<constraints>
- Do NOT run git commit, git push, or create PRs -- the orchestrating agent handles all git operations
- Restrict all modifications to files within the repository root
- Keep changes tightly scoped to the stated task -- avoid unrelated refactors, renames, or cleanup
- Resolve the task fully before stopping -- do not stop at the first plausible answer
- If you discover mid-execution that you need to modify files outside the repo root, complete what you can within the repo and report what you could not do via the result schema issues field
</constraints>

<testing>
Before writing tests, check whether the plan's test scenarios cover all
categories that apply to each unit. Supplement gaps before writing tests:
- Happy path: core input/output pairs from each unit's goal
- Edge cases: boundary values, empty/nil inputs, type mismatches
- Error/failure paths: invalid inputs, permission denials, downstream failures
- Integration: cross-layer scenarios that mocks alone won't prove

Write tests that name specific inputs and expected outcomes. If your changes
touch code with callbacks, middleware, or event handlers, verify the
interaction chain works end-to-end.
</testing>

<verify>
After implementing, run ALL test files together in a single command (not
per-file). Cross-file contamination (e.g., mocked globals leaking between
test files) only surfaces when tests run in the same process. If tests
fail, fix the issues and re-run until they pass. Do not report status
"completed" unless verification passes. This is your responsibility --
the orchestrator will not re-run verification independently.

[Project test and lint commands. Use the union of all units'
verification commands as a single combined invocation.]
</verify>

<output_contract>
Report your result via the --output-schema mechanism. Fill in every field:
- status: "completed" ONLY if all changes were made AND verification passes,
  "partial" if incomplete, "failed" if no meaningful progress
- files_modified: array of file paths you changed
- issues: array of strings describing any problems, gaps, or out-of-scope
  work discovered
- summary: one-paragraph description of what was done
- verification_summary: what you ran to verify (command and outcome).
  Example: "Ran `bun test` -- 14 tests passed, 0 failed."
  If no verification was possible, say why.
</output_contract>
```

## 結果 Schema

委託執行開始時一次寫入結果 schema 至 `<scratch-dir>/result-schema.json`（使用開始時捕獲之絕對路徑）：

```json
{
  "type": "object",
  "properties": {
    "status": { "enum": ["completed", "partial", "failed"] },
    "files_modified": { "type": "array", "items": { "type": "string" } },
    "issues": { "type": "array", "items": { "type": "string" } },
    "summary": { "type": "string" },
    "verification_summary": { "type": "string" }
  },
  "required": ["status", "files_modified", "issues", "summary", "verification_summary"],
  "additionalProperties": false
}
```

各批次結果透過 `-o` 旗標寫入 `<scratch-dir>/result-batch-<batch-num>.json`。計劃失敗時，檔案保留原地供調試。

若結果 JSON 於成功退出碼後缺失或畸形，分類為任務失敗。

## 執行循環

首批次前初始化 `consecutive_failures` 計數器為 0。

**乾淨基線預檢：** 首批次前，驗證追蹤檔案無未提交變更：

```bash
git diff --quiet HEAD
```

此故意忽略未追蹤檔案。僅追蹤檔案之已暫存或未暫存修改使回滾不安全。但若批次計劃檔案列表之路徑存在未追蹤檔案，回滾（`git clean -fd -- <paths>`）將刪除之。若偵測到此類重疊，警告用戶並建議提交或暫存這些檔案後再繼續。

追蹤檔案為 dirty 時停止並呈現選項：(1) 提交當前變更，(2) 顯式暫存（`git stash push -m "pre-delegation"`），(3) 以標準模式繼續（設 `delegation_active` 為 false）。勿自動暫存用戶變更。

**委託調用：** 各批次，以**獨立之 Bash 工具呼叫**執行以下步驟（非合併為一次）：

**步驟 A — 啟動（背景，獨立 Bash 呼叫）：**

寫入提示檔案，然後以單一 Bash 工具呼叫設 `run_in_background: true`。此呼叫立即返回且無超時上限。

以下各 `<scratch-dir>` 替換為設定時捕獲之字面絕對路徑。各 Bash 工具呼叫啟動新鮮 shell，故設定片段中之 `$SCRATCH_DIR` 變數不保留——未解析之 `$SCRATCH_DIR` 會展開為空並破壞結果偵測。

```bash
# 替換為已解析之 sandbox_mode 值（yolo 或 full-auto）
SANDBOX_MODE="<sandbox_mode>"

# 解析沙箱旗標
if [ "$SANDBOX_MODE" = "full-auto" ]; then
  SANDBOX_FLAG="--full-auto"
else
  SANDBOX_FLAG="--dangerously-bypass-approvals-and-sandbox"
fi

codex exec \
  -m "<delegate_model>" \
  -c 'model_reasoning_effort="<delegate_effort>"' \
  $SANDBOX_FLAG \
  --output-schema "<scratch-dir>/result-schema.json" \
  -o "<scratch-dir>/result-batch-<batch-num>.json" \
  - < "<scratch-dir>/prompt-batch-<batch-num>.md"
```

關鍵：`run_in_background: true` 必須設為 **Bash 工具參數**，非 shell `&` 後綴。工具參數移除超時上限。前景 Bash 呼叫內之 shell `&` 仍受 2 分鐘預設超時。

`-c` 旗標之引號至關重要：整個 key=value 使用單引號，TOML 字串值內使用雙引號。例：`-c 'model_reasoning_effort="high"'`。

勿即興 CLI 旗標或修改此調用模板。

**步驟 B — 輪詢（前景，獨立 Bash 呼叫）：**

啟動呼叫返回後，發起**新的、獨立的**前景 Bash 工具呼叫輪詢結果檔案。保持代理之回合活動，使用戶無法干預工作樹。

`<scratch-dir>` 替換為設定時捕獲之字面絕對路徑。步驟 A 之 shell 變數不跨獨立 Bash 工具呼叫存活。

```bash
RESULT_FILE="<scratch-dir>/result-batch-<batch-num>.json"
for i in $(seq 1 6); do
  test -s "$RESULT_FILE" && echo "DONE" && exit 0
  sleep 10
done
echo "Waiting for Codex..."
```

輸出為 "Waiting for Codex..." 時，作為另一次獨立 Bash 呼叫再次發出相同輪詢命令。重複直到輸出為 "DONE"，再讀取結果檔案並繼續分類。

**輪詢終止條件：** 以下任一條件滿足時停止輪詢：

- **結果檔案出現**（輸出為 "DONE"）——正常繼續結果分類。
- **背景程序以非零碼退出** —— 分類為 CLI 失敗（第 1 列）。回滾並回退至標準模式。
- **背景程序以零碼退出但結果檔案缺失** —— 分類為任務失敗（第 2 列：退出 0，結果 JSON 缺失）。回滾並遞增 `consecutive_failures`。
- **5 輪輪詢**（約 5 分鐘）過去而結果檔案未出現且無背景程序通知 —— 視為掛起程序。分類為 CLI 失敗（第 1 列）。回滾並回退至標準模式。

**結果分類：** Codex 負責內部運行驗證並在回報前修正失敗——編排器不獨立重新運行驗證。

| # | 信號 | 分類 | 行動 |
|---|------|------|------|
| 1 | 退出碼 != 0 | CLI 失敗 | 回滾至 HEAD。所有剩餘工作回退至標準模式。 |
| 2 | 退出碼 0，結果 JSON 缺失或畸形 | 任務失敗 | 回滾至 HEAD。遞增 `consecutive_failures`。 |
| 3 | 退出碼 0，`status: "failed"` | 任務失敗 | 回滾至 HEAD。遞增 `consecutive_failures`。 |
| 4 | 退出碼 0，`status: "partial"` | 部分成功 | 保留差異。本地完成剩餘工作，驗證，提交。遞增 `consecutive_failures`。 |
| 5 | 退出碼 0，`status: "completed"` | 成功 | 提交變更。重設 `consecutive_failures` 為 0。 |

**結果交接——呈現給用戶：** 讀取結果 JSON 後、提交或回滾前，顯示摘要使用戶了解發生何事。格式：

> **Codex batch <batch-num> — <classification>**
> <summary from result JSON>
>
> **Files:** <comma-separated list from files_modified>
> **Verification:** <verification_summary from result JSON>
> **Issues:** <issues list, or "None">

失敗或部分結果時，包含分類原因（如 "status: failed", "result JSON missing"）使用戶了解為何編排器回滾或本地完成。

保持簡短——目標為透明度，非文字牆。每批次一個短區塊。

**回滾程序：**

```bash
git checkout -- .
git clean -fd -- <批次合併檔案列表之路徑>
```

勿使用無路徑引數之裸 `git clean -fd`。

**成功時提交：**

```bash
git add $(git diff --name-only HEAD; git ls-files --others --exclude-standard)
git commit -m "feat(<scope>): <batch summary>"
```

**批次間**（計劃拆分為多批次時）：報告完成內容、測試結果及下一步。立即繼續除非用戶干預——檢查點存在使用戶*可以*引導，非*必須*引導。

**斷路器：** 連續 3 次失敗後，設 `delegation_active` 為 false 並發出："Codex delegation disabled after 3 consecutive failures -- completing remaining units in standard mode."

**臨時清理：** 無需明確清理——OS 臨時處理最終清理（macOS `$TMPDIR` 週期性清除；Linux/WSL `/tmp` 重啟或週期性清理）。運行後保留 `<scratch-dir>` 亦保存中間產物供調試，若有任何問題。

## 混合模型歸因

部分單元由 Codex 執行、部分本地執行時：
- 所有單元使用委託：歸因至 Codex 模型
- 所有單元使用標準模式：歸因至當前代理之模型
- 混合：於 PR 描述中注明哪些單元被委託並同時標註兩個模型
