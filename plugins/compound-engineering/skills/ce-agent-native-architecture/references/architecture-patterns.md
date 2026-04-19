<overview>
構建agent-native系統之架構模式。源自五大核心原則：Parity、Granularity、Composability、Emergent Capability、Improvement Over Time。

功能乃代理於迴圈中達成之結果，非所撰寫之函式。工具為原子原語。代理施以判斷；提示定義結果。

另見：
- [files-universal-interface.md](./files-universal-interface.md) 檔案組織與context.md模式
- [agent-execution-patterns.md](./agent-execution-patterns.md) 完成信號與部分完成
- [product-implications.md](./product-implications.md) 漸進揭露與審批模式
</overview>

<pattern name="event-driven-agent">
## 事件驅動代理架構

代理以長駐進程運行，回應事件。事件即為提示。

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Loop                                │
├─────────────────────────────────────────────────────────────┤
│  Event Source → Agent (Claude) → Tool Calls → Response      │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌───────────┐
    │ Content │    │   Self   │    │   Data    │
    │  Tools  │    │  Tools   │    │   Tools   │
    └─────────┘    └──────────┘    └───────────┘
    (write_file)   (read_source)   (store_item)
                   (restart)       (list_items)
```

**關鍵特徵：**
- 事件（訊息、webhook、定時器）觸發代理回合
- 代理依系統提示決定如何回應
- 工具為IO原語，非業務邏輯
- 狀態透過資料工具在事件間持久化

**範例：Discord feedback bot**
```typescript
// Event source
client.on("messageCreate", (message) => {
  if (!message.author.bot) {
    runAgent({
      userMessage: `New message from ${message.author}: "${message.content}"`,
      channelId: message.channelId,
    });
  }
});

// System prompt defines behavior
const systemPrompt = `
When someone shares feedback:
1. Acknowledge their feedback warmly
2. Ask clarifying questions if needed
3. Store it using the feedback tools
4. Update the feedback site

Use your judgment about importance and categorization.
`;
```
</pattern>

<pattern name="two-layer-git">
## 雙層Git架構

自修改代理中，分離程式碼（共享）與資料（實例特定）。

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub (shared repo)                     │
│  - src/           (agent code)                              │
│  - site/          (web interface)                           │
│  - package.json   (dependencies)                            │
│  - .gitignore     (excludes data/, logs/)                   │
└─────────────────────────────────────────────────────────────┘
                          │
                     git clone
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Instance (Server)                           │
│                                                              │
│  FROM GITHUB (tracked):                                      │
│  - src/           → pushed back on code changes             │
│  - site/          → pushed, triggers deployment             │
│                                                              │
│  LOCAL ONLY (untracked):                                     │
│  - data/          → instance-specific storage               │
│  - logs/          → runtime logs                            │
│  - .env           → secrets                                 │
└─────────────────────────────────────────────────────────────┘
```

**何以有效：**
- 程式碼與網站受版本控制（GitHub）
- 原始資料留於本地（實例特定）
- 網站自資料生成，故可重現
- 透過git歷史自動回滾
</pattern>

<pattern name="multi-instance">
## 多實例分支

每個代理實例擁有獨立分支，共享核心程式碼。

```
main                        # Shared features, bug fixes
├── instance/feedback-bot   # Every Reader feedback bot
├── instance/support-bot    # Customer support bot
└── instance/research-bot   # Research assistant
```

**變更流向：**
| 變更類型 | 工作於 | 然後 |
|-------------|---------|------|
| Core features | main | Merge to instance branches |
| Bug fixes | main | Merge to instance branches |
| Instance config | instance branch | Done |
| Instance data | instance branch | Done |

**同步工具：**
```typescript
tool("self_deploy", "Pull latest from main, rebuild, restart", ...)
tool("sync_from_instance", "Merge from another instance", ...)
tool("propose_to_main", "Create PR to share improvements", ...)
```
</pattern>

<pattern name="site-as-output">
## 網站作為代理輸出

代理以自然輸出方式生成並維護網站，非透過專門網站工具。

```
Discord Message
      ↓
Agent processes it, extracts insights
      ↓
Agent decides what site updates are needed
      ↓
Agent writes files using write_file primitive
      ↓
Git commit + push triggers deployment
      ↓
Site updates automatically
```

**關鍵洞見：** 勿建網站生成工具。給代理檔案工具，於提示中教其建立良好網站。

```markdown
## Site Management

You maintain a public feedback site. When feedback comes in:
1. Use write_file to update site/public/content/feedback.json
2. If the site's React components need improvement, modify them
3. Commit changes and push to trigger Vercel deploy

The site should be:
- Clean, modern dashboard aesthetic
- Clear visual hierarchy
- Status organization (Inbox, Active, Done)

You decide the structure. Make it good.
```
</pattern>

<pattern name="approval-gates">
## 審批閘門模式

危險操作中分離"提案"與"執行"。

```typescript
// Pending changes stored separately
const pendingChanges = new Map<string, string>();

tool("write_file", async ({ path, content }) => {
  if (requiresApproval(path)) {
    // Store for approval
    pendingChanges.set(path, content);
    const diff = generateDiff(path, content);
    return {
      text: `Change requires approval.\n\n${diff}\n\nReply "yes" to apply.`
    };
  } else {
    // Apply immediately
    writeFileSync(path, content);
    return { text: `Wrote ${path}` };
  }
});

tool("apply_pending", async () => {
  for (const [path, content] of pendingChanges) {
    writeFileSync(path, content);
  }
  pendingChanges.clear();
  return { text: "Applied all pending changes" };
});
```

**需審批：**
- src/*.ts (agent code)
- package.json (dependencies)
- system prompt changes

**不需審批：**
- data/* (instance data)
- site/* (generated content)
- docs/* (documentation)
</pattern>

<pattern name="unified-agent-architecture">
## 統一代理架構

一個執行引擎，多種代理類型。所有代理使用相同編排器，配置不同。

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                         │
├─────────────────────────────────────────────────────────────┤
│  - Lifecycle management (start, pause, resume, stop)        │
│  - Checkpoint/restore (for background execution)            │
│  - Tool execution                                            │
│  - Chat integration                                          │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
    ┌─────┴─────┐        ┌─────┴─────┐        ┌─────┴─────┐
    │ Research  │        │   Chat    │        │  Profile  │
    │   Agent   │        │   Agent   │        │   Agent   │
    └───────────┘        └───────────┘        └───────────┘
    - web_search         - read_library       - read_photos
    - write_file         - publish_to_feed    - write_file
    - read_file          - web_search         - analyze_image
```

**實作：**

```swift
// All agents use the same orchestrator
let session = try await AgentOrchestrator.shared.startAgent(
    config: ResearchAgent.create(book: book),  // Config varies
    tools: ResearchAgent.tools,                 // Tools vary
    context: ResearchAgent.context(for: book)   // Context varies
)

// Agent types define their own configuration
struct ResearchAgent {
    static var tools: [AgentTool] {
        [
            FileTools.readFile(),
            FileTools.writeFile(),
            WebTools.webSearch(),
            WebTools.webFetch(),
        ]
    }

    static func context(for book: Book) -> String {
        """
        You are researching "\(book.title)" by \(book.author).
        Save findings to Documents/Research/\(book.id)/
        """
    }
}

struct ChatAgent {
    static var tools: [AgentTool] {
        [
            FileTools.readFile(),
            FileTools.writeFile(),
            BookTools.readLibrary(),
            BookTools.publishToFeed(),  // Chat can publish directly
            WebTools.webSearch(),
        ]
    }

    static func context(library: [Book]) -> String {
        """
        You help the user with their reading.
        Available books: \(library.map { $0.title }.joined(separator: ", "))
        """
    }
}
```

**益處：**
- 跨所有代理類型之一致生命週期管理
- 自動檢查點/恢復（對行動裝置至關重要）
- 共享工具協議
- 易於新增代理類型
- 集中錯誤處理與日誌
</pattern>

<pattern name="agent-to-ui-communication">
## 代理至UI通訊

代理採取行動時，UI應立即反映。使用者應可見代理所為。

**模式一：共享資料儲存（建議）**

代理透過UI所觀察之相同服務寫入：

```swift
// Shared service
class BookLibraryService: ObservableObject {
    static let shared = BookLibraryService()
    @Published var books: [Book] = []
    @Published var feedItems: [FeedItem] = []

    func addFeedItem(_ item: FeedItem) {
        feedItems.append(item)
        persist()
    }
}

// Agent tool writes through shared service
tool("publish_to_feed", async ({ bookId, content, headline }) => {
    let item = FeedItem(bookId: bookId, content: content, headline: headline)
    BookLibraryService.shared.addFeedItem(item)  // Same service UI uses
    return { text: "Published to feed" }
})

// UI observes the same service
struct FeedView: View {
    @StateObject var library = BookLibraryService.shared

    var body: some View {
        List(library.feedItems) { item in
            FeedItemRow(item: item)
            // Automatically updates when agent adds items
        }
    }
}
```

**模式二：檔案系統觀察**

基於檔案之資料，監看檔案系統：

```swift
class ResearchWatcher: ObservableObject {
    @Published var files: [URL] = []
    private var watcher: DirectoryWatcher?

    func watch(bookId: String) {
        let path = documentsURL.appendingPathComponent("Research/\(bookId)")

        watcher = DirectoryWatcher(path: path) { [weak self] in
            self?.reload(from: path)
        }

        reload(from: path)
    }
}

// Agent writes files
tool("write_file", { path, content }) -> {
    writeFile(documentsURL.appendingPathComponent(path), content)
    // DirectoryWatcher triggers UI update automatically
}
```

**模式三：事件匯流排（跨組件）**

多個獨立組件之複雜應用：

```typescript
// Shared event bus
const agentEvents = new EventEmitter();

// Agent tool emits events
tool("publish_to_feed", async ({ content }) => {
    const item = await feedService.add(content);
    agentEvents.emit('feed:new-item', item);
    return { text: "Published" };
});

// UI components subscribe
function FeedView() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const handler = (item) => setItems(prev => [...prev, item]);
        agentEvents.on('feed:new-item', handler);
        return () => agentEvents.off('feed:new-item', handler);
    }, []);

    return <FeedList items={items} />;
}
```

**應避免：**

```swift
// BAD: UI doesn't observe agent changes
// Agent writes to database directly
tool("publish_to_feed", { content }) {
    database.insert("feed", content)  // UI doesn't see this
}

// UI loads once at startup, never refreshes
struct FeedView: View {
    let items = database.query("feed")  // Stale!
}
```
</pattern>

<pattern name="model-tier-selection">
## 模型層級選擇

不同代理需不同智慧層級。使用能達成結果之最便宜模型。

| 代理類型 | 建議層級 | 理由 |
|------------|-----------------|-----------|
| Chat/Conversation | Balanced | Fast responses, good reasoning |
| Research | Balanced | Tool loops, not ultra-complex synthesis |
| Content Generation | Balanced | Creative but not synthesis-heavy |
| Complex Analysis | Powerful | Multi-document synthesis, nuanced judgment |
| Profile/Onboarding | Powerful | Photo analysis, complex pattern recognition |
| Simple Queries | Fast/Haiku | Quick lookups, simple transformations |

**實作：**

```swift
enum ModelTier {
    case fast      // claude-3-haiku: Quick, cheap, simple tasks
    case balanced  // claude-3-sonnet: Good balance for most tasks
    case powerful  // claude-3-opus: Complex reasoning, synthesis
}

struct AgentConfig {
    let modelTier: ModelTier
    let tools: [AgentTool]
    let systemPrompt: String
}

// Research agent: balanced tier
let researchConfig = AgentConfig(
    modelTier: .balanced,
    tools: researchTools,
    systemPrompt: researchPrompt
)

// Profile analysis: powerful tier (complex photo interpretation)
let profileConfig = AgentConfig(
    modelTier: .powerful,
    tools: profileTools,
    systemPrompt: profilePrompt
)

// Quick lookup: fast tier
let lookupConfig = AgentConfig(
    modelTier: .fast,
    tools: [readLibrary],
    systemPrompt: "Answer quick questions about the user's library."
)
```

**成本優化策略：**
- 以balanced層級起始，僅品質不足時升級
- 工具密集迴圈用fast層級，每輪簡單
- 保留powerful層級予合成任務（比較多來源）
- 考慮每輪token限制以控制成本
</pattern>

<design_questions>
## 設計時應問

1. **何事件觸發代理回合？**（訊息、webhook、定時器、使用者請求）
2. **代理需要何原語？**（read, write, call API, restart）
3. **代理應做何決策？**（格式、結構、優先級、行動）
4. **何決策應硬編碼？**（安全邊界、審批要求）
5. **代理如何驗證其工作？**（健康檢查、建置驗證）
6. **代理如何從錯誤中恢復？**（git rollback、審批閘門）
7. **UI如何得知代理更改狀態？**（共享儲存、檔案監看、事件）
8. **每種代理類型需何模型層級？**（fast, balanced, powerful）
9. **代理間如何共享基礎設施？**（統一編排器、共享工具）
</design_questions>
