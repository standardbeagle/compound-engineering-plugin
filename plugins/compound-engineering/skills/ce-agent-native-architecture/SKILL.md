---
name: ce-agent-native-architecture
description: Build applications where agents are first-class citizens. Use this skill when designing autonomous agents, creating MCP tools, implementing self-modifying systems, or building apps where features are outcomes achieved by agents operating in a loop.
---

<why_now>
## 缘起

软体代理今可恃矣。Claude Code 明证：LLM 得 bash 与 file 之具，循环操作迄于成事，能自主竟复杂多步之工。

可惊之发现：**善编码之代理实乃善通用之代理。** 其架构既能重构码库，亦能整理档案、管理书单、自动化流程。

Claude Code SDK 开此方便之门。构建应用，功能非手书之码——乃描述之果，由代理执器循环操作以达之。

遂启新域：效 Claude Code 之法，应用于编码之外诸类。
</why_now>

<core_principles>
## 核心原则

### 一、对等

**用户透过介面所能为者，代理藉工具亦当能之。**

此为根本原则。无此，余者皆虚。

设建笔记之应用，介面华美，能创、能排、能标。用户语代理曰："为吾记会议之要，标为急务。"

若介面能创笔记而代理无此能，则代理束手。或致歉，或追问，然无所助——虽人用介面举手之劳耳。

**修正之道：** 确保代理有工具（或工具之组合）能竟介面之所能。

此非谓介面按钮与工具一一对应，乃确保代理能**达同等之果**。或单器可办（`create_note`），或组合元器为之（`write_file` 写笔记目录以合格式）。

**纪律：** 每增介面功能，当自问：代理能达此果否？若不能，添必要之工具或元器。

能力对映表有助：

| 用户行动 | 代理何以达之 |
|----------|-------------|
| 创笔记 | `write_file` 至笔记目录，或 `create_note` 工具 |
| 标为急务 | `update_file` 元数据，或 `tag_note` 工具 |
| 搜笔记 | `search_files` 或 `search_notes` 工具 |
| 删笔记 | `delete_file` 或 `delete_note` 工具 |

**验证：** 任取介面一操作，描述予代理。能竟其果否？

---

### 二、粒度

**尚原子元器。功能乃代理循环操作所达之果。**

工具为元器之能：读档、写档、行 bash 令、存录、发报。

**功能** 非手书之函，乃提示词所描述之果，由代理执器循环操作以达之。

**粗粒度（限代理）：**
```
Tool: classify_and_organize_files(files)
→ 决策逻辑乃你所书
→ 代理但执行你的代码
→ 欲改行为，须重构
```

**细粒度（赋权代理）：**
```
Tools: read_file, write_file, move_file, list_directory, bash
Prompt: "Organize the user's downloads folder. Analyze each file,
        determine appropriate locations based on content and recency,
        and move them there."
Agent: Operates in a loop—reads files, makes judgments, moves things,
       checks results—until the folder is organized.
→ 代理自为决策
→ 欲改行为，但改提示词
```

**关键转变：** 代理追求结果而运用判断，非执行预编之序。或遇意外档案类型，或调整策略，或追问澄清。循环迄于成果方止。

元器愈原子，代理运用愈灵活。若将决策逻辑包于工具，则是以判断还归代码。

**验证：** 欲改功能行为，改散文抑或重构代码？

---

### 三、可组合性

**有原子工具与对等，但书新提示词即可创功能。**

此乃前二原则之报偿。工具原子化且代理能竟用户之所能，则新功能不过新提示词耳。

欲有"周报"功能，综列活动、建议优先？一提示词而已：

```
"Review files modified this week. Summarize key changes. Based on
incomplete items and approaching deadlines, suggest three priorities
for next week."
```

代理用 `list_files`、`read_file` 及其判断以成之。未曾写周报之码，但描述一果，代理循环操作以达之。

**此于开发者与用户皆然。** 新功能可藉添加提示词发布。用户可修改提示词或自建以定制行为。"当吾言'归档'，辄移至行动文件夹并标为急务"遂成用户级提示词以延展应用。

**约束：** 此唯于工具够原子可作未预想之组合、且代理与用户对等时方成立。若工具编码过多逻辑，或代理不得关键能力，组合即崩。

**验证：** 能否但书新提示词段而添功能，无需新码？

---

### 四、涌现能力

**代理能成你未明设之事。**

工具原子化、对等维续、提示词可组合，则用户将向代理索你未预想之事。而往往，代理能自解之。

*"交叉比照吾之会议笔记与任务清单，告吾所承诺而未排程者。"*

未建"承诺追踪"功能。然若代理能读笔记、读任务、而推理之——循环操作迄于有答——则能成之。

**此显潜在需求。** 无需猜用户欲何功能，但观其所请。模式既现，可以领域专用工具或专属提示词优化之。然无需预知——发现而已。

**飞轮：**
1. 以原子工具与对等建之
2. 用户索未预想之事
3. 代理组合工具以成之（或失败，显其不足）
4. 观所请之模式
5. 添领域工具或提示词以使常见模式高效
6. 循环

此改构建产品之道。非预想每项功能，乃建有力之基，从涌现中学习。

**验证：** 予代理一与领域相关之开放请求。能循合理之道，循环操作迄于成功否？若但言"无此功能"，则架构过拘。

---

### 五、持续改善

**代理原生应用藉累积脉络与提示词精进而日善。**

异于传统软体，代理原生应用可无发码而进益：

**累积脉络：** 代理可跨会话维续状态——何物存在、用户曾为何事、何者有效、何者无效。`context.md` 文件为代理所读写，乃第一层。更精者涉结构化记忆与习得偏好。

**提示词精进于多层：**
- **开发者层：** 发布更新之提示词，改全体用户之代理行为
- **用户层：** 用户为自身流程定制提示词
- **代理层：** 代理据反馈自改提示词（高阶）

**自我修改（高阶）：** 代理能改自身提示词乃至自身代码。生产用例当加安全护栏——审批关卡、自动检查点以回滚、健康检查。此乃方向所在。

改善机制仍在发现中。脉络与提示词精进已证可行。自我修改方兴。可确定者：此架构支持以传统软体所无之方式持续精进。

**验证：** 应用经一月之用，虽无码改，是否胜于首日？
</core_principles>

<intake>
## 需助代理原生架构何端？

1. **设计架构** - 从零规划代理原生系统
2. **档案与工作区** - 以档案为通用介面，共享工作区模式
3. **工具设计** - 构建元器工具、动态能力发现、CRUD 完备性
4. **领域工具** - 知何时添领域工具、何时守元器
5. **执行模式** - 完成信号、部分完成、脉络上限
6. **系统提示词** - 以提示词定义代理行为、判断准则
7. **脉络注入** - 运行时注入应用状态至代理提示词
8. **行动对等** - 确保代理能竟用户之所能
9. **自我修改** - 使代理安全演化自身
10. **产品设计** - 渐进展示、潜在需求、审批模式
11. **行动端模式** - iOS 储存、背景执行、检查点/恢复
12. **测试** - 测试代理原生应用之能力与对等
13. **重构** - 使既有代码更趋代理原生

**候回应方续行。**
</intake>

<routing>
| 回应 | 行动 |
|------|------|
| 1, "design", "architecture", "plan" | 读 `references/architecture-patterns.md`，后用架构检查清单 |
| 2, "files", "workspace", "filesystem" | 读 `references/files-universal-interface.md` 与 `references/shared-workspace-architecture.md` |
| 3, "tool", "mcp", "primitive", "crud" | 读 `references/mcp-tool-design.md` |
| 4, "domain tool", "when to add" | 读 `references/from-primitives-to-domain-tools.md` |
| 5, "execution", "completion", "loop" | 读 `references/agent-execution-patterns.md` |
| 6, "prompt", "system prompt", "behavior" | 读 `references/system-prompt-design.md` |
| 7, "context", "inject", "runtime", "dynamic" | 读 `references/dynamic-context-injection.md` |
| 8, "parity", "ui action", "capability map" | 读 `references/action-parity-discipline.md` |
| 9, "self-modify", "evolve", "git" | 读 `references/self-modification.md` |
| 10, "product", "progressive", "approval", "latent demand" | 读 `references/product-implications.md` |
| 11, "mobile", "ios", "android", "background", "checkpoint" | 读 `references/mobile-patterns.md` |
| 12, "test", "testing", "verify", "validate" | 读 `references/agent-native-testing.md` |
| 13, "review", "refactor", "existing" | 读 `references/refactoring-to-prompt-native.md` |

**读参考后，以其模式用于用户之具体脉络。**
</routing>

<architecture_checklist>
## 架构审查清单

设计代理原生系统时，**实现前** 验证此诸项：

### 核心原则
- [ ] **对等：** 每一介面行动有对应之代理能力
- [ ] **粒度：** 工具为元器；功能为提示词所定义之果
- [ ] **可组合性：** 新功能可但凭提示词添加
- [ ] **涌现能力：** 代理能处理领域内之开放请求

### 工具设计
- [ ] **动态 vs 静态：** 代理应全权访问之外部 API，用 Dynamic Capability Discovery
- [ ] **CRUD 完备：** 每一实体有创、读、更、删
- [ ] **元器非流程：** 工具赋能，不编码业务逻辑
- [ ] **API 为验证者：** API 验证时用 `z.string()` 输入，非 `z.enum()`

### 档案与工作区
- [ ] **共享工作区：** 代理与用户于同一数据空间操作
- [ ] **context.md 模式：** 代理读写脉络文件以累积知识
- [ ] **档案组织：** 实体范围目录，命名一致

### 代理执行
- [ ] **完成信号：** 代理有明确 `complete_task` 工具（非启发式检测）
- [ ] **部分完成：** 多步任务追踪进度以供恢复
- [ ] **脉络上限：** 自始即设计为有界脉络

### 脉络注入
- [ ] **可用资源：** 系统提示词含现有之物（档案、数据、类型）
- [ ] **可用能力：** 系统提示词以用户词汇记载工具
- [ ] **动态脉络：** 长会话刷新脉络（或提供 `refresh_context` 工具）

### 介面整合
- [ ] **代理 → 介面：** 代理变更反映于介面（共享服务、档案监听或事件汇流排）
- [ ] **无静默行动：** 代理写入即时触发介面更新
- [ ] **能力发现：** 用户可知代理能为何事

### 行动端（若适用）
- [ ] **检查点/恢复：** 优处 iOS 应用悬挂
- [ ] **iCloud 储存：** iCloud 优先，本地回退，多设备同步
- [ ] **成本意识：** 模型层阶选取（Haiku/Sonnet/Opus）

**设计架构时，于计划中逐项明述。**
</architecture_checklist>

<quick_start>
## 速始：构建代理原生功能

**步骤一：定义原子工具**
```typescript
const tools = [
  tool("read_file", "Read any file", { path: z.string() }, ...),
  tool("write_file", "Write any file", { path: z.string(), content: z.string() }, ...),
  tool("list_files", "List directory", { path: z.string() }, ...),
  tool("complete_task", "Signal task completion", { summary: z.string() }, ...),
];
```

**步骤二：以系统提示词书行为**
```markdown
## Your Responsibilities
When asked to organize content, you should:
1. Read existing files to understand the structure
2. Analyze what organization makes sense
3. Create/move files using your tools
4. Use your judgment about layout and formatting
5. Call complete_task when you're done

You decide the structure. Make it good.
```

**步骤三：令代理循环操作**
```typescript
const result = await agent.run({
  prompt: userMessage,
  tools: tools,
  systemPrompt: systemPrompt,
  // Agent loops until it calls complete_task
});
```
</quick_start>

<reference_index>
## 参考文件

参考皆在 `references/`：

**核心模式：**
- `references/architecture-patterns.md` - 事件驱动、统一协调器、代理至介面
- `references/files-universal-interface.md` - 何以用档案、组织模式、context.md
- `references/mcp-tool-design.md` - 工具设计、动态能力发现、CRUD
- `references/from-primitives-to-domain-tools.md` - 何时添领域工具，何时毕业为码
- `references/agent-execution-patterns.md` - 完成信号、部分完成、脉络上限
- `references/system-prompt-design.md` - 功能即提示词、判断准则

**代理原生纪律：**
- `references/dynamic-context-injection.md` - 运行时脉络、注入何物
- `references/action-parity-discipline.md` - 能力映射、对等工作流
- `references/shared-workspace-architecture.md` - 共享数据空间、介面整合
- `references/product-implications.md` - 渐进展示、潜在需求、审批
- `references/agent-native-testing.md` - 测试成果、对等测试

**平台专属：**
- `references/mobile-patterns.md` - iOS 储存、检查点/恢复、成本意识
- `references/self-modification.md` - 基于 Git 之演化、护栏
- `references/refactoring-to-prompt-native.md` - 迁移既有代码
</reference_index>

<anti_patterns>
## 反模式

### 常见而非全然代理原生之法

此非必然错误——或适于你的用例。然当辨其与此处所述架构之别。

**代理为路由器** — 代理判用户所欲，后调正确之函。代理之智用于路由，非用于行动。此可运作，然所用者代理能力之毫末耳。

**先建应用，后加代理** — 以传统方式（代码）建功能，后暴露予代理。代理但能做你功能已做之事。无涌现能力可言。

**请求/回应思维** — 代理得输入，为一事，返输出。此失循环：代理得一目标以达成，操作迄于完成，途中处理意外。

**防御性工具设计** — 过度约束工具输入，因惯于防御性编程。严格枚举，层层验证。此固安全，然阻代理做你未预想之事。

**代码走通途，代理但执行** — 传统软体以代码处理边界情况——你写 X 出错时之逻辑。代理原生则令代理以判断处理边界情况。若代码处理所有边界情况，代理不过调用者耳。

---

### 具体反模式

**大忌：代理执行你的代码而非自行思索**

```typescript
// WRONG - You wrote the workflow, agent just executes it
tool("process_feedback", async ({ message }) => {
  const category = categorize(message);      // Your code decides
  const priority = calculatePriority(message); // Your code decides
  await store(message, category, priority);   // Your code orchestrates
  if (priority > 3) await notify();           // Your code decides
});

// RIGHT - Agent figures out how to process feedback
tools: store_item, send_message  // Primitives
prompt: "Rate importance 1-5 based on actionability, store feedback, notify if >= 4"
```

**流程形工具** — `analyze_and_organize` 将判断包于工具中。析为元器，令代理组合之。

**脉络匮乏** — 代理不知应用中有何资源。
```
User: "Write something about Catherine the Great in my feed"
Agent: "What feed? I don't understand what system you're referring to."
```
修正：注入可用资源、能力与词汇至系统提示词。

**孤立介面行动** — 用户能透过介面为之而代理不能者。修正：维续对等。

**静默行动** — 代理改状态而介面不更新。修正：用共享数据存储配合响应式绑定，或档案系统监听。

**启发式完成检测** — 以启发法检测代理完成（连续无工具调用之迭代、检查预期输出档案）。此法脆弱。修正：要求代理透过 `complete_task` 工具明确发完成信号。

**动态 API 之静态工具映射** — 为 50 个 API 端点建 50 个工具，而 `discover` + `access` 模式可予更大弹性。
```typescript
// WRONG - Every API type needs a hardcoded tool
tool("read_steps", ...)
tool("read_heart_rate", ...)
tool("read_sleep", ...)
// When glucose tracking is added... code change required

// RIGHT - Dynamic capability discovery
tool("list_available_types", ...)  // Discover what's available
tool("read_health_data", { dataType: z.string() }, ...)  // Access any type
```

**不完整 CRUD** — 代理能创而不能更或删。
```typescript
// User: "Delete that journal entry"
// Agent: "I don't have a tool for that"
tool("create_journal_entry", ...)  // Missing: update, delete
```
修正：每一实体需完整 CRUD。

**沙箱隔离** — 代理与用户于不同数据空间操作。
```
Documents/
├── user_files/        ← User's space
└── agent_output/      ← Agent's space (isolated)
```
修正：用共享工作区，双方操作同一档案。

**无端设限** — 领域工具为做某事之唯一途径，而你非意在限制访问。默认当开放。除非有具体理由设限，否则保持元器可用。

**人为能力限制** — 出于模糊的安全顾虑而非特定风险而限制代理之能。限制能力当审慎。代理一般当能做用户之所能。
</anti_patterns>

<success_criteria>
## 成功准则

当你构建成代理原生应用：

### 架构
- [ ] 代理能达用户透过介面所能达之任何事（对等）
- [ ] 工具为原子元器；领域工具为捷径，非关卡（粒度）
- [ ] 新功能可但凭新提示词添加（可组合性）
- [ ] 代理能成你未明设之任务（涌现能力）
- [ ] 改行为即改提示词，非重构代码

### 实现
- [ ] 系统提示词含关于应用状态之动态脉络
- [ ] 每一介面行动有对应之代理工具（行动对等）
- [ ] 代理工具以用户词汇记载于系统提示词
- [ ] 代理与用户于同一数据空间操作（共享工作区）
- [ ] 代理行动即时反映于介面
- [ ] 每一实体有完整 CRUD（创、读、更、删）
- [ ] 代理明确发完成信号（无启发式检测）
- [ ] context.md 或等同物以累积知识

### 产品
- [ ] 简单请求即时生效，无需学习曲线
- [ ] 高级用户可将系统推向未预想之方向
- [ ] 观用户请代理做何事以学习其所欲
- [ ] 审批要求与利害及可逆性相称

### 行动端（若适用）
- [ ] 检查点/恢复处理应用中断
- [ ] iCloud 优先储存，本地回退
- [ ] 背景执行善用可用时间
- [ ] 模型层阶匹配任务复杂度

---

### 终极之验

**向代理描述一应用领域内之目标，而你未为此建特定功能。**

能自寻方法，循环操作迄于成功否？

若能，则你所建者代理原生也。

若曰"无此功能"——架构犹拘。
</success_criteria>
