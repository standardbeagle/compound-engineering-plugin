<overview>
如何將動態執行時上下文注入代理系統提示。代理需知應用中存在何物方能運作。靜態提示不足——代理需看到與使用者相同之上下文。

**核心原則：** 使用者之上下文即代理之上下文。
</overview>

<why_context_matters>
## 何以動態上下文注入

靜態系統提示告知代理能做什麼。動態上下文告知以使用者實際資料**此刻**能做什麼。

**失敗之例：**
```
User: "Write a little thing about Catherine the Great in my reading feed"
Agent: "What system are you referring to? I'm not sure what reading feed means."
```

代理失敗因其不知：
- 使用者圖書館中有何書
- "reading feed"為何
- 有何工具可發佈至此

**修復：** 注入關於應用狀態之執行時上下文至系統提示。
</why_context_matters>

<pattern name="context-injection">
## 上下文注入模式

動態建構系統提示，包含當前應用狀態：

```swift
func buildSystemPrompt() -> String {
    // Gather current state
    let availableBooks = libraryService.books
    let recentActivity = analysisService.recentRecords(limit: 10)
    let userProfile = profileService.currentProfile

    return """
    # Your Identity

    You are a reading assistant for \(userProfile.name)'s library.

    ## Available Books in User's Library

    \(availableBooks.map { "- \"\($0.title)\" by \($0.author) (id: \($0.id))" }.joined(separator: "\n"))

    ## Recent Reading Activity

    \(recentActivity.map { "- Analyzed \"\($0.bookTitle)\": \($0.excerptPreview)" }.joined(separator: "\n"))

    ## Your Capabilities

    - **publish_to_feed**: Create insights that appear in the Feed tab
    - **read_library**: View books, highlights, and analyses
    - **web_search**: Search the internet for research
    - **write_file**: Save research to Documents/Research/{bookId}/

    When the user mentions "the feed" or "reading feed", they mean the Feed tab
    where insights appear. Use `publish_to_feed` to create content there.
    """
}
```
</pattern>

<what_to_inject>
## 注入何種上下文

### 1. 可用資源
代理可存取之資料/檔案？

```swift
## Available in User's Library

Books:
- "Moby Dick" by Herman Melville (id: book_123)
- "1984" by George Orwell (id: book_456)

Research folders:
- Documents/Research/book_123/ (3 files)
- Documents/Research/book_456/ (1 file)
```

### 2. 當前狀態
使用者最近做了什麼？當前上下文為何？

```swift
## Recent Activity

- 2 hours ago: Highlighted passage in "1984" about surveillance
- Yesterday: Completed research on "Moby Dick" whale symbolism
- this week: Added 3 new books to library
```

### 3. 能力映射
工具對應何UI功能？用使用者語言。

```swift
## What You Can Do

| User Says | You Should Use | Result |
|-----------|----------------|--------|
| "my feed" / "reading feed" | `publish_to_feed` | Creates insight in Feed tab |
| "my library" / "my books" | `read_library` | Shows their book collection |
| "research this" | `web_search` + `write_file` | Saves to Research folder |
| "my profile" | `read_file("profile.md")` | Shows reading profile |
```

### 4. 領域詞彙
解釋使用者可能使用之應用特定術語。

```swift
## Vocabulary

- **Feed**: The Feed tab showing reading insights and analyses
- **Research folder**: Documents/Research/{bookId}/ where research is stored
- **Reading profile**: A markdown file describing user's reading preferences
- **Highlight**: A passage the user marked in a book
```
</what_to_inject>

<implementation_patterns>
## 實作模式

### 模式一：基於服務之注入（Swift/iOS）

```swift
class AgentContextBuilder {
    let libraryService: BookLibraryService
    let profileService: ReadingProfileService
    let activityService: ActivityService

    func buildContext() -> String {
        let books = libraryService.books
        let profile = profileService.currentProfile
        let activity = activityService.recent(limit: 10)

        return """
        ## Library (\(books.count) books)
        \(formatBooks(books))

        ## Profile
        \(profile.summary)

        ## Recent Activity
        \(formatActivity(activity))
        """
    }

    private func formatBooks(_ books: [Book]) -> String {
        books.map { "- \"\($0.title)\" (id: \($0.id))" }.joined(separator: "\n")
    }
}

// Usage in agent initialization
let context = AgentContextBuilder(
    libraryService: .shared,
    profileService: .shared,
    activityService: .shared
).buildContext()

let systemPrompt = basePrompt + "\n\n" + context
```

### 模式二：基於Hook之注入（TypeScript）

```typescript
interface ContextProvider {
  getContext(): Promise<string>;
}

class LibraryContextProvider implements ContextProvider {
  async getContext(): Promise<string> {
    const books = await db.books.list();
    const recent = await db.activity.recent(10);

    return `
## Library
${books.map(b => `- "${b.title}" (${b.id})`).join('\n')}

## Recent
${recent.map(r => `- ${r.description}`).join('\n')}
    `.trim();
  }
}

// Compose multiple providers
async function buildSystemPrompt(providers: ContextProvider[]): Promise<string> {
  const contexts = await Promise.all(providers.map(p => p.getContext()));
  return [BASE_PROMPT, ...contexts].join('\n\n');
}
```

### 模式三：基於模板之注入

```markdown
# System Prompt Template (system-prompt.template.md)

You are a reading assistant.

## Available Books

{{#each books}}
- "{{title}}" by {{author}} (id: {{id}})
{{/each}}

## Capabilities

{{#each capabilities}}
- **{{name}}**: {{description}}
{{/each}}

## Recent Activity

{{#each recentActivity}}
- {{timestamp}}: {{description}}
{{/each}}
```

```typescript
// Render at runtime
const prompt = Handlebars.compile(template)({
  books: await libraryService.getBooks(),
  capabilities: getCapabilities(),
  recentActivity: await activityService.getRecent(10),
});
```
</implementation_patterns>

<context_freshness>
## 上下文新鮮度

上下文應於代理初始化時注入，長會話中可選重新整理。

**初始化時：**
```swift
// Always inject fresh context when starting an agent
func startChatAgent() async -> AgentSession {
    let context = await buildCurrentContext()  // Fresh context
    return await AgentOrchestrator.shared.startAgent(
        config: ChatAgent.config,
        systemPrompt: basePrompt + context
    )
}
```

**長會話中（可選）：**
```swift
// For long-running agents, provide a refresh tool
tool("refresh_context", "Get current app state") { _ in
    let books = libraryService.books
    let recent = activityService.recent(10)
    return """
    Current library: \(books.count) books
    Recent: \(recent.map { $0.summary }.joined(separator: ", "))
    """
}
```

**不應做：**
```swift
// DON'T: Use stale context from app launch
let cachedContext = appLaunchContext  // Stale!
// Books may have been added, activity may have changed
```
</context_freshness>

<examples>
## 實例：Every Reader

Every Reader應用為其chat代理注入上下文：

```swift
func getChatAgentSystemPrompt() -> String {
    // Get current library state
    let books = BookLibraryService.shared.books
    let analyses = BookLibraryService.shared.analysisRecords.prefix(10)
    let profile = ReadingProfileService.shared.getProfileForSystemPrompt()

    let bookList = books.map { book in
        "- \"\(book.title)\" by \(book.author) (id: \(book.id))"
    }.joined(separator: "\n")

    let recentList = analyses.map { record in
        let title = books.first { $0.id == record.bookId }?.title ?? "Unknown"
        return "- From \"\(title)\": \"\(record.excerptPreview)\""
    }.joined(separator: "\n")

    return """
    # Reading Assistant

    You help the user with their reading and book research.

    ## Available Books in User's Library

    \(bookList.isEmpty ? "No books yet." : bookList)

    ## Recent Reading Journal (Latest Analyses)

    \(recentList.isEmpty ? "No analyses yet." : recentList)

    ## Reading Profile

    \(profile)

    ## Your Capabilities

    - **Publish to Feed**: Create insights using `publish_to_feed` that appear in the Feed tab
    - **Library Access**: View books and highlights using `read_library`
    - **Research**: Search web and save to Documents/Research/{bookId}/
    - **Profile**: Read/update the user's reading profile

    When the user asks you to "write something for their feed" or "add to my reading feed",
    use the `publish_to_feed` tool with the relevant book_id.
    """
}
```

**結果：** 當使用者說"write a little thing about Catherine the Great in my reading feed"，代理：
1. 見"reading feed" → 知使用`publish_to_feed`
2. 見可用書籍 → 找到相關book ID
3. 為Feed tab建立適當內容
</examples>

<checklist>
## 上下文注入清單

啟動代理前：
- [ ] 系統提示含當前資源（books、files、data）
- [ ] 最近活動對代理可見
- [ ] 能力映射至使用者詞彙
- [ ] 領域特定術語已解釋
- [ ] 上下文新鮮（代理啟動時收集，非快取）

新增功能時：
- [ ] 新資源含於上下文注入
- [ ] 新能力載入系統提示
- [ ] 功能之使用者詞彙已映射
</checklist>
