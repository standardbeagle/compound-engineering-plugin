<overview>
測試agent-native應用需不同於傳統單元測試之方法。測試代理是否達成結果，非是否呼叫特定函式。此文提供具體測試模式以驗證應用真正agent-native。
</overview>

<testing_philosophy>
## 測試哲學

### 測結果，非測過程

**傳統（過程導向）：**
```typescript
// Testing that a specific function was called with specific args
expect(mockProcessFeedback).toHaveBeenCalledWith({
  message: "Great app!",
  category: "praise",
  priority: 2
});
```

**Agent-native（結果導向）：**
```typescript
// Testing that the outcome was achieved
const result = await agent.process("Great app!");
const storedFeedback = await db.feedback.getLatest();

expect(storedFeedback.content).toContain("Great app");
expect(storedFeedback.importance).toBeGreaterThanOrEqual(1);
expect(storedFeedback.importance).toBeLessThanOrEqual(5);
// We don't care exactly how it categorized—just that it's reasonable
```

### 接受變異性

代理每次可能以不同方式解決問題。測試應：
- 驗證終態，非路徑
- 接受合理範圍，非精確值
- 檢查必要元素存在，非精確格式
</testing_philosophy>

<can_agent_do_it_test>
## "代理能做嗎？"測試

對每個UI功能，撰寫測試提示並驗證代理能完成。

### 模板

```typescript
describe('Agent Capability Tests', () => {
  test('Agent can add a book to library', async () => {
    const result = await agent.chat("Add 'Moby Dick' by Herman Melville to my library");

    // Verify outcome
    const library = await libraryService.getBooks();
    const mobyDick = library.find(b => b.title.includes("Moby Dick"));

    expect(mobyDick).toBeDefined();
    expect(mobyDick.author).toContain("Melville");
  });

  test('Agent can publish to feed', async () => {
    // Setup: ensure a book exists
    await libraryService.addBook({ id: "book_123", title: "1984" });

    const result = await agent.chat("Write something about surveillance themes in my feed");

    // Verify outcome
    const feed = await feedService.getItems();
    const newItem = feed.find(item => item.bookId === "book_123");

    expect(newItem).toBeDefined();
    expect(newItem.content.toLowerCase()).toMatch(/surveillance|watching|control/);
  });

  test('Agent can search and save research', async () => {
    await libraryService.addBook({ id: "book_456", title: "Moby Dick" });

    const result = await agent.chat("Research whale symbolism in Moby Dick");

    // Verify files were created
    const files = await fileService.listFiles("Research/book_456/");
    expect(files.length).toBeGreaterThan(0);

    // Verify content is relevant
    const content = await fileService.readFile(files[0]);
    expect(content.toLowerCase()).toMatch(/whale|symbolism|melville/);
  });
});
```

### "寫入位置"測試

關鍵試金石：代理能否在特定應用位置建立內容？

```typescript
describe('Location Awareness Tests', () => {
  const locations = [
    { userPhrase: "my reading feed", expectedTool: "publish_to_feed" },
    { userPhrase: "my library", expectedTool: "add_book" },
    { userPhrase: "my research folder", expectedTool: "write_file" },
    { userPhrase: "my profile", expectedTool: "write_file" },
  ];

  for (const { userPhrase, expectedTool } of locations) {
    test(`Agent knows how to write to "${userPhrase}"`, async () => {
      const prompt = `Write a test note to ${userPhrase}`;
      const result = await agent.chat(prompt);

      // Check that agent used the right tool (or achieved the outcome)
      expect(result.toolCalls).toContainEqual(
        expect.objectContaining({ name: expectedTool })
      );

      // Or verify outcome directly
      // expect(await locationHasNewContent(userPhrase)).toBe(true);
    });
  }
});
```
</can_agent_do_it_test>

<surprise_test>
## "驚喜測試"

設計良好的agent-native應用讓代理能找出創意方法。以開放式請求測試此能力。

### 測試

```typescript
describe('Agent Creativity Tests', () => {
  test('Agent can handle open-ended requests', async () => {
    // Setup: user has some books
    await libraryService.addBook({ id: "1", title: "1984", author: "Orwell" });
    await libraryService.addBook({ id: "2", title: "Brave New World", author: "Huxley" });
    await libraryService.addBook({ id: "3", title: "Fahrenheit 451", author: "Bradbury" });

    // Open-ended request
    const result = await agent.chat("Help me organize my reading for next month");

    // The agent should do SOMETHING useful
    // We don't specify exactly what—that's the point
    expect(result.toolCalls.length).toBeGreaterThan(0);

    // It should have engaged with the library
    const libraryTools = ["read_library", "write_file", "publish_to_feed"];
    const usedLibraryTool = result.toolCalls.some(
      call => libraryTools.includes(call.name)
    );
    expect(usedLibraryTool).toBe(true);
  });

  test('Agent finds creative solutions', async () => {
    // Don't specify HOW to accomplish the task
    const result = await agent.chat(
      "I want to understand the dystopian themes across my sci-fi books"
    );

    // Agent might:
    // - Read all books and create a comparison document
    // - Research dystopian literature and relate it to user's books
    // - Create a mind map in a markdown file
    // - Publish a series of insights to the feed

    // We just verify it did something substantive
    expect(result.response.length).toBeGreaterThan(100);
    expect(result.toolCalls.length).toBeGreaterThan(0);
  });
});
```

### 失敗之貌

```typescript
// FAILURE: Agent can only say it can't do that
const result = await agent.chat("Help me prepare for a book club discussion");

// Bad outcome:
expect(result.response).not.toContain("I can't");
expect(result.response).not.toContain("I don't have a tool");
expect(result.response).not.toContain("Could you clarify");

// If the agent asks for clarification on something it should understand,
// you have a context injection or capability gap
```
</surprise_test>

<parity_testing>
## 自動化對等測試

確保每個UI動作皆有代理對應。

### 能力映射測試

```typescript
// capability-map.ts
export const capabilityMap = {
  // UI Action: Agent Tool
  "View library": "read_library",
  "Add book": "add_book",
  "Delete book": "delete_book",
  "Publish insight": "publish_to_feed",
  "Start research": "start_research",
  "View highlights": "read_library",  // same tool, different query
  "Edit profile": "write_file",
  "Search web": "web_search",
  "Export data": "N/A",  // UI-only action
};

// parity.test.ts
import { capabilityMap } from './capability-map';
import { getAgentTools } from './agent-config';
import { getSystemPrompt } from './system-prompt';

describe('Action Parity', () => {
  const agentTools = getAgentTools();
  const systemPrompt = getSystemPrompt();

  for (const [uiAction, toolName] of Object.entries(capabilityMap)) {
    if (toolName === 'N/A') continue;

    test(`"${uiAction}" has agent tool: ${toolName}`, () => {
      const toolNames = agentTools.map(t => t.name);
      expect(toolNames).toContain(toolName);
    });

    test(`${toolName} is documented in system prompt`, () => {
      expect(systemPrompt).toContain(toolName);
    });
  }
});
```

### 上下文對等測試

```typescript
describe('Context Parity', () => {
  test('Agent sees all data that UI shows', async () => {
    // Setup: create some data
    await libraryService.addBook({ id: "1", title: "Test Book" });
    await feedService.addItem({ id: "f1", content: "Test insight" });

    // Get system prompt (which includes context)
    const systemPrompt = await buildSystemPrompt();

    // Verify data is included
    expect(systemPrompt).toContain("Test Book");
    expect(systemPrompt).toContain("Test insight");
  });

  test('Recent activity is visible to agent', async () => {
    // Perform some actions
    await activityService.log({ action: "highlighted", bookId: "1" });
    await activityService.log({ action: "researched", bookId: "2" });

    const systemPrompt = await buildSystemPrompt();

    // Verify activity is included
    expect(systemPrompt).toMatch(/highlighted|researched/);
  });
});
```
</parity_testing>

<integration_testing>
## 整合測試

測試從使用者請求到結果之完整流程。

### 端對端流程測試

```typescript
describe('End-to-End Flows', () => {
  test('Research flow: request → web search → file creation', async () => {
    // Setup
    const bookId = "book_123";
    await libraryService.addBook({ id: bookId, title: "Moby Dick" });

    // User request
    await agent.chat("Research the historical context of whaling in Moby Dick");

    // Verify: web search was performed
    const searchCalls = mockWebSearch.mock.calls;
    expect(searchCalls.length).toBeGreaterThan(0);
    expect(searchCalls.some(call =>
      call[0].query.toLowerCase().includes("whaling")
    )).toBe(true);

    // Verify: files were created
    const researchFiles = await fileService.listFiles(`Research/${bookId}/`);
    expect(researchFiles.length).toBeGreaterThan(0);

    // Verify: content is relevant
    const content = await fileService.readFile(researchFiles[0]);
    expect(content.toLowerCase()).toMatch(/whale|whaling|nantucket|melville/);
  });

  test('Publish flow: request → tool call → feed update → UI reflects', async () => {
    // Setup
    await libraryService.addBook({ id: "book_1", title: "1984" });

    // Initial state
    const feedBefore = await feedService.getItems();

    // User request
    await agent.chat("Write something about Big Brother for my reading feed");

    // Verify feed updated
    const feedAfter = await feedService.getItems();
    expect(feedAfter.length).toBe(feedBefore.length + 1);

    // Verify content
    const newItem = feedAfter.find(item =>
      !feedBefore.some(old => old.id === item.id)
    );
    expect(newItem).toBeDefined();
    expect(newItem.content.toLowerCase()).toMatch(/big brother|surveillance|watching/);
  });
});
```

### 失敗恢復測試

```typescript
describe('Failure Recovery', () => {
  test('Agent handles missing book gracefully', async () => {
    const result = await agent.chat("Tell me about 'Nonexistent Book'");

    // Agent should not crash
    expect(result.error).toBeUndefined();

    // Agent should acknowledge the issue
    expect(result.response.toLowerCase()).toMatch(
      /not found|don't see|can't find|library/
    );
  });

  test('Agent recovers from API failure', async () => {
    // Mock API failure
    mockWebSearch.mockRejectedValueOnce(new Error("Network error"));

    const result = await agent.chat("Research this topic");

    // Agent should handle gracefully
    expect(result.error).toBeUndefined();
    expect(result.response).not.toContain("unhandled exception");

    // Agent should communicate the issue
    expect(result.response.toLowerCase()).toMatch(
      /couldn't search|unable to|try again/
    );
  });
});
```
</integration_testing>

<snapshot_testing>
## 系統提示快照測試

追蹤系統提示與上下文注入隨時間之變化。

```typescript
describe('System Prompt Stability', () => {
  test('System prompt structure matches snapshot', async () => {
    const systemPrompt = await buildSystemPrompt();

    // Extract structure (removing dynamic data)
    const structure = systemPrompt
      .replace(/id: \w+/g, 'id: [ID]')
      .replace(/"[^"]+"/g, '"[TITLE]"')
      .replace(/\d{4}-\d{2}-\d{2}/g, '[DATE]');

    expect(structure).toMatchSnapshot();
  });

  test('All capability sections are present', async () => {
    const systemPrompt = await buildSystemPrompt();

    const requiredSections = [
      "Your Capabilities",
      "Available Books",
      "Recent Activity",
    ];

    for (const section of requiredSections) {
      expect(systemPrompt).toContain(section);
    }
  });
});
```
</snapshot_testing>

<manual_testing>
## 手動測試清單

部分事項於開發時手動測試最佳：

### 自然語言變化測試

對同一請求嘗試多種措辭：

```
"Add this to my feed"
"Write something in my reading feed"
"Publish an insight about this"
"Put this in the feed"
"I want this in my feed"
```

若上下文注入正確，皆應運作。

### 邊界情況提示

```
"What can you do?"
→ Agent should describe capabilities

"Help me with my books"
→ Agent should engage with library, not ask what "books" means

"Write something"
→ Agent should ask WHERE (feed, file, etc.) if not clear

"Delete everything"
→ Agent should confirm before destructive actions
```

### 混淆測試

詢問應存在但可能未正確連接之事：

```
"What's in my research folder?"
→ Should list files, not ask "what research folder?"

"Show me my recent reading"
→ Should show activity, not ask "what do you mean?"

"Continue where I left off"
→ Should reference recent activity if available
```
</manual_testing>

<ci_integration>
## CI/CD 整合

新增agent-native測試至CI管線：

```yaml
# .github/workflows/test.yml
name: Agent-Native Tests

on: [push, pull_request]

jobs:
  agent-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup
        run: npm install

      - name: Run Parity Tests
        run: npm run test:parity

      - name: Run Capability Tests
        run: npm run test:capabilities
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Check System Prompt Completeness
        run: npm run test:system-prompt

      - name: Verify Capability Map
        run: |
          # Ensure capability map is up to date
          npm run generate:capability-map
          git diff --exit-code capability-map.ts
```

### 成本感知測試

代理測試消耗API token。管理策略：

```typescript
// Use smaller models for basic tests
const testConfig = {
  model: process.env.CI ? "claude-3-haiku" : "claude-3-opus",
  maxTokens: 500,  // Limit output length
};

// Cache responses for deterministic tests
const cachedAgent = new CachedAgent({
  cacheDir: ".test-cache",
  ttl: 24 * 60 * 60 * 1000,  // 24 hours
});

// Run expensive tests only on main branch
if (process.env.GITHUB_REF === 'refs/heads/main') {
  describe('Full Integration Tests', () => { ... });
}
```
</ci_integration>

<test_utilities>
## 測試工具

### 代理測試線束

```typescript
class AgentTestHarness {
  private agent: Agent;
  private mockServices: MockServices;

  async setup() {
    this.mockServices = createMockServices();
    this.agent = await createAgent({
      services: this.mockServices,
      model: "claude-3-haiku",  // Cheaper for tests
    });
  }

  async chat(message: string): Promise<AgentResponse> {
    return this.agent.chat(message);
  }

  async expectToolCall(toolName: string) {
    const lastResponse = this.agent.getLastResponse();
    expect(lastResponse.toolCalls.map(t => t.name)).toContain(toolName);
  }

  async expectOutcome(check: () => Promise<boolean>) {
    const result = await check();
    expect(result).toBe(true);
  }

  getState() {
    return {
      library: this.mockServices.library.getBooks(),
      feed: this.mockServices.feed.getItems(),
      files: this.mockServices.files.listAll(),
    };
  }
}

// Usage
test('full flow', async () => {
  const harness = new AgentTestHarness();
  await harness.setup();

  await harness.chat("Add 'Moby Dick' to my library");
  await harness.expectToolCall("add_book");
  await harness.expectOutcome(async () => {
    const state = harness.getState();
    return state.library.some(b => b.title.includes("Moby"));
  });
});
```
</test_utilities>

<checklist>
## 測試清單

自動化測試：
- [ ] 每個UI動作之"代理能做嗎？"測試
- [ ] 位置感知測試（"write to my feed"）
- [ ] 對等測試（工具存在、載入於提示）
- [ ] 上下文對等測試（代理可見UI所顯示）
- [ ] 端對端流程測試
- [ ] 失敗恢復測試

手動測試：
- [ ] 自然語言變化（多種措辭皆有效）
- [ ] 邊界情況提示（開放式請求）
- [ ] 混淆測試（代理知曉應用詞彙）
- [ ] 驚喜測試（代理能發揮創意）

CI整合：
- [ ] 對等測試於每個PR執行
- [ ] 能力測試以API key執行
- [ ] 系統提示完整性檢查
- [ ] 能力映射漂移偵測
</checklist>
