<overview>
確保代理能行使用者所能行。每個UI動作皆有對應代理工具。非一次性檢查，乃持續紀律，融入開發流程。

**核心原則：** 新增UI功能時，同PR新增對應工具。
</overview>

<why_parity>
## 何以行動對等

**失敗之例：**
```
User: "Write something about Catherine the Great in my reading feed"
Agent: "What system are you referring to? I'm not sure what reading feed means."
```

使用者可透過UI發佈至feed，然代理無`publish_to_feed`工具。修復甚易——新增工具。然洞見深遠：

**使用者能透過UI執行的每個動作，必須有代理可呼叫的對應工具。**

無此對等：
- 使用者要求代理做其不能做之事
- 代理追問本應理解之功能
- 代理相較直接操作應用顯得受限
- 使用者失去對代理能力之信任
</why_parity>

<capability_mapping>
## 能力映射表

維護UI動作至代理工具之結構映射：

| UI動作 | UI位置 | 代理工具 | 系統提示引用 |
|-----------|-------------|------------|-------------------------|
| View library | Library tab | `read_library` | "View books and highlights" |
| Add book | Library → Add | `add_book` | "Add books to library" |
| Publish insight | Analysis view | `publish_to_feed` | "Create insights for Feed tab" |
| Start research | Book detail | `start_research` | "Research books via web search" |
| Edit profile | Settings | `write_file(profile.md)` | "Update reading profile" |
| Take screenshot | Camera | N/A (user action) | — |
| Search web | Chat | `web_search` | "Search the internet" |

**新增功能時更新此表。**

### 應用模板

```markdown
# Capability Map - [Your App Name]

| UI Action | UI Location | Agent Tool | System Prompt | Status |
|-----------|-------------|------------|---------------|--------|
| | | | | ⚠️ Missing |
| | | | | ✅ Done |
| | | | | 🚫 N/A |
```

狀態含義：
- ✅ Done: 工具存在且已載入系統提示
- ⚠️ Missing: UI動作存在但無代理對應
- 🚫 N/A: 僅使用者動作（如生物辨識、相機拍攝）
</capability_mapping>

<parity_workflow>
## 行動對等工作流

### 新增功能時

合併任何新增UI功能之PR前：

```
1. 此為何動作？
   → "User can publish an insight to their reading feed"

2. 代理工具是否存在？
   → 檢查工具定義
   → 若無：建立工具

3. 是否載入系統提示？
   → 檢查系統提示能力章節
   → 若無：新增文檔

4. 上下文是否可用？
   → 代理是否知"feed"何意？
   → 代理是否可見可用書籍？
   → 若無：新增至上下文注入

5. 更新能力映射表
   → 新增列至追蹤文檔
```

### PR清單

加入PR模板：

```markdown
## Agent-Native Checklist

- [ ] Every new UI action has a corresponding agent tool
- [ ] System prompt updated to mention new capability
- [ ] Agent has access to same data UI uses
- [ ] Capability map updated
- [ ] Tested with natural language request
```
</parity_workflow>

<parity_audit>
## 對等審計

定期審計應用之行動對等缺口：

### 步驟一：列出所有UI動作

遍歷每個畫面，列出使用者可執行之動作：

```
Library Screen:
- View list of books
- Search books
- Filter by category
- Add new book
- Delete book
- Open book detail

Book Detail Screen:
- View book info
- Start research
- View highlights
- Add highlight
- Share book
- Remove from library

Feed Screen:
- View insights
- Create new insight
- Edit insight
- Delete insight
- Share insight

Settings:
- Edit profile
- Change theme
- Export data
- Delete account
```

### 步驟二：檢查工具覆蓋

對每個動作驗證：

```
✅ View list of books      → read_library
✅ Search books            → read_library (with query param)
⚠️ Filter by category     → MISSING (add filter param to read_library)
⚠️ Add new book           → MISSING (need add_book tool)
✅ Delete book             → delete_book
✅ Open book detail        → read_library (single book)

✅ Start research          → start_research
✅ View highlights         → read_library (includes highlights)
⚠️ Add highlight          → MISSING (need add_highlight tool)
⚠️ Share book             → MISSING (or N/A if sharing is UI-only)

✅ View insights           → read_library (includes feed)
✅ Create new insight      → publish_to_feed
⚠️ Edit insight           → MISSING (need update_feed_item tool)
⚠️ Delete insight         → MISSING (need delete_feed_item tool)
```

### 步驟三：優先排序缺口

缺口不等價：

**高優先（使用者會要求）：**
- Add new book
- Create/edit/delete content
- Core workflow actions

**中優先（偶爾要求）：**
- Filter/search variations
- Export functionality
- Sharing features

**低優先（罕見透過代理要求）：**
- Theme changes
- Account deletion
- Settings that are UI-preference
</parity_audit>

<tool_design_for_parity>
## 為對等設計工具

### 工具粒度匹配UI粒度

若UI有獨立"Edit"與"Delete"按鈕，考慮獨立工具：

```typescript
// Matches UI granularity
tool("update_feed_item", { id, content, headline }, ...);
tool("delete_feed_item", { id }, ...);

// vs. combined (harder for agent to discover)
tool("modify_feed_item", { id, action: "update" | "delete", ... }, ...);
```

### 使用者詞彙命名工具

```typescript
// Good: Matches what users say
tool("publish_to_feed", ...);  // "publish to my feed"
tool("add_book", ...);         // "add this book"
tool("start_research", ...);   // "research this"

// Bad: Technical jargon
tool("create_analysis_record", ...);
tool("insert_library_item", ...);
tool("initiate_web_scrape_workflow", ...);
```

### 回傳UI所顯示

若UI顯示帶詳情之確認，工具亦應如此：

```typescript
// UI shows: "Added 'Moby Dick' to your library"
// Tool should return the same:
tool("add_book", async ({ title, author }) => {
  const book = await library.add({ title, author });
  return {
    text: `Added "${book.title}" by ${book.author} to your library (id: ${book.id})`
  };
});
```
</tool_design_for_parity>

<context_parity>
## 上下文對等

使用者所見，代理皆應能存取。

### 問題所在

```swift
// UI shows recent analyses in a list
ForEach(analysisRecords) { record in
    AnalysisRow(record: record)
}

// But system prompt only mentions books, not analyses
let systemPrompt = """
## Available Books
\(books.map { $0.title })
// Missing: recent analyses!
"""
```

使用者可見其閱讀日誌，代理不可見。此即脫節。

### 修復

```swift
// System prompt includes what UI shows
let systemPrompt = """
## Available Books
\(books.map { "- \($0.title)" }.joined(separator: "\n"))

## Recent Reading Journal
\(analysisRecords.prefix(10).map { "- \($0.summary)" }.joined(separator: "\n"))
"""
```

### 上下文對等清單

對應用中每個畫面：
- [ ] 此畫面顯示何資料？
- [ ] 代理是否可存取此資料？
- [ ] 代理是否可達相同細節層級？
</context_parity>

<continuous_parity>
## 持續維護對等

### Git Hooks / CI 檢查

```bash
#!/bin/bash
# pre-commit hook: check for new UI actions without tools

# Find new SwiftUI Button/onTapGesture additions
NEW_ACTIONS=$(git diff --cached --name-only | xargs grep -l "Button\|onTapGesture")

if [ -n "$NEW_ACTIONS" ]; then
    echo "⚠️  New UI actions detected. Did you add corresponding agent tools?"
    echo "Files: $NEW_ACTIONS"
    echo ""
    echo "Checklist:"
    echo "  [ ] Agent tool exists for new action"
    echo "  [ ] System prompt documents new capability"
    echo "  [ ] Capability map updated"
fi
```

### 自動化對等測試

```typescript
// parity.test.ts
describe('Action Parity', () => {
  const capabilityMap = loadCapabilityMap();

  for (const [action, toolName] of Object.entries(capabilityMap)) {
    if (toolName === 'N/A') continue;

    test(`${action} has agent tool: ${toolName}`, () => {
      expect(agentTools.map(t => t.name)).toContain(toolName);
    });

    test(`${toolName} is documented in system prompt`, () => {
      expect(systemPrompt).toContain(toolName);
    });
  }
});
```

### 定期審計

排程定期審查：

```markdown
## Monthly Parity Audit

1. Review all PRs merged this month
2. Check each for new UI actions
3. Verify tool coverage
4. Update capability map
5. Test with natural language requests
```
</continuous_parity>

<examples>
## 實例：Feed缺口

**之前：** 每個Reader皆有feed顯示insights，然無代理工具可發佈至此。

```
User: "Write something about Catherine the Great in my reading feed"
Agent: "I'm not sure what system you're referring to. Could you clarify?"
```

**診斷：**
- ✅ UI動作：使用者可從analysis view發佈insights
- ❌ 代理工具：無`publish_to_feed`工具
- ❌ 系統提示：未提及"feed"或如何發佈
- ❌ 上下文：代理不知"feed"何意

**修復：**

```swift
// 1. Add the tool
tool("publish_to_feed",
    "Publish an insight to the user's reading feed",
    {
        bookId: z.string().describe("Book ID"),
        content: z.string().describe("The insight content"),
        headline: z.string().describe("A punchy headline")
    },
    async ({ bookId, content, headline }) => {
        await feedService.publish({ bookId, content, headline });
        return { text: `Published "${headline}" to your reading feed` };
    }
);

// 2. Update system prompt
"""
## Your Capabilities

- **Publish to Feed**: Create insights that appear in the Feed tab using `publish_to_feed`.
  Include a book_id, content, and a punchy headline.
"""

// 3. Add to context injection
"""
When the user mentions "the feed" or "reading feed", they mean the Feed tab
where insights appear. Use `publish_to_feed` to create content there.
"""
```

**之後：**
```
User: "Write something about Catherine the Great in my reading feed"
Agent: [Uses publish_to_feed to create insight]
       "Done! I've published 'The Enlightened Empress' to your reading feed."
```
</examples>

<checklist>
## 行動對等清單

對每個含UI變更之PR：
- [ ] 列出所有新UI動作
- [ ] 驗證每個動作皆有代理工具
- [ ] 更新系統提示以含新能力
- [ ] 新增至能力映射表
- [ ] 以自然語言請求測試

定期審計：
- [ ] 遍歷每個畫面
- [ ] 列出所有可能之使用者動作
- [ ] 檢查每個動作之工具覆蓋
- [ ] 按使用者要求可能性優先排序缺口
- [ ] 為高優先缺口建立issue
</checklist>
