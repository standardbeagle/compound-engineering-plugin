<overview>
構建穩健代理迴圈之執行模式。涵蓋完成信號、部分完成之恢復追蹤、模型層級選擇、及上下文限制處理。
</overview>

<completion_signals>
## 完成信號

代理需明確表達"吾事已畢"。

### 反模式：啟發式偵測

以啟發式偵測完成，脆弱易碎：

- 連續無工具呼叫之迭代
- 檢查預期輸出檔案
- 追蹤"無進展"狀態
- 基於時間之超時

此等於邊界情況失效，行為不可預測。

### 模式：明確完成工具

提供`complete_task`工具：
- 接受所完成事項之摘要
- 回傳停止迴圈之信號
- 跨所有代理類型一致運作

```typescript
tool("complete_task", {
  summary: z.string().describe("Summary of what was accomplished"),
  status: z.enum(["success", "partial", "blocked"]).optional(),
}, async ({ summary, status = "success" }) => {
  return {
    text: summary,
    shouldContinue: false,  // Key: signals loop should stop
  };
});
```

### ToolResult 模式

結構化工具結果以分離成功與繼續：

```swift
struct ToolResult {
    let success: Bool           // Did tool succeed?
    let output: String          // What happened?
    let shouldContinue: Bool    // Should agent loop continue?
}

// Three common cases:
extension ToolResult {
    static func success(_ output: String) -> ToolResult {
        // Tool succeeded, keep going
        ToolResult(success: true, output: output, shouldContinue: true)
    }

    static func error(_ message: String) -> ToolResult {
        // Tool failed but recoverable, agent can try something else
        ToolResult(success: false, output: message, shouldContinue: true)
    }

    static func complete(_ summary: String) -> ToolResult {
        // Task done, stop the loop
        ToolResult(success: true, output: summary, shouldContinue: false)
    }
}
```

### 關鍵洞見

**此不同於成功/失敗：**

- 工具可**成功**且發出**停止**信號（任務完成）
- 工具可**失敗**且發出**繼續**信號（可恢復錯誤，嘗試他法）

```typescript
// Examples:
read_file("/missing.txt")
// → { success: false, output: "File not found", shouldContinue: true }
// Agent can try a different file or ask for clarification

complete_task("Organized all downloads into folders")
// → { success: true, output: "...", shouldContinue: false }
// Agent is done

write_file("/output.md", content)
// → { success: true, output: "Wrote file", shouldContinue: true }
// Agent keeps working toward the goal
```

### 系統提示指引

告知代理何時完成：

```markdown
## Completing Tasks

When you've accomplished the user's request:
1. Verify your work (read back files you created, check results)
2. Call `complete_task` with a summary of what you did
3. Don't keep working after the goal is achieved

If you're blocked and can't proceed:
- Call `complete_task` with status "blocked" and explain why
- Don't loop forever trying the same thing
```
</completion_signals>

<partial_completion>
## 部分完成

多步驟任務中，於任務層級追蹤進度以支援恢復。

### 任務狀態追蹤

```swift
enum TaskStatus {
    case pending      // Not yet started
    case inProgress   // Currently working on
    case completed    // Finished successfully
    case failed       // Couldn't complete (with reason)
    case skipped      // Intentionally not done
}

struct AgentTask {
    let id: String
    let description: String
    var status: TaskStatus
    var notes: String?  // Why it failed, what was done
}

struct AgentSession {
    var tasks: [AgentTask]

    var isComplete: Bool {
        tasks.allSatisfy { $0.status == .completed || $0.status == .skipped }
    }

    var progress: (completed: Int, total: Int) {
        let done = tasks.filter { $0.status == .completed }.count
        return (done, tasks.count)
    }
}
```

### UI進度顯示

向使用者展示進展：

```
Progress: 3/5 tasks complete (60%)
✅ [1] Find source materials
✅ [2] Download full text
✅ [3] Extract key passages
❌ [4] Generate summary - Error: context limit exceeded
⏳ [5] Create outline - Pending
```

### 部分完成情境

**代理達最大迭代數未完成：**
- 部分任務已完成，部分待處理
- 檢查點以當前狀態儲存
- 恢復從中斷處繼續，非從頭開始

**代理於一個任務失敗：**
- 任務標記為`.failed`，錯誤記於notes
- 其他任務可繼續（代理決定）
- 編排器不自動中止整個會話

**任務中途網路錯誤：**
- 當前迭代拋出異常
- 會話標記為`.failed`
- 檢查點保留至該點之訊息
- 可從檢查點恢復

### 檢查點結構

```swift
struct AgentCheckpoint: Codable {
    let sessionId: String
    let agentType: String
    let messages: [Message]          // Full conversation history
    let iterationCount: Int
    let tasks: [AgentTask]           // Task state
    let customState: [String: Any]   // Agent-specific state
    let timestamp: Date

    var isValid: Bool {
        // Checkpoints expire (default 1 hour)
        Date().timeIntervalSince(timestamp) < 3600
    }
}
```

### 恢復流程

1. 應用啟動時，掃描有效檢查點
2. 向使用者顯示：「有未完成之會話。恢復？」
3. 恢復時：
   - 還原訊息至對話
   - 還原任務狀態
   - 從中斷處繼續代理迴圈
4. 取消時：
   - 刪除檢查點
   - 使用者再次嘗試時從頭開始
</partial_completion>

<model_tier_selection>
## 模型層級選擇

不同代理需不同智慧層級。使用能達成結果之最便宜模型。

### 層級指引

| 代理類型 | 建議層級 | 理由 |
|------------|-----------------|-----------|
| Chat/Conversation | Balanced (Sonnet) | Fast responses, good reasoning |
| Research | Balanced (Sonnet) | Tool loops, not ultra-complex synthesis |
| Content Generation | Balanced (Sonnet) | Creative but not synthesis-heavy |
| Complex Analysis | Powerful (Opus) | Multi-document synthesis, nuanced judgment |
| Profile Generation | Powerful (Opus) | Photo analysis, complex pattern recognition |
| Quick Queries | Fast (Haiku) | Simple lookups, quick transformations |
| Simple Classification | Fast (Haiku) | High volume, simple decisions |

### 實作

```swift
enum ModelTier {
    case fast      // claude-3-haiku: Quick, cheap, simple tasks
    case balanced  // claude-sonnet: Good balance for most tasks
    case powerful  // claude-opus: Complex reasoning, synthesis

    var modelId: String {
        switch self {
        case .fast: return "claude-3-haiku-20240307"
        case .balanced: return "claude-sonnet-4-20250514"
        case .powerful: return "claude-opus-4-20250514"
        }
    }
}

struct AgentConfig {
    let name: String
    let modelTier: ModelTier
    let tools: [AgentTool]
    let systemPrompt: String
    let maxIterations: Int
}

// Examples
let researchConfig = AgentConfig(
    name: "research",
    modelTier: .balanced,
    tools: researchTools,
    systemPrompt: researchPrompt,
    maxIterations: 20
)

let quickLookupConfig = AgentConfig(
    name: "lookup",
    modelTier: .fast,
    tools: [readLibrary],
    systemPrompt: "Answer quick questions about the user's library.",
    maxIterations: 3
)
```

### 成本優化策略

1. **以balanced起始，品質不足時升級**
2. **工具密集迴圈用fast層級**，每輪簡單
3. **保留powerful層級予合成任務**（比較多來源）
4. **考慮每輪token限制**以控制成本
5. **快取昂貴操作**避免重複呼叫
</model_tier_selection>

<context_limits>
## 上下文限制

代理會話可無限期延伸，然上下文視窗不可。從頭設計有限上下文。

### 問題所在

```
Turn 1: User asks question → 500 tokens
Turn 2: Agent reads file → 10,000 tokens
Turn 3: Agent reads another file → 10,000 tokens
Turn 4: Agent researches → 20,000 tokens
...
Turn 10: Context window exceeded
```

### 設計原則

**1. 工具應支援迭代精煉**

非全有全無，設計為summary → detail → full：

```typescript
// Good: Supports iterative refinement
tool("read_file", {
  path: z.string(),
  preview: z.boolean().default(true),  // Return first 1000 chars by default
  full: z.boolean().default(false),    // Opt-in to full content
}, ...);

tool("search_files", {
  query: z.string(),
  summaryOnly: z.boolean().default(true),  // Return matches, not full files
}, ...);
```

**2. 提供整合工具**

給代理於會話中途整合所學之方式：

```typescript
tool("summarize_and_continue", {
  keyPoints: z.array(z.string()),
  nextSteps: z.array(z.string()),
}, async ({ keyPoints, nextSteps }) => {
  // Store summary, potentially truncate earlier messages
  await saveSessionSummary({ keyPoints, nextSteps });
  return { text: "Summary saved. Continuing with focus on: " + nextSteps.join(", ") };
});
```

**3. 設計截斷**

假設編排器可能截斷早期訊息。重要上下文應：
- 在系統提示中（始終存在）
- 在檔案中（可重新讀取）
- 摘要於context.md

### 實作策略

```swift
class AgentOrchestrator {
    let maxContextTokens = 100_000
    let targetContextTokens = 80_000  // Leave headroom

    func shouldTruncate() -> Bool {
        estimateTokens(messages) > targetContextTokens
    }

    func truncateIfNeeded() {
        if shouldTruncate() {
            // Keep system prompt + recent messages
            // Summarize or drop older messages
            messages = [systemMessage] + summarizeOldMessages() + recentMessages
        }
    }
}
```

### 系統提示指引

```markdown
## Managing Context

For long tasks, periodically consolidate what you've learned:
1. If you've gathered a lot of information, summarize key points
2. Save important findings to files (they persist beyond context)
3. Use `summarize_and_continue` if the conversation is getting long

Don't try to hold everything in memory. Write it down.
```
</context_limits>

<orchestrator_pattern>
## 統一代理編排器

一個執行引擎，多種代理類型。所有代理使用相同編排器，配置不同。

```swift
class AgentOrchestrator {
    static let shared = AgentOrchestrator()

    func run(config: AgentConfig, userMessage: String) async -> AgentResult {
        var messages: [Message] = [
            .system(config.systemPrompt),
            .user(userMessage)
        ]

        var iteration = 0

        while iteration < config.maxIterations {
            // Get agent response
            let response = await claude.message(
                model: config.modelTier.modelId,
                messages: messages,
                tools: config.tools
            )

            messages.append(.assistant(response))

            // Process tool calls
            for toolCall in response.toolCalls {
                let result = await executeToolCall(toolCall, config: config)
                messages.append(.toolResult(result))

                // Check for completion signal
                if !result.shouldContinue {
                    return AgentResult(
                        status: .completed,
                        output: result.output,
                        iterations: iteration + 1
                    )
                }
            }

            // No tool calls = agent is responding, might be done
            if response.toolCalls.isEmpty {
                // Could be done, or waiting for user
                break
            }

            iteration += 1
        }

        return AgentResult(
            status: iteration >= config.maxIterations ? .maxIterations : .responded,
            output: messages.last?.content ?? "",
            iterations: iteration
        )
    }
}
```

### 益處

- 跨所有代理類型之一致生命週期管理
- 自動檢查點/恢復（對行動裝置至關重要）
- 共享工具協議
- 易於新增代理類型
- 集中錯誤處理與日誌
</orchestrator_pattern>

<checklist>
## 代理執行清單

### 完成信號
- [ ] 提供`complete_task`工具（明確完成）
- [ ] 無啟發式完成偵測
- [ ] 工具結果含`shouldContinue`標誌
- [ ] 系統提示指引何時完成

### 部分完成
- [ ] 任務以狀態追蹤（pending, in_progress, completed, failed）
- [ ] 檢查點儲存以供恢復
- [ ] 進度對使用者可見
- [ ] 恢復從中斷處繼續

### 模型層級
- [ ] 層級依任務複雜度選擇
- [ ] 考慮成本優化
- [ ] 簡單操作用fast層級
- [ ] 保留powerful層級予合成

### 上下文限制
- [ ] 工具支援迭代精煉（preview vs full）
- [ ] 整合機制可用
- [ ] 重要上下文持久化至檔案
- [ ] 截斷策略已定義
</checklist>
