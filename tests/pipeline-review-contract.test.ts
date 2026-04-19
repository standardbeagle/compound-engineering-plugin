import { readFile } from "fs/promises"
import path from "path"
import { describe, expect, test } from "bun:test"

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8")
}

describe("ce-work review contract", () => {
  test("requires code review before shipping", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work/SKILL.md")
    // Review content extracted to references/shipping-workflow.md
    const shipping = await readRepoFile("plugins/compound-engineering/skills/ce-work/references/shipping-workflow.md")

    // SKILL.md should not contain extracted content
    expect(content).not.toContain("2. **Code Review**")
    expect(content).not.toContain("Consider Code Review")
    expect(content).not.toContain("Code Review** (Optional)")

    // Phase 3 has a mandatory code review step in the reference file
    expect(shipping).toContain("2. **程式碼審閱**")

    // Two-tier rubric in reference file
    expect(shipping).toContain("**第一級：行內自審**")
    expect(shipping).toContain("**第二級：完整審閱（預設）**")
    expect(shipping).toContain("ce-code-review")
    expect(shipping).toContain("mode:autofix")

    // Quality checklist includes review
    expect(shipping).toContain("程式碼審閱已完成（行內自審或完整 `ce-code-review`）")
  })

  test("delegates commit and PR to dedicated skills", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work/SKILL.md")
    // Commit/PR delegation content extracted to references/shipping-workflow.md
    const shipping = await readRepoFile("plugins/compound-engineering/skills/ce-work/references/shipping-workflow.md")

    expect(shipping).toContain("`ce-commit-push-pr` 技能")
    expect(shipping).toContain("`ce-commit` 技能")

    // Should not contain inline PR templates or attribution placeholders
    expect(content).not.toContain("gh pr create")
    expect(content).not.toContain("[HARNESS_URL]")
  })

  test("ce-work-beta mirrors review and commit delegation", async () => {
    const beta = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")
    // Review/commit content extracted to references/shipping-workflow.md
    const shipping = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/references/shipping-workflow.md")

    // Extracted content in reference file
    expect(shipping).toContain("2. **程式碼審閱**")
    expect(shipping).toContain("`ce-commit-push-pr` 技能")
    expect(shipping).toContain("`ce-commit` 技能")

    // Negative assertions stay on SKILL.md
    expect(beta).not.toContain("Consider Code Review")
    expect(beta).not.toContain("gh pr create")
  })

  test("includes per-task testing deliberation in execution loop", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work/SKILL.md")

    // Testing deliberation exists in the execution loop
    expect(content).toContain("評估測試覆蓋")

    // Deliberation is between "Run tests after changes" and "Mark task as completed"
    const runTestsIdx = content.indexOf("變更後執行測試")
    const assessIdx = content.indexOf("評估測試覆蓋")
    const markDoneIdx = content.indexOf("標記任務為已完成")
    expect(runTestsIdx).toBeLessThan(assessIdx)
    expect(assessIdx).toBeLessThan(markDoneIdx)
  })

  test("quality checklist says 'Testing addressed' not 'Tests pass'", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work/SKILL.md")
    // Quality checklist extracted to references/shipping-workflow.md
    const shipping = await readRepoFile("plugins/compound-engineering/skills/ce-work/references/shipping-workflow.md")

    // New language present in reference file
    expect(shipping).toContain("測試已處理")

    // Old language fully removed from both
    expect(content).not.toContain("Tests pass (run project's test command)")
    expect(content).not.toContain("- All tests pass")
    expect(shipping).not.toContain("Tests pass (run project's test command)")
  })

  test("ce-work-beta mirrors testing deliberation and checklist changes", async () => {
    const beta = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")
    // Checklist extracted to references/shipping-workflow.md
    const shipping = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/references/shipping-workflow.md")

    // Testing deliberation stays in SKILL.md (Phase 2 content)
    expect(beta).toContain("評估測試覆蓋")

    // New checklist language in reference file
    expect(shipping).toContain("測試已處理")

    // Old language removed from both
    expect(beta).not.toContain("Tests pass (run project's test command)")
    expect(beta).not.toContain("- All tests pass")
    expect(shipping).not.toContain("Tests pass (run project's test command)")
  })

  test("SKILL.md stub points to shipping-workflow reference", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work/SKILL.md")

    // Stub references the shipping-workflow file
    expect(content).toContain("`references/shipping-workflow.md`")

    // Extracted content is not in SKILL.md
    expect(content).not.toContain("2. **Code Review**")
    expect(content).not.toContain("## Quality Checklist")
    expect(content).not.toContain("## Code Review Tiers")
  })

  test("ce:work-beta SKILL.md stub points to shipping-workflow reference", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    // Stub references the shipping-workflow file
    expect(content).toContain("`references/shipping-workflow.md`")

    // Extracted content is not in SKILL.md
    expect(content).not.toContain("2. **Code Review**")
    expect(content).not.toContain("## Quality Checklist")
    expect(content).not.toContain("## Code Review Tiers")
  })

  test("ce:work remains the stable non-delegating surface", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work/SKILL.md")

    expect(content).not.toContain("## Argument Parsing")
    expect(content).not.toContain("## Codex Delegation Mode")
    expect(content).not.toContain("delegate:codex")
  })
})

describe("ce:work-beta codex delegation contract", () => {
  test("has argument parsing with delegate tokens", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    // Argument parsing section exists with delegation tokens
    expect(content).toContain("## Argument Parsing")
    expect(content).toContain("`delegate:codex`")
    expect(content).toContain("`delegate:local`")

    // Resolution chain present
    expect(content).toContain("### Settings Resolution Chain")
    expect(content).toContain("work_delegate")
    expect(content).toContain("config.local.yaml")
  })

  test("argument-hint includes delegate:codex for discoverability", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    expect(content).toContain("argument-hint:")
    expect(content).toContain("delegate:codex")
  })

  test("remains manual-invocation beta during rollout", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    expect(content).toContain("disable-model-invocation: true")
    expect(content).toContain("Invoke `ce-work-beta` manually")
    expect(content).toContain("planning and workflow handoffs remain pointed at stable `ce-work`")
  })

  test("SKILL.md has delegation routing stub pointing to reference", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    expect(content).toContain("## Codex Delegation Mode")
    expect(content).toContain("references/codex-delegation-workflow.md")
    // Delegation details are NOT in SKILL.md body — they're in the reference
    expect(content).not.toContain("### Pre-Delegation Checks")
    expect(content).not.toContain("### Prompt Template")
    expect(content).not.toContain("### Execution Loop")
  })

  test("delegation routing gate in Phase 1 Step 4", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    const gateIdx = content.indexOf("Delegation routing gate")
    const strategyTableIdx = content.indexOf("| **Inline**")
    expect(gateIdx).toBeGreaterThan(0)
    expect(gateIdx).toBeLessThan(strategyTableIdx)
    expect(content).toContain("Codex delegation requires a plan file")
  })

  test("delegation branches in Phase 2 task loop", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    expect(content).toContain("If delegation_active: branch to the Codex Delegation Execution Loop")
  })

  test("delegation reference has all required sections", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/references/codex-delegation-workflow.md")

    // Pre-delegation checks
    expect(content).toContain("## 預委託檢查")
    expect(content).toContain("平台閘門")
    expect(content).toContain("CODEX_SANDBOX")
    expect(content).toContain("command -v codex")
    expect(content).toContain("同意流程")

    // Batching
    expect(content).toContain("## 批次處理")

    // Prompt template
    expect(content).toContain("## 提示模板")
    expect(content).toContain("<task>")
    expect(content).toContain("<constraints>")
    expect(content).toContain("<output_contract>")
    expect(content).toContain("the orchestrator will not re-run verification independently")

    // Result schema and execution loop
    expect(content).toContain("## 結果 Schema")
    expect(content).toContain("## 執行循環")
    expect(content).toContain("codex exec")

    // Circuit breaker
    expect(content).toContain("consecutive_failures")
    expect(content).toContain("3 consecutive failures")

    // Rollback safety
    expect(content).toContain("git diff --quiet HEAD")
    expect(content).toContain("git checkout -- .")
    expect(content).toContain("勿使用無路徑引數之裸 `git clean -fd`")

    // Mixed-model attribution
    expect(content).toContain("## 混合模型歸因")
  })

  test("delegation reference has decision prompts for ask mode", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/references/codex-delegation-workflow.md")

    expect(content).toContain("## 委託決策")
    expect(content).toContain("work_delegate_decision")
    expect(content).toContain("Execute with Claude Code instead")
    expect(content).toContain("Delegate to Codex anyway")
    expect(content).toContain("the cost of delegating outweighs having Claude Code do them")
  })

  test("settings resolution includes delegation decision setting", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    expect(content).toContain("work_delegate_decision")
    expect(content).toContain("`auto`")
    expect(content).toContain("`ask`")
  })

  test("has frontend design guidance ported from beta", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-work-beta/SKILL.md")

    expect(content).toContain("**Frontend Design Guidance**")
    expect(content).toContain("`ce-frontend-design` skill")
  })
})

describe("ce:plan remains neutral during ce:work-beta rollout", () => {
  test("removes delegation-specific execution posture guidance", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-plan/SKILL.md")

    // Old tag removed from execution posture signals
    expect(content).not.toContain("add `Execution target: external-delegate`")

    // Old tag removed from execution note examples
    expect(content).not.toContain("Execution note: Execution target: external-delegate")

    // Planner stays neutral instead of teaching beta-only invocation
    expect(content).not.toContain("delegate:codex")
  })
})

describe("ce-brainstorm review contract", () => {
  test("requires document review before handoff", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-brainstorm/SKILL.md")

    // Phase 3.5 exists and runs document-review
    expect(content).toContain("### 階段 3.5：文檔審查")
    expect(content).toContain("`ce-doc-review` 技能")

    // Phase 3 and Phase 4 are extracted to references for token optimization
    expect(content).toContain("`references/requirements-capture.md`")
    expect(content).toContain("`references/handoff.md`")

    // Additional review passes are surfaced contextually (not as a menu fixture) and still
    // route through the ce-doc-review skill when requested
    const handoff = await readRepoFile("plugins/compound-engineering/skills/ce-brainstorm/references/handoff.md")
    expect(handoff).toContain("載入 `ce-doc-review` 技能")
    expect(handoff).not.toContain("**Review and refine**")
  })
})

describe("ce-plan testing contract", () => {
  test("flags blank test scenarios on feature-bearing units as incomplete", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-plan/SKILL.md")

    // Phase 5.1 review checklist addresses blank test scenarios
    expect(content).toContain("空白或缺失測試場景")
    expect(content).toContain("Test expectation: none")

    // Template comment mentions the annotation convention
    expect(content).toContain("Test expectation: none -- [reason]")
  })
})

describe("ce-plan review contract", () => {
  test("requires document review after confidence check", async () => {
    // Document review instructions extracted to references/plan-handoff.md
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md")

    // Phase 5.3.8 runs document-review before final checks (5.3.9)
    expect(content).toContain("## 5.3.8 文檔審閱")
    expect(content).toContain("`ce-doc-review` 技能")

    // Document review must come before final checks so auto-applied edits are validated
    const docReviewIdx = content.indexOf("5.3.8 文檔審閱")
    const finalChecksIdx = content.indexOf("5.3.9 最終檢查")
    expect(docReviewIdx).toBeLessThan(finalChecksIdx)
  })

  test("SKILL.md stub points to plan-handoff reference", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-plan/SKILL.md")

    // Stub references the handoff file and marks document review as mandatory
    expect(content).toContain("`references/plan-handoff.md`")
    expect(content).toContain("Document review is mandatory")
  })

  test("uses headless mode in pipeline context", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md")

    // Pipeline mode runs document-review headlessly, not skipping it
    expect(content).toContain("mode:headless")
    expect(content).not.toContain("skip document-review and return control")
  })

  test("handoff options recommend ce-work after review", async () => {
    const content = await readRepoFile("plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md")

    // ce-work is recommended (review already happened)
    expect(content).toContain("**開始 `/ce-work`**（推薦）")

    // Additional review passes are surfaced contextually (not as a menu fixture) and still
    // route through the ce-doc-review skill when requested
    expect(content).toContain("載入 `ce-doc-review` 技能")

    // No conditional ordering based on plan depth (review already ran)
    expect(content).not.toContain("**Options when ce-doc-review is recommended:**")
    expect(content).not.toContain("**Options for Standard or Lightweight plans:**")
  })
})
