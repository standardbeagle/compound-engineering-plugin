---
name: ce-optimize
description: "Run metric-driven iterative optimization loops. Define a measurable goal, build measurement scaffolding, then run parallel experiments that try many approaches, measure each against hard gates and/or LLM-as-judge quality scores, keep improvements, and converge toward the best solution. Use when optimizing clustering quality, search relevance, build performance, prompt quality, or any measurable outcome that benefits from systematic experimentation. Inspired by Karpathy's autoresearch, generalized for multi-file code changes and non-ML domains."
argument-hint: "[path to optimization spec YAML, or describe the optimization goal]"
---

# 迭代优化循环

行度量驱动之迭代优化。定义目标，构建度量支架，后行并行实验收敛于最优解。

## 互动方式

可用时用平台之阻塞提问工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。否则，于对话中列编号选项候用户回复方续行。

## 输入

<optimization_input> #$ARGUMENTS </optimization_input>

若上方输入为空，问："欲优化何物？描述目标，或提供优化规格 YAML 文件路径。"

## 优化规格 Schema

验证时参照规格 schema：

`references/optimize-spec-schema.yaml`

## 实验日志 Schema

状态管理参照实验日志 schema：

`references/experiment-log-schema.yaml`

## 速始

首次运行，求信号与安全，非最高吞吐：

- 度量为客观且廉量时自 `references/example-hard-spec.yaml` 始
- 仅当实际品质需语义判断时方用 `references/example-judge-spec.yaml`
- 偏好 `execution.mode: serial` 与 `execution.max_concurrent: 1`
- 首次运行限以 `stopping.max_iterations: 4` 及 `stopping.max_hours: 1`
- 于基线与度量线缆受信前避免新依赖
- judge 模式以 `sample_size: 10`、`batch_size: 5` 及 `max_total_cost_usd: 5` 始

友好概览——此技能何用、何时用 hard metrics vs LLM-as-judge、及示例启动提示词——见：

`references/usage-guide.md`

---

## 持久化纪律

**关键：磁盘上之实验日志为唯一真相来源。对话脉络非持久存储。仅存在于对话中之结果将丢失。**

`.context/compound-engineering/ce-optimize/<spec-name>/` 下之文件为本地暂存状态。git 忽略之，故于同一机器上本地恢复可存，但不随提交、分支或推送保留，除非用户另行导出。

此技能运行数小时。脉络窗口压缩、会话崩溃、代理重启。每一重要之状态必须存于磁盘，非代理记忆中。

**若于对话中产出结果表而未先写入磁盘，则为 bug。** 对话为用户而设。实验日志文件为持久性而设。

### 核心规则

1. **度量后立即将每项实验结果写入磁盘** — 非批量后，非评估后，立即。于度量值已知之刹那即将实验条目追加至实验日志文件，先于评估下一实验之前。此为首要崩溃安全规则。

2. **验证每次关键写入** — 写入实验日志后，回读文件确认条目存在。此捕获静默写入失败。验证通过方续行下一实验。

3. **于每阶段边界及每次决策前自磁盘重读** — 跨阶段转换、批量边界、或任何可能耗时之操作后，绝不信任内存中状态。自磁盘重读实验日志与策略摘要。

4. **Phase 3 中实验日志仅追加** — 绝不重写完整文件。追加新实验条目。仅当发现新最优时原地更新 `best` 段。此防写入中断时之数据丢失。

5. **逐实验结果标记以利崩溃恢复** — 每项实验于度量后立即于其 worktree 写 `result.yaml` 标记。恢复时扫描此标记以恢复已度量但未记录之实验。

6. **策略摘要于每批后、生成新假设前写入** — 代理读摘要（非记忆）以决下一步。

7. **绝不于写入磁盘前向用户展示结果** — 模式：度量 → 写磁盘 → 验证 → 后展示。非反之。

### 强制磁盘检查点

此为不可商量之写入-然后-验证步骤。于每检查点，代理必须写入指定文件后回读确认写入成功。

| 检查点 | 写入文件 | 阶段 |
|--------|---------|------|
| CP-0：规格保存 | `spec.yaml` | Phase 0，用户批准后 |
| CP-1：基线记录 | `experiment-log.yaml`（初始含基线） | Phase 1，基线度量后 |
| CP-2：假设储备保存 | `experiment-log.yaml`（hypothesis_backlog 段） | Phase 2，假设生成后 |
| CP-3：每项实验结果 | `experiment-log.yaml`（追加实验条目） | Phase 3.3，每次度量后立即 |
| CP-4：批量摘要 | `experiment-log.yaml`（outcomes + best）+ `strategy-digest.md` | Phase 3.5，批量评估后 |
| CP-5：最终摘要 | `experiment-log.yaml`（最终状态） | Phase 4，收尾时 |

**验证步骤格式：**
1. 用原生文件写入工具写文件
2. 用原生文件读取工具回读
3. 确认预期内容存在
4. 若验证失败，重试写入。若两次失败，警告用户。

### 文件位置（皆在 `.context/compound-engineering/ce-optimize/<spec-name>/` 下）

| 文件 | 用途 | 写入时机 |
|------|------|---------|
| `spec.yaml` | 优化规格（运行中不可变） | Phase 0（CP-0） |
| `experiment-log.yaml` | 所有实验之完整历史 | CP-1 初始化，CP-3 追加，CP-4 更新 |
| `strategy-digest.md` | 压缩学习供假设生成 | CP-4 每批后写入 |
| `<worktree>/result.yaml` | 逐实验崩溃恢复标记 | 度量后立即，CP-3 前 |

### 恢复时

当 Phase 0.4 检测到既有运行：
1. 自磁盘读实验日志——此为真相
2. 扫描 worktree 目录寻尚未入日志之 `result.yaml` 标记
3. 恢复任何已度量但未记录之实验
4. 自日志所停处续行

---

## Phase 0：设置

### 0.1 判定输入类型

检查输入是否为：
- **规格文件路径**（以 `.yaml` 或 `.yml` 结尾）：读取并验证
- **优化目标描述**：协助用户交互式创规格

### 0.2 载入或创建规格

**若提供规格文件：**
1. 读取 YAML 规格文件。协调代理原生解析 YAML——无需 shell 脚本解析。
2. 对照 `references/optimize-spec-schema.yaml` 验证：
   - 所有必填字段存在
   - `name` 为小写 kebab-case 且可安全用于 git refs / worktree 路径
   - `metric.primary.type` 为 `hard` 或 `judge`
   - 若 type 为 `judge`，`metric.judge` 段存在且含 `rubric` 与 `scoring`
   - 至少定义一个退化关卡
   - `measurement.command` 非空
   - `scope.mutable` 与 `scope.immutable` 各至少一项目
   - 关卡检查运算子有效（`>=`、`<=`、`>`、`<`、`==`、`!=`）
   - `execution.max_concurrent` 至少为 1
   - 后端为 `worktree` 时 `execution.max_concurrent` 不超过 6
3. 若验证失败，报告错误并请用户修正

**若提供描述：**
1. 分析项目以了解可度量者
2. **检测优化目标为定性或定量** — 此决定 `type: hard` vs `type: judge`，为最重要之规格决策：

   **用 `type: hard` 当：**
   - 度量为有明确"更好"方向之标量数字
   - 度量可客观测量（构建时间、测试通过率、延迟、内存用量）
   - 无需人类判断即可评估"此结果实为佳否？"
   - 示例：减构建时间、增测试覆盖、降 API 延迟、减 bundle 体积

   **用 `type: judge` 当：**
   - 输出品质需语义理解方可评估
   - 人类审查者需审视结果方能言"此更佳"
   - 代理度量存在但可能误导（如"更多集群"不意味"更好集群"）
   - 优化可能产出表面上好看之退化方案
   - 示例：集群品质、搜索相关性、摘要品质、代码可读性、UX 文案、推荐相关性

   **重要**：若目标为定性，**强烈推荐 `type: judge`**。解释 hard metrics 独用将优化代理数字而不检查实际品质。展示三层方案：
   - **退化关卡**（hard、廉价、快速）：捕获明显坏之方案——如"所有项目归1集群"或"0%覆盖"。先运行。关卡失败则跳过昂贵之 judge 步骤。
   - **LLM-as-judge**（实际优化目标）：采样输出，按 rubric 评分，汇总。此为循环所优化者。
   - **诊断**（记录，不关卡）：分布统计、计数、时耗——有助于理解何以 judge 分数变化。

   若用户坚持定性目标用 `type: hard`，续行但警告结果或优化误导性代理。

3. **设计采样策略**（for `type: judge`）：

   引导用户定义分层采样。关键问题为："输出空间之哪些部分需检查品质？"

   步步引导此诸问题：
   - **一个"项目"长什么样？**（一个集群、一页搜索结果、一份摘要等）
   - **自然的大小/品质分层为何？**（如大集群 vs 小集群 vs 单例）
   - **品质失败最可能在哪里？**（如极大集群可能为退化合并；单例可能为遗漏之分组）
   - **总样本量何以平衡成本与信号？**（默认：30 项目，据输出量调整）

   集群分层采样示例：
   ```yaml
   stratification:
     - bucket: "top_by_size"     # largest clusters — check for degenerate mega-clusters
       count: 10
     - bucket: "mid_range"       # middle of non-solo cluster size range — representative quality
       count: 10
     - bucket: "small_clusters"  # clusters with 2-3 items — check if connections are real
       count: 10
   singleton_sample: 15          # singletons — check for false negatives (items that should cluster)
   ```

   采样策略因领域而异。搜索相关性之分层或为"top-3 结果"、"4-10 结果"、"尾部结果"。摘要或为"短文档"、"长文档"、"多主题文档"。

   **单例评估于目标涉及覆盖时至关重要** — 以 singleton rubric 采样单例可检查系统是否遗漏明显之分组。

4. **设计 rubric**（for `type: judge`）：

   协助用户定义评分 rubric。良善之 rubric：
   - 有 1-5 量表（或类似），每级有具体描述
   - 含辅助字段有助于诊断问题（如 `distinct_topics`、`outlier_count`）
   - 足够具体使两位评判者给分相近
   - 不预设越大/越多越好——"平均每集群3项"本身无好坏

   集群 rubric 示例：
   ```yaml
   rubric: |
     Rate this cluster 1-5:
     - 5: All items clearly about the same issue/feature
     - 4: Strong theme, minor outliers
     - 3: Related but covers 2-3 sub-topics that could reasonably be split
     - 2: Weak connection — items share superficial similarity only
     - 1: Unrelated items grouped together
     Also report: distinct_topics (integer), outlier_count (integer)
   ```

5. 引导用户完成其余规格字段：
   - 何种退化情况应拒绝？（关卡——如"solo_pct <= 0.95"捕获全单例、"max_cluster_size <= 500"捕获巨型集群）
   - 何命令运行度量？
   - 何文件可改？何为不可变？
   - 有约束或依赖否？
   - 若首次运行：推荐 `execution.mode: serial`、`execution.max_concurrent: 1`、`stopping.max_iterations: 4`、`stopping.max_hours: 1`
   - 若 `type: judge`：推荐 `sample_size: 10`、`batch_size: 5`、`max_total_cost_usd: 5` 直至 rubric 与线缆受信
6. 将规格写至 `.context/compound-engineering/ce-optimize/<spec-name>/spec.yaml`
7. 向用户展示规格以求批准方续行

### 0.3 搜索先前学习

分派 `research:ce-learnings-researcher` 搜索类似主题之先前优化工作。若存在相关学习，纳入方法中。

### 0.4 运行身份检测

检查 `optimize/<spec-name>` 分支是否已存在：

```bash
git rev-parse --verify "optimize/<spec-name>" 2>/dev/null
```

**若分支存在**，检查 `.context/compound-engineering/ce-optimize/<spec-name>/experiment-log.yaml` 是否有既有实验日志。

以平台提问工具予用户选择：
- **恢复**：自磁盘读取所有状态（不依赖先前会话之任何内存脉络）。扫描 worktree 目录寻 `result.yaml` 标记以恢复已度量但未记录之实验。自日志中最后迭代号续行。
- **全新开始**：归档旧分支至 `optimize-archive/<spec-name>/archived-<timestamp>`，清除实验日志，从零开始

### 0.5 创建优化分支与暂存空间

```bash
git checkout -b "optimize/<spec-name>"  # or switch to existing if resuming
```

创建暂存目录：
```bash
mkdir -p .context/compound-engineering/ce-optimize/<spec-name>/
```

---

## Phase 1：度量支架

**此阶段为硬关卡。用户须于 Phase 2 前批准基线与并行就绪。**

### 1.1 清净树关卡

验证 `scope.mutable` 与 `scope.immutable` 内无未提交变更：

```bash
git status --porcelain
```

按范围路径过滤输出。若范围内文件有未提交变更：
- 报告哪些文件为脏
- 请用户提交或暂存方续行
- 范围内文件工作树清净前勿续行

### 1.2 构建或验证度量线缆

**若用户提供度量线缆**（`measurement.command` 已存在）：
1. 透过度量脚本运行一次：
   ```bash
   bash scripts/measure.sh "<measurement.command>" <timeout_seconds> "<measurement.working_directory or .>"
   ```
2. 验证 JSON 输出：
   - 含所有退化关卡度量名之键
   - 含所有诊断度量名之键
   - 值为预期的数字或布尔
3. 若验证失败，报告缺何物并请用户修正线缆

**若代理须构建线缆：**
1. 分析码库以理解当前方法及应度量者
2. 构建评估脚本（如 `evaluate.py`、`evaluate.sh` 或等同物）
3. 将评估脚本路径加至 `scope.immutable`——实验代理不得修改之
4. 运行一次并验证输出
5. 向用户展示线缆及其输出以供审查

### 1.3 建立基线

于当前代码运行度量线缆。

**若稳定性模式为 `repeat`：**
1. 运行线缆 `repeat_count` 次
2. 以配置之聚合方法聚合结果（median、mean、min、max）
3. 计算跨运行方差
4. 若方差超 `noise_threshold`，警告用户并建议增 `repeat_count`

于实验日志记录基线：
```yaml
baseline:
  timestamp: "<current ISO 8601 timestamp>"
  gates:
    <gate_name>: <value>
    ...
  diagnostics:
    <diagnostic_name>: <value>
    ...
```

若 primary type 为 `judge`，亦对基线输出运行 judge 评估以建立起始 judge 分数。

### 1.4 并行就绪探针

运行并行探针脚本：
```bash
bash scripts/parallel-probe.sh "<project_directory>" "<measurement.command>" "<measurement.working_directory>" <shared_files...>
```

读取 JSON 输出。向用户展示任何阻碍及建议缓解措施。视探针为刻意窄范围：应检查度量命令、度量工作目录及明确声明之共享文件，非整个仓库。

### 1.5 Worktree 预算检查

计算现有 worktree 数：
```bash
bash scripts/experiment-worktree.sh count
```

若数量 + `execution.max_concurrent` 将超过 12：
- 警告用户
- 建议清理既有 worktree 或降低 `max_concurrent`
- 不阻行——用户可自行承担风险续行

### 1.6 写基线至磁盘（CP-1）

**强制检查点。** 向用户展示结果前，将含基线度量之初实验日志写入磁盘：

1. 于 `.context/compound-engineering/ce-optimize/<spec-name>/experiment-log.yaml` 创建实验日志文件
2. 包含 `references/experiment-log-schema.yaml` 之所有必填顶层段：`spec`、`run_id`、`started_at`、`baseline`、`experiments`、`best`
3. 以空数组植 `experiments`，自基线快照植 `best`（用 `iteration: 0`、基线度量、及基线 judge 分数若有），使后续阶段有有效之当前最优状态可比较
4. 可选于此亦植 `hypothesis_backlog: []` 使日志结构于 Phase 2 填充前即稳定
5. **验证**：回读文件确认必填段存在且基线值匹配
6. 后方展示结果予用户

### 1.7 用户批准关卡

以平台提问工具展示：

- **基线度量**：所有关卡值、诊断值、及 judge 分数（若适用）
- **实验日志位置**：展示文件路径使用户知结果存于何处
- **并行就绪**：探针结果、任何阻碍、已施缓解
- **清净树状态**：已确认清净
- **Worktree 预算**：当前计数与预计用量
- **Judge 预算**：估计每实验 judge 成本与配置之 `max_total_cost_usd` 上限（或明确注明支出无上限）

**选项：**
1. **续行** — 批准基线与并行配置，进 Phase 2
2. **调整规格** — 续行前修改规格设定
3. **修正问题** — 用户需先解决阻碍

用户明确批准前勿进 Phase 2。

若 primary type 为 `judge` 且 `max_total_cost_usd` 为 null，标示为无上限支出并要求明确批准方续行。

**状态重读：** 关卡批准后，自磁盘重读规格与基线。勿携带过时之内存值前进。

---

## Phase 2：假设生成

### 2.1 分析当前方法

读 `scope.mutable` 内代码以理解：
- 当前实现方法
- 明显之改进机会
- 组件间之约束与依赖

若范围大或不熟悉，可选分派 `research:ce-repo-research-analyst` 作更深层码库分析。

### 2.2 生成假设列表

生成初始假设集。每假设当有：
- **描述**：尝试何物
- **类别**：标准类别之一（signal-extraction、graph-signals、embedding、algorithm、preprocessing、parameter-tuning、architecture、data-handling）或领域特定类别
- **优先级**：高、中、低，基于预期影响与可行性
- **所需依赖**：任何新包或工具

若有用户提供之假设亦纳入。

初始储备以 10-30 假设为目标。循环中可据学习生成更多。

### 2.3 依赖预批准

收集所有假设之唯一新依赖。

若有假设需新依赖：
1. 以平台提问工具展示完整依赖列表予用户
2. 请求批量批准
3. 标每假设之 `dep_status` 为 `approved` 或 `needs_approval`

未批准依赖之假设留于储备中但批量选取时跳过。收尾时重新呈现以求可能之批准。

### 2.4 记录假设储备（CP-2）

**强制检查点。** 写初始储备至实验日志文件并验证：
```yaml
hypothesis_backlog:
  - description: "Remove template boilerplate before embedding"
    category: "signal-extraction"
    priority: high
    dep_status: approved
    required_deps: []
  - description: "Try HDBSCAN clustering algorithm"
    category: "algorithm"
    priority: medium
    dep_status: needs_approval
    required_deps: ["scikit-learn"]
```

---

## Phase 3：优化循环

此阶段以批量重复迄于停止准则满足。

### 3.1 批量选取

为本批选假设：
- 排除 `dep_status: needs_approval` 之假设以建可运行储备
- 若 `execution.mode` 为 `serial`，强制 `batch_size = 1`
- 否则 `batch_size = min(runnable_backlog_size, execution.max_concurrent)`
- 偏好多样性：尽可能选不同类别
- 同类中按优先级选（高先）

若储备空且无新假设可生成，进 Phase 4（收尾）。
若储备非空但无可运行假设（皆需批准或受阻），进 Phase 4 使用户可批准依赖，而非无限空转。

### 3.2 分派实验

批量中每假设，按 `execution.mode` 分派。`serial` 模式中，恰好运行一实验至完成方选下一假设。`parallel` 模式中，并发分派全批。

**Worktree 后端：**
1. 创建实验 worktree：
   ```bash
   WORKTREE_PATH=$(bash scripts/experiment-worktree.sh create "<spec_name>" <exp_index> "optimize/<spec_name>" <shared_files...>)  # creates optimize-exp/<spec_name>/exp-<NNN>
   ```
2. 若已配置，施端口参数化（为度量脚本设环境变量）
3. 填充实验提示词模板（`references/experiment-prompt-template.md`）：
   - 迭代号、规格名
   - 假设描述与类别
   - 当前最优与基线度量
   - 可变与不可变范围
   - 约束与已批准依赖
   - 最近 10 实验之滑动窗口（精简摘要）
4. 以填充之提示词分派子代理，于实验 worktree 中工作

**Codex 后端：**
1. 检查环境守卫——若已在 Codex sandbox 内则不分派：
   ```bash
   # If these exist, we're already in Codex -- fall back to subagent
   test -n "${CODEX_SANDBOX:-}" || test -n "${CODEX_SESSION_ID:-}" || test ! -w .git
   ```
2. 填充实验提示词模板
3. 将填充之提示词写入临时文件
4. 透过 Codex 分派：
   ```bash
   cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1
   ```
5. 安全姿态：用用户之选择（若规格未设则每会话问一次）

### 3.3 收集与持久化结果

实验完成即处理——勿候整批完成方写结果。

每完成之实验，**立即**：

1. **于实验 worktree 中运行度量**：
   ```bash
   bash scripts/measure.sh "<measurement.command>" <timeout_seconds> "<worktree_path>/<measurement.working_directory or .>" <env_vars...>
   ```
   - 若稳定性模式为 `repeat`，于该工作目录运行度量线缆 `repeat_count` 次并如 Phase 1 精确聚合结果后评估关卡或排名实验。
   - 以聚合度量为实验之分数；若方差超 `noise_threshold`，记录于学习使操作者知结果有噪声。

2. **写崩溃恢复标记** — 度量后立即于实验 worktree 写 `result.yaml` 含原始度量。此确保度量可恢复，即使代理于更新主日志前崩溃。

3. **读原始 JSON 输出** 自度量脚本

4. **评估退化关卡**：
   - 对 `metric.degenerate_gates` 中每关卡，解析运算子与阈值
   - 比较度量值与阈值
   - 若任何关卡失败：标 outcome 为 `degenerate`，跳过 judge 评估，省钱

5. **若关卡通过且 primary type 为 `judge`**：
   - 读取实验之输出（集群分配、搜索结果等）
   - 按 `metric.judge.stratification` 配置应用分层采样（用 `sample_seed`）
   - 以 `metric.judge.batch_size` 分批分组样本
   - 为每批填充 judge 提示词模板（`references/judge-prompt-template.md`）
   - 分派 `ceil(sample_size / batch_size)` 个并行 judge 子代理
   - 各子代理返还结构化 JSON 分数
   - 汇总分数：计算配置之主 judge 字段（`metric.judge.scoring.primary`，应匹配 `metric.primary.name`）及任何 `scoring.secondary` 值
   - 若 `singleton_sample > 0`：亦分派单例评估子代理

6. **若关卡通过且 primary type 为 `hard`**：
   - 直接自度量输出取度量值

7. **立即追加至磁盘实验日志（CP-3）** — 不推迟至批量评估。立即将实验条目（迭代号、假设、outcome、度量、学习）写入 `.context/compound-engineering/ce-optimize/<spec-name>/experiment-log.yaml`。用过渡性 outcome `measured`，待实验有有效度量但尚未与当前最优比较。于评估步骤更新 outcome 为 `kept`、`reverted` 或其他终态，但原始度量已在磁盘，安全免于脉络压缩。

8. **验证写入（CP-3 验证）** — 自磁盘回读实验日志确认刚写入之条目存在。若验证失败，重试写入。此条目于磁盘确认前勿进下一实验。

**何以立即 + 验证？** 代理之脉络窗口非持久存储。脉络压缩、会话崩溃与重启为长时间运行之常态。若结果仅存于代理记忆中，则已丢失。Karpathy 之 autoresearch 于每次实验后写 `results.tsv`——此技能须对实验日志行同等之事。验证步骤捕获静默写入失败，否则将失数据。

### 3.4 评估批量

批量中所有实验度量完毕后：

1. **排名** 实验按主度量改善：
   - hard 度量：以 `metric.primary.direction` 比较当前最优（`maximize` 意更高为佳，`minimize` 意更低为佳），且须绝对改善超过 `measurement.stability.noise_threshold` 方视为真实胜出
   - judge 度量：比较配置之主 judge 分数（`metric.judge.scoring.primary` / `metric.primary.name`）与当前最优，且须超过 `minimum_improvement`

2. **辨识最佳实验**——通过所有关卡且改善主度量者

3. **若最优改善当前最优：保留**
   - 先提交实验分支使胜出 diff 存为真实提交，先于任何合并或 cherry-pick
   - 仅含可变范围变更于该提交；若无合格 diff，视实验为无改善并回退
   - 将已提交之实验分支合并至优化分支
   - 实验提交信息用 `optimize(<spec-name>): <hypothesis description>`
   - 合并成功后，清理胜出者之实验 worktree 与分支；优化分支上之集成提交为持久产物
   - 此为后续批次之新基线

4. **检查文件不相交之次优者**（至多 `max_runner_up_merges_per_batch` 个）：
   - 对亦有改善之每次优者，检查与保留实验之文件级不相交性
   - **文件级不相交性**：两实验修改完全不同之文件为不相交。同文件 = 重叠，即使不同行。
   - 若不相交：cherry-pick 次优者至新基线，重跑完整度量
   - 若合并度量严格更优：保留 cherry-pick（outcome：`runner_up_kept`），后清理该次优者之实验 worktree 与分支
   - 否则：回退 cherry-pick，记录为"单独有希望但组合中性/有害"（outcome：`runner_up_reverted`），后清理该次优者之实验 worktree 与分支
   - 首次组合失败后停止

5. **处理延期依赖**：需未批准依赖之实验获 outcome `deferred_needs_approval`

6. **回退所有其余**：清理 worktree，记录为 `reverted`

### 3.5 更新状态（CP-4）

**强制检查点。** 至此，个别实验结果已在磁盘（写于步骤 3.3）。此步更新聚合状态并验证。

1. **自磁盘重读实验日志** — 不信任内存状态。日志为真相来源。

2. **终结 outcomes** — 自步骤 3.4 评估更新实验条目（标 `kept`、`reverted`、`runner_up_kept` 等）。立即写此 outcome 更新至磁盘。

3. **更新实验日志中 `best` 段**若发现新最优。写至磁盘。

4. **写策略摘要** 至 `.context/compound-engineering/ce-optimize/<spec-name>/strategy-digest.md`：
   - 迄今尝试之类别（含成功/失败计数）
   - 本批及总体之关键学习
   - 探索前沿：何类别与方法未尝试
   - 当前最优度量与基线改善

5. **据学习生成新假设**：
   - 自磁盘重读策略摘要（非记忆）
   - 读滑动窗口（磁盘日志中最近 10 实验）
   - 不读完整实验日志——用摘要取广域脉络
   - 添新假设至储备并写更新之储备至磁盘

6. **写更新之假设储备至磁盘** — 实验日志之储备段须反映新增假设与已移除（已测）者。

**CP-4 验证：** 自磁盘回读实验日志。确认：(a) 本批所有实验 outcomes 已终结，(b) `best` 段反映当前最优，(c) 假设储备已更新。回读 `strategy-digest.md` 确认其存在。后方向进下一批或停止准则检查。

**检查点：至此，本批所有状态皆在磁盘。若代理崩溃重启，可自实验日志无损恢复。**

### 3.6 检查停止准则

以下任一为真时停止循环：
- **目标达成**：`stopping.target_reached` 为 true，`metric.primary.target` 已设，且主度量据 `metric.primary.direction` 达标（`maximize` 用 `>=`，`minimize` 用 `<=`）
- **最大迭代**：总运行实验数 >= `stopping.max_iterations`
- **最大时数**：Phase 3 开始后墙上时钟时间 >= `stopping.max_hours`
- **Judge 预算耗尽**：累计 judge 支出 >= `metric.judge.max_total_cost_usd`（若已设）
- **平台期**：连续 `stopping.plateau_iterations` 实验无改善
- **手动停止**：用户中断（存状态后进 Phase 4）
- **储备空**：无假设余留且无新者可生成

若无停止准则满足，进下一批（步骤 3.1）。

### 3.7 横切关注

**Codex 失败级联**：追踪连续 Codex 委派失败。3 次连续失败后，自动禁用 Codex 以对剩余实验回退子代理分派。记录切换。

**错误处理**：若实验之度量命令崩溃、超时或产出畸形输出：
- 记录为 outcome `error` 或 `timeout` 含错误讯息
- 回退实验（清理 worktree）
- 循环以批量中剩余实验续行

**进度报告**：每批后报告：
- 第 N 批，估共 M 批（据储备大小）
- 本批及累计实验数
- 当前最优度量与基线改善
- 累计 judge 成本（若适用）

**崩溃恢复**：见持久化纪律段。逐实验 `result.yaml` 标记写于步骤 3.3。个别实验结果于步骤 3.3 立即追加至日志。批量级状态（outcomes、best、digest）写于步骤 3.5。恢复时（Phase 0.4），磁盘上之日志为真相——扫描未反映于日志之 `result.yaml` 标记。

---

## Phase 4：收尾

### 4.1 展示延期假设

若有假设因未批准依赖而延期：
1. 列出及其依赖需求
2. 问用户批准、跳过或留待未来运行
3. 若批准：加至储备并提供重新进入 Phase 3 再行一轮

### 4.2 汇总结果

展示综合摘要：

```
Optimization: <spec-name>
Duration: <wall-clock time>
Total experiments: <count>
  Kept: <count> (including <runner_up_kept_count> runner-up merges)
  Reverted: <count>
  Degenerate: <count>
  Errors: <count>
  Deferred: <count>

Baseline -> Final:
  <primary_metric>: <baseline_value> -> <final_value> (<delta>)
  <gate_metrics>: ...
  <diagnostics>: ...

Judge cost: $<total_judge_cost_usd> (if applicable)

Key improvements:
  1. <kept experiment 1 hypothesis> (+<delta>)
  2. <kept experiment 2 hypothesis> (+<delta>)
  ...
```

### 4.3 保存与后续步骤

优化分支（`optimize/<spec-name>`）保留所有保留实验之提交。
实验日志与策略摘要留存于本地 `.context/...` 暂存空间以供此机器恢复与审查；不随分支移动，因 `.context/` 为 gitignored。

以平台提问工具展示完成后选项：

1. **运行 `/ce-code-review`** 于累计 diff（基线至最终）。以 `mode:autofix` 于优化分支载入 `ce-code-review` 技能。
2. **运行 `/ce-compound`** 将胜出策略记录为机构学习。
3. **创建 PR** 自优化分支至默认分支。
4. **续行** 更多实验：以当前状态重入 Phase 3。先重读状态。
5. **完成** — 留优化分支供人工审查。

### 4.4 清理

清理暂存空间：
```bash
# Keep the experiment log for local resume/audit on this machine
# Remove temporary batch artifacts
rm -f .context/compound-engineering/ce-optimize/<spec-name>/strategy-digest.md
```

若用户可能本地恢复或欲本地审计轨迹，勿删实验日志。若需持久共享产物，清理前摘要或导出结果至受追踪路径。
勿删仍被引用之实验 worktree。
