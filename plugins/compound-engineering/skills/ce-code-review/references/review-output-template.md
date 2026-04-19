# 碼審輸出模板

呈現綜合審閱發現時用此**確切格式**。發現按嚴重度分組，非按審閱者。

**重要：** 用管線分隔 markdown 表格（`| col | col |`）。勿用 ASCII 製圖字元。

## 範例

```markdown
## Code Review Results

**Scope:** merge-base with the review base branch -> working tree (14 files, 342 lines)
**Intent:** Add order export endpoint with CSV and JSON format support
**Mode:** autofix

**Reviewers:** correctness, testing, maintainability, security, api-contract
- security -- new public endpoint accepts user-provided format parameter
- api-contract -- new /api/orders/export route with response schema

### P0 -- Critical

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 1 | `orders_controller.rb:42` | User-supplied ID in account lookup without ownership check | security | 0.92 | `gated_auto -> downstream-resolver` |

### P1 -- High

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 2 | `export_service.rb:87` | Loads all orders into memory -- unbounded for large accounts | performance | 0.85 | `safe_auto -> review-fixer` |
| 3 | `export_service.rb:91` | No pagination -- response size grows linearly with order count | api-contract, performance | 0.80 | `manual -> downstream-resolver` |

### P2 -- Moderate

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 4 | `export_service.rb:45` | Missing error handling for CSV serialization failure | correctness | 0.75 | `safe_auto -> review-fixer` |

### P3 -- Low

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 5 | `export_helper.rb:12` | Format detection could use early return instead of nested conditional | maintainability | 0.70 | `advisory -> human` |

### Applied Fixes

- `safe_auto`: Added bounded export pagination guard and CSV serialization failure test coverage in this run

### Residual Actionable Work

| # | File | Issue | Route | Next Step |
|---|------|-------|-------|-----------|
| 1 | `orders_controller.rb:42` | Ownership check missing on export lookup | `gated_auto -> downstream-resolver` | Create residual todo and require explicit approval before behavior change |
| 2 | `export_service.rb:91` | Pagination contract needs a broader API decision | `manual -> downstream-resolver` | Create residual todo with contract and client impact details |

### Pre-existing Issues

| # | File | Issue | Reviewer |
|---|------|-------|----------|
| 1 | `orders_controller.rb:12` | Broad rescue masking failed permission check | correctness |

### Learnings & Past Solutions

- [Known Pattern] `docs/solutions/export-pagination.md` -- previous export pagination fix applies to this endpoint

### Agent-Native Gaps

- New export endpoint has no CLI/agent equivalent -- agent users cannot trigger exports

### Schema Drift Check

- Clean: schema.rb changes match the migrations in scope

### Deployment Notes

- Pre-deploy: capture baseline row counts before enabling the export backfill
- Verify: `SELECT COUNT(*) FROM exports WHERE status IS NULL;` should stay at `0`
- Rollback: keep the old export path available until the backfill has been validated

### Coverage

- Suppressed: 2 findings below 0.60 confidence
- Residual risks: No rate limiting on export endpoint
- Testing gaps: No test for concurrent export requests

---

> **Verdict:** Ready with fixes
>
> **Reasoning:** 1 critical auth bypass must be fixed. The memory/pagination issues (P1) should be addressed for production safety.
>
> **Fix order:** P0 auth bypass -> P1 memory/pagination -> P2 error handling if straightforward
```

## 反範式

勿產出如下內容。以下為錯誤：

```markdown
Findings

Sev: P1
File: foo.go:42
Issue: Some problem description
Reviewer(s): adversarial
Confidence: 0.85
Route: advisory -> human
────────────────────────────────────────
Sev: P2
File: bar.go:99
Issue: Another problem
```

此為失敗：無管線分隔表格、無嚴重度分組之 `###` 標頭、用製圖字元水平線、無編號發現、無 `## Code Review Results` 標題、判定非引言塊。恆用上方範例之表格格式。

## 格式規則

- **管線分隔 markdown 表格**呈現發現 — 勿用 ASCII 製圖字元或每發現間之水平線分隔（判定前之報告層 `---` 仍需）
- **嚴重度分組段落** — `### P0 -- Critical`、`### P1 -- High`、`### P2 -- Moderate`、`### P3 -- Low`。省略空嚴重度。
- **恆含 file:line 位置** 於碼審問題
- **Reviewer 欄** 顯示哪些角色標記該問題。多位審閱者 = 跨審閱者共識。
- **Confidence 欄** 顯示發現之信心分數
- **Route 欄** 顯示綜合處理決策為 ``<autofix_class> -> <owner>``。
- **標頭含** 範圍、意圖、及附每條件理據之審閱團隊
- **Mode 行** — 含 `interactive`、`autofix`、`report-only`、或 `headless`
- **Applied Fixes 段** — 僅於本次審閱調用執行修復階段時包含
- **Residual Actionable Work 段** — 僅於有未解決可操作發現移交後續工作時包含
- **Pre-existing 段** — 獨立表格，無 confidence 欄（此為資訊性）
- **Learnings & Past Solutions 段** — ce-learnings-researcher 結果，附 docs/solutions/ 檔連結
- **Agent-Native Gaps 段** — ce-agent-native-reviewer 結果。無缺口時省略。
- **Schema Drift Check 段** — ce-schema-drift-detector 結果。代理未運行時省略。
- **Deployment Notes 段** — ce-deployment-verification-agent 關鍵清單項。代理未運行時省略。
- **Coverage 段** — 抑制計數、殘餘風險、測試缺口、失敗審閱者
- **摘要用引言塊** 含判定、理據及修復順序
- **水平線**（`---`）分隔發現與判定
- **`###` 標頭** 於每段 — 勿用純文字標頭

## Headless 模式格式

`mode:headless` 中，以結構化文字信封取代互動式管線分隔表格報告。headless 格式定義於 SKILL.md 之 `### Headless output format` 段。與互動格式之關鍵差異：

- **無管線分隔表格。** 發現用 `[severity][autofix_class -> owner] File: <file:line> -- <title>` 行格式，附縮排 Why/Evidence/Suggested fix 行。
- **發現按 autofix_class 分組**（gated-auto、manual、advisory）而非嚴重度。組內按嚴重度排序。
- **判定在標頭**（輸出頂部）而非底部，俾程式化呼叫者先得。
- **`Artifact:` 行** 於元資料標頭提供呼叫者完整運行產物路徑。
- **`[needs-verification]` 標記** 於 `requires_verification: true` 之發現。
- **Evidence 行** 每發現包含。
- **完成信號：** "Review complete" 為末行。
