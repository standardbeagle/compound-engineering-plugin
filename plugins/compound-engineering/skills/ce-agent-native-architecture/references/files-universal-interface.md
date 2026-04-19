<overview>
檔案乃agent-native應用之通用介面。代理天生精通檔案操作——已知如何讀、寫、組織檔案。此文涵蓋何以檔案如此有效、如何組織、及context.md積累知識模式。
</overview>

<why_files>
## 何以檔案

代理天生擅長檔案。Claude Code有效，因bash + filesystem乃最經實戰驗證之代理介面。構建agent-native應用時，善用此優勢。

### 代理已知如何

無需教導代理你的API——已知`cat`、`grep`、`mv`、`mkdir`。檔案操作乃其最精通之原語。

### 檔案可檢查

使用者可見代理建立之物、編輯之、移動之、刪除之。無黑盒。代理行為完全透明。

### 檔案可攜

匯出輕易。備份輕易。使用者擁有其資料。無廠商鎖定，無複雜遷移路徑。

### 應用狀態保持同步

行動裝置上，若使用iCloud之檔案系統，所有裝置共享相同檔案系統。代理在一裝置上之工作出現於所有裝置——無需建構伺服器。

### 目錄結構即資訊架構

檔案系統免費提供層級。`/projects/acme/notes/`自我文件化，而`SELECT * FROM notes WHERE project_id = 123`則否。
</why_files>

<file_organization>
## 檔案組織模式

> **需驗證：** 此等慣例乃目前有效之一法，非處方。應考慮更佳方案。

agent-native設計之通則：**為代理所能推理者而設計。** 最佳代理乃人類可理解者。若人類可觀看檔案結構而理解發生何事，代理大概亦可。

### 實體範圍目錄

以實體組織檔案，非以行為者或檔案類型：

```
{entity_type}/{entity_id}/
├── primary content
├── metadata
└── related materials
```

**範例：** `Research/books/{bookId}/`包含關於一本書之一切——全文、筆記、來源、代理日誌。

### 命名慣例

| 檔案類型 | 命名模式 | 範例 |
|-----------|---------------|---------|
| Entity data | `{entity}.json` | `library.json`, `status.json` |
| Human-readable content | `{content_type}.md` | `introduction.md`, `profile.md` |
| Agent reasoning | `agent_log.md` | Per-entity agent history |
| Primary content | `full_text.txt` | Downloaded/extracted text |
| Multi-volume | `volume{N}.txt` | `volume1.txt`, `volume2.txt` |
| External sources | `{source_name}.md` | `wikipedia.md`, `sparknotes.md` |
| Checkpoints | `{sessionId}.checkpoint` | UUID-based |
| Configuration | `config.json` | Feature settings |

### 目錄命名

- **實體範圍：** `{entityType}/{entityId}/`（如`Research/books/{bookId}/`）
- **類型範圍：** `{type}/`（如`AgentCheckpoints/`、`AgentLogs/`）
- **慣例：** 小寫加底線，非camelCase

### 短暫與持久分離

分離代理工作檔案與使用者永久資料：

```
Documents/
├── AgentCheckpoints/     # Ephemeral (can delete)
│   └── {sessionId}.checkpoint
├── AgentLogs/            # Ephemeral (debugging)
│   └── {type}/{sessionId}.md
└── Research/             # Durable (user's work)
    └── books/{bookId}/
```

### 分野：Markdown vs JSON

- **Markdown：** 使用者可能閱讀或編輯之內容
- **JSON：** 應用查詢之結構化資料
</file_organization>

<context_md_pattern>
## context.md 模式

代理於每次會話開始時讀取並隨學習而更新之檔案：

```markdown
# Context

## Who I Am
Reading assistant for the Every app.

## What I Know About This User
- Interested in military history and Russian literature
- Prefers concise analysis
- Currently reading War and Peace

## What Exists
- 12 notes in /notes
- 3 active projects
- User preferences at /preferences.md

## Recent Activity
- User created "Project kickoff" (2 hours ago)
- Analyzed passage about Austerlitz (yesterday)

## My Guidelines
- Don't spoil books they're reading
- Use their interests to personalize insights

## Current State
- No pending tasks
- Last sync: 10 minutes ago
```

### 益處

- **代理行為無需程式碼變更即演化** - 更新上下文，行為即變
- **使用者可檢查與修改** - 完全透明
- **積累上下文之天然位置** - 學習跨會話持久化
- **跨會話可攜** - 重啟代理，知識保留

### 運作方式

1. 代理於會話開始時讀取`context.md`
2. 學習重要事物時更新之
3. 系統亦可更新之（最近活動、新資源）
4. 上下文跨會話持久化

### 應含內容

| 區段 | 目的 |
|---------|---------|
| Who I Am | Agent identity and role |
| What I Know About This User | Learned preferences, interests |
| What Exists | Available resources, data |
| Recent Activity | Context for continuity |
| My Guidelines | Learned rules and constraints |
| Current State | Session status, pending items |
</context_md_pattern>

<files_vs_database>
## 檔案 vs 資料庫

> **需驗證：** 此框架基於行動裝置開發。網頁應用之權衡不同。

| 用檔案於... | 用資料庫於... |
|------------------|---------------------|
| 使用者應讀/編輯之內容 | 大量結構化資料 |
| 受益於版本控制之配置 | 需複雜查詢之資料 |
| 代理生成之內容 | 短暫狀態（sessions, caches） |
| 受益於透明度之任何事物 | 有關聯之資料 |
| 大型文本內容 | 需索引之資料 |

**原則：** 檔案為可讀性，資料庫為結構。猶疑時用檔案——更透明，使用者始終可檢查。

### 檔案最佳情境

- 規模小（一個使用者之圖書館，非百萬筆記錄）
- 透明度優先於查詢速度
- 雲端同步（iCloud、Dropbox）適用於檔案

### 混合方法

即使需要資料庫以提升效能，考慮維護基於檔案之"真實來源"供代理工作，同步至資料庫供UI：

```
Files (agent workspace):
  Research/book_123/introduction.md

Database (UI queries):
  research_index: { bookId, path, title, createdAt }
```
</files_vs_database>

<conflict_model>
## 衝突模型

若代理與使用者寫入相同檔案，需衝突模型。

### 當前現實

多數實作使用**最後寫入者勝出**，透過原子寫入：

```swift
try data.write(to: url, options: [.atomic])
```

簡單但可能遺失變更。

### 選項

| 策略 | 優點 | 缺點 |
|----------|------|------|
| **Last write wins** | Simple | Changes can be lost |
| **Agent checks before writing** | Preserves user edits | More complexity |
| **Separate spaces** | No conflicts | Less collaboration |
| **Append-only logs** | Never overwrites | Files grow forever |
| **File locking** | Safe concurrent access | Complexity, can block |

### 建議方法

**代理頻繁寫入之檔案（logs、status）：** 最後寫入者勝出即可。衝突罕見。

**使用者編輯之檔案（profiles、notes）：** 考慮明確處理：
- 代理覆寫前檢查修改時間
- 或保持代理輸出與使用者可編輯內容分離
- 或使用僅附加模式

### iCloud 注意事項

iCloud同步增加複雜度。同步衝突時產生`{filename} (conflict).md`檔案。監看此等：

```swift
NotificationCenter.default.addObserver(
    forName: .NSMetadataQueryDidUpdate,
    ...
)
```

### 系統提示指引

告知代理關於衝突模型：

```markdown
## Working with User Content

When you create content, the user may edit it afterward. Always read
existing files before modifying them—the user may have made improvements
you should preserve.

If a file has been modified since you last wrote it, ask before overwriting.
```
</conflict_model>

<examples>
## 範例：閱讀應用檔案結構

```
Documents/
├── Library/
│   └── library.json              # Book metadata
├── Research/
│   └── books/
│       └── {bookId}/
│           ├── full_text.txt     # Downloaded content
│           ├── introduction.md   # Agent-generated, user-editable
│           ├── notes.md          # User notes
│           └── sources/
│               ├── wikipedia.md  # Research gathered by agent
│               └── reviews.md
├── Chats/
│   └── {conversationId}.json     # Chat history
├── Profile/
│   └── profile.md                # User reading profile
└── context.md                    # Agent's accumulated knowledge
```

**運作方式：**

1. 使用者新增書籍 → 在`library.json`建立條目
2. 代理下載文本 → 儲存至`Research/books/{id}/full_text.txt`
3. 代理研究 → 儲存至`sources/`
4. 代理生成簡介 → 儲存至`introduction.md`
5. 使用者編輯簡介 → 代理下次讀取時可見變更
6. 代理以所學更新`context.md`
</examples>

<checklist>
## 檔案作為通用介面清單

### 組織
- [ ] 實體範圍目錄（`{type}/{id}/`）
- [ ] 一致命名慣例
- [ ] 短暫與持久分離
- [ ] 人類內容用Markdown，結構化資料用JSON

### context.md
- [ ] 代理於會話開始時讀取上下文
- [ ] 代理學習時更新上下文
- [ ] 含：身份、使用者知識、存在何物、指引
- [ ] 跨會話持久化

### 衝突處理
- [ ] 衝突模型已定義（last-write-wins、check-before-write等）
- [ ] 系統提示中有代理指引
- [ ] iCloud衝突監看（若適用）

### 整合
- [ ] UI觀察檔案變更（或共享服務）
- [ ] 代理可讀取使用者編輯
- [ ] 使用者可檢查代理輸出
</checklist>
