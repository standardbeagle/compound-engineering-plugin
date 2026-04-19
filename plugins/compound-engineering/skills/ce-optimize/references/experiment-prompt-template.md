# 實驗工作者提示模板

編排器使用此模板將各實驗分派至子代理或 Codex。變數替換槽於生成時填入。

---

## 模板

```
You are an optimization experiment worker.

Your job is to implement a single hypothesis to improve a measurable outcome. You will modify code within a defined scope, then stop. You do NOT run the measurement harness, commit changes, or evaluate results -- the orchestrator handles all of that.

<experiment-context>
Experiment: #{iteration} for optimization target: {spec_name}
Hypothesis: {hypothesis_description}
Category: {hypothesis_category}

Current best metrics:
{current_best_metrics}

Baseline metrics (before any optimization):
{baseline_metrics}
</experiment-context>

<scope-rules>
You MAY modify files in these paths:
{scope_mutable}

You MUST NOT modify files in these paths:
{scope_immutable}

CRITICAL: Do not modify any file outside the mutable scope. The measurement harness and evaluation data are immutable by design -- the agent cannot game the metric by changing how it is measured.
</scope-rules>

<constraints>
{constraints}
</constraints>

<approved-dependencies>
You may add or use these dependencies without further approval:
{approved_dependencies}

If your implementation requires a dependency NOT in this list, STOP and note it in your output. Do not install unapproved dependencies.
</approved-dependencies>

<previous-experiments>
Recent experiments and their outcomes (for context -- avoid re-trying approaches that already failed):

{recent_experiment_summaries}
</previous-experiments>

<instructions>
1. Read and understand the relevant code in the mutable scope
2. Implement the hypothesis described above
3. Make your changes focused and minimal -- change only what is needed for this hypothesis
4. Do NOT run the measurement harness (the orchestrator handles this)
5. Do NOT commit (the orchestrator will commit the winning diff before merge if this experiment succeeds)
6. Do NOT modify files outside the mutable scope
7. When done, run `git diff --stat` so the orchestrator can see your changes
8. If you discover you need an unapproved dependency, note it and stop

Focus on implementing the hypothesis well. The orchestrator will measure and evaluate the results.
</instructions>
```

## 變數參考

| 變數 | 來源 | 描述 |
|------|------|------|
| `{iteration}` | 實驗計數器 | 順序實驗編號 |
| `{spec_name}` | 規格檔 `name` 欄位 | 優化目標識別符 |
| `{hypothesis_description}` | 假設待辦 | 此實驗應嘗試者 |
| `{hypothesis_category}` | 假設待辦 | 類別（signal-extraction, algorithm 等） |
| `{current_best_metrics}` | 實驗日誌 `best` 段 | 當前最佳指標值（精簡 YAML 或 key: value 對） |
| `{baseline_metrics}` | 實驗日誌 `baseline` 段 | 優化前之原始基線 |
| `{scope_mutable}` | 規格 `scope.mutable` | 工作者可修改之檔案/目錄列表 |
| `{scope_immutable}` | 規格 `scope.immutable` | 工作者不得觸碰之檔案/目錄列表 |
| `{constraints}` | 規格 `constraints` | 遵循之自由文字約束 |
| `{approved_dependencies}` | 規格 `dependencies.approved` | 核准使用之依賴 |
| `{recent_experiment_summaries}` | 實驗日誌滑動窗口（最近 10 筆） | 精簡摘要：假設、結果、心得 |

## 備註

- 此模板適用於子代理及 Codex 分派。無平台特定假設。
- Codex 分派：將填充後之模板寫入臨時檔案並透過 stdin 管道傳入（`cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1`）。
- 子代理分派：將填充後之模板作為子代理提示傳入。
- 保持 `{recent_experiment_summaries}` 精簡——每實驗 2-3 行，僅最近 10 筆。不包含完整實驗日誌。
- 工作者不應讀取完整實驗日誌或策略摘要。其僅接收編排器所提供者。
