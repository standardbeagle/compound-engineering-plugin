# 文檔審查輸出模板

以**此確切格式**呈現整合審查結果。結果依嚴重度分組，非依審查者。

**重要：** 用管線分隔markdown表格（`| col | col |`）。勿用ASCII盒繪字元。

## 範例

```markdown
## Document Review Results

**Document:** docs/plans/2026-03-15-feat-user-auth-plan.md
**Type:** plan
**Reviewers:** coherence, feasibility, security-lens, scope-guardian
- security-lens -- plan adds public API endpoint with auth flow
- scope-guardian -- plan has 15 requirements across 3 priority levels

Applied 5 auto-fixes. 4 findings to consider (2 errors, 2 omissions).

### Auto-fixes Applied

- Standardized "pipeline"/"workflow" terminology to "pipeline" throughout (coherence)
- Fixed cross-reference: Section 4 referenced "Section 3.2" which is actually "Section 3.1" (coherence)
- Updated unit count from "6 units" to "7 units" to match listed units (coherence)
- Added "update API rate-limit config" step to Unit 4 -- implied by Unit 3's rate-limit introduction (feasibility)
- Added auth token refresh to test scenarios -- required by Unit 2's token expiry handling (security-lens)

### P0 -- Must Fix

#### Errors

| # | Section | Issue | Reviewer | Confidence |
|---|---------|-------|----------|------------|
| 1 | Requirements Trace | Goal states "offline support" but technical approach assumes persistent connectivity | coherence | 0.92 |

### P1 -- Should Fix

#### Errors

| # | Section | Issue | Reviewer | Confidence |
|---|---------|-------|----------|------------|
| 2 | Scope Boundaries | 8 of 12 units build admin infrastructure; only 2 touch stated goal | scope-guardian | 0.80 |

#### Omissions

| # | Section | Issue | Reviewer | Confidence |
|---|---------|-------|----------|------------|
| 3 | Implementation Unit 3 | Plan proposes custom auth but does not mention existing Devise setup or migration path | feasibility | 0.85 |

### P2 -- Consider Fixing

#### Omissions

| # | Section | Issue | Reviewer | Confidence |
|---|---------|-------|----------|------------|
| 4 | API Design | Public webhook endpoint has no rate limiting mentioned | security-lens | 0.75 |

### Residual Concerns

| # | Concern | Source |
|---|---------|--------|
| 1 | Migration rollback strategy not addressed for Phase 2 data changes | feasibility |

### Deferred Questions

| # | Question | Source |
|---|---------|--------|
| 1 | Should the API use versioned endpoints from launch? | feasibility, security-lens |

### Coverage

| Persona | Status | Findings | Auto | Present | Residual |
|---------|--------|----------|------|---------|----------|
| coherence | completed | 4 | 3 | 1 | 0 |
| feasibility | completed | 2 | 1 | 1 | 1 |
| security-lens | completed | 2 | 1 | 1 | 0 |
| scope-guardian | completed | 1 | 0 | 1 | 0 |
| product-lens | not activated | -- | -- | -- | -- |
| design-lens | not activated | -- | -- | -- | -- |
```

## 段落規則

- **摘要行**：審查者列表後必有。格式：「Applied N auto-fixes. K findings to consider (X errors, Y omissions).」零值子句省略。
- **Auto-fixes Applied**：列出自動套用之修復。每項附足夠細節以傳達實質——尤其添加內容或觸及文檔含義之修復。無則省略此段。
- **P0-P3段落**：僅含結果之嚴重度等級方納入。空等級省略。每等級內分**Errors**與**Omissions**子標題。該等級無該類型則子標題省略。
- **Residual Concerns**：信心門檻以下但經跨persona佐證提升之結果，及未提升之殘餘風險。無則省略。
- **Deferred Questions**：供後續工作流階段之問題。無則省略。
- **Coverage**：必有。所有計數為**整合後**。**Findings**須等於Auto + Present——若去重合併跨persona之結果，歸屬最高信心之persona並扣減另一方之計數。**Residual** = 此persona原始輸出中之`residual_risks`數（非Residual Concerns段中已提升之子集）。
