# DSPy.rb 最佳化

## MIPROv2

MIPROv2（Multi-prompt Instruction Proposal with Retrieval Optimization）為DSPy.rb主要指令調校器。為每predictor提案新指令與few-shot範例，於mini-batch上評估，保留改善指標之候選。以獨立gem發布以避免不需要之高斯過程依賴樹。

### 安裝

```ruby
# Gemfile
gem "dspy"
gem "dspy-miprov2"
```

Bundler自動require`dspy/miprov2`。無需額外`require`。

### AutoMode預設

以`DSPy::Teleprompt::MIPROv2::AutoMode`使用預配置最佳化器：

```ruby
light  = DSPy::Teleprompt::MIPROv2::AutoMode.light(metric: metric)   # 6 trials, greedy
medium = DSPy::Teleprompt::MIPROv2::AutoMode.medium(metric: metric)  # 12 trials, adaptive
heavy  = DSPy::Teleprompt::MIPROv2::AutoMode.heavy(metric: metric)   # 18 trials, Bayesian
```

| 預設 | 試驗數 | 策略 | 適用情境 |
|------|--------|------|----------|
| `light` | 6 | `:greedy` | 小資料集或原型開發之快速增益 |
| `medium` | 12 | `:adaptive` | 大多數試驗之平衡探索與運行時 |
| `heavy` | 18 | `:bayesian` | 最高準確度目標或多階段程式 |

### 以dry-configurable手動配置

`DSPy::Teleprompt::MIPROv2`含`Dry::Configurable`。於類別層級（所有實例預設）或實例層級（覆寫類別預設）配置。

**類別層級預設：**

```ruby
DSPy::Teleprompt::MIPROv2.configure do |config|
  config.optimization_strategy = :bayesian
  config.num_trials = 30
  config.bootstrap_sets = 10
end
```

**實例層級覆寫：**

```ruby
optimizer = DSPy::Teleprompt::MIPROv2.new(metric: metric)
optimizer.configure do |config|
  config.num_trials = 15
  config.num_instruction_candidates = 6
  config.bootstrap_sets = 5
  config.max_bootstrapped_examples = 4
  config.max_labeled_examples = 16
  config.optimization_strategy = :adaptive
  config.early_stopping_patience = 3
  config.init_temperature = 1.0
  config.final_temperature = 0.1
  config.minibatch_size = nil
  config.auto_seed = 42
end
```

`optimization_strategy`接受符號（`:greedy`、`:adaptive`、`:bayesian`），內部強制轉為`DSPy::Teleprompt::OptimizationStrategy` T::Enum值。

舊`config:`建構子參數已移除。傳`config:`拋`ArgumentError`。

### 經configure設自動預設

```ruby
optimizer = DSPy::Teleprompt::MIPROv2.new(metric: metric)
optimizer.configure do |config|
  config.auto_preset = DSPy::Teleprompt::AutoPreset.deserialize("medium")
end
```

### 編譯與檢查

```ruby
program = DSPy::Predict.new(MySignature)

result = optimizer.compile(
  program,
  trainset: train_examples,
  valset: val_examples
)

optimized_program = result.optimized_program
puts "Best score: #{result.best_score_value}"
```

`result`物件暴露：
- `optimized_program` — 可用之predictor，含更新指令與範例
- `optimization_trace[:trial_logs]` — 每試驗之指令、範例與分數紀錄
- `metadata[:optimizer]` — `"MIPROv2"`

### 多階段程式

MIPROv2為每predictor生成資料集摘要並提出各階段指令。對含`thought_generator`與`observation_processor` predictor之ReAct代理，最佳化器內部處理功勞歸屬。指標僅需評估最終輸出。

### Bootstrap抽樣

Bootstrap階段MIPROv2：
1. 自訓練集生成資料集摘要
2. 運行基線程式bootstrap few-shot範例
3. 依摘要與bootstrap範例提出候選指令
4. 於驗證集之mini-batch上評估每候選

以`bootstrap_sets`、`max_bootstrapped_examples`與`max_labeled_examples`控制bootstrap階段。

### 貝氏最佳化

`optimization_strategy`為`:bayesian`（或用`heavy`預設）時，MIPROv2以高斯過程代理模型擬合歷史試驗分數以選擇下一候選。以有據探索取代隨機搜尋，減少找到高分指令所需試驗數。

---

## GEPA

GEPA（Genetic-Pareto Reflective Prompt Evolution）為反饋驅動最佳化器。於小批次運行程式、收集分數與文字反饋、請求反思LM重寫指令。改善候選保留於Pareto前沿。

### 安裝

```ruby
# Gemfile
gem "dspy"
gem "dspy-gepa"
```

`dspy-gepa` gem自動依賴`gepa`核心最佳化器gem。

### 指標合約

GEPA指標回傳`DSPy::Prediction`含數值分數與反饋字串。勿回傳純布林值。

```ruby
metric = lambda do |example, prediction|
  expected  = example.expected_values[:label]
  predicted = prediction.label

  score = predicted == expected ? 1.0 : 0.0
  feedback = if score == 1.0
    "Correct (#{expected}) for: \"#{example.input_values[:text][0..60]}\""
  else
    "Misclassified (expected #{expected}, got #{predicted}) for: \"#{example.input_values[:text][0..60]}\""
  end

  DSPy::Prediction.new(score: score, feedback: feedback)
end
```

分數保持在`[0, 1]`。恆附簡短反饋訊息說明所生 — GEPA將此文字傳予反思模型以推理失敗。

### 反饋映射

`feedback_map`定位組合module內之個別predictor。每項接收關鍵字引數並回傳`DSPy::Prediction`：

```ruby
feedback_map = {
  'self' => lambda do |predictor_output:, predictor_inputs:, module_inputs:, module_outputs:, captured_trace:|
    expected  = module_inputs.expected_values[:label]
    predicted = predictor_output.label

    DSPy::Prediction.new(
      score: predicted == expected ? 1.0 : 0.0,
      feedback: "Classifier saw \"#{predictor_inputs[:text][0..80]}\" -> #{predicted} (expected #{expected})"
    )
  end
}
```

單predictor程式以`'self'`為鍵。多predictor鏈加各組件項使反思LM見各步之在地上下文。頂層指標已涵蓋基礎時可完全省略`feedback_map`。

### 配置teleprompter

```ruby
teleprompter = DSPy::Teleprompt::GEPA.new(
  metric: metric,
  reflection_lm: DSPy::ReflectionLM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY']),
  feedback_map: feedback_map,
  config: {
    max_metric_calls: 600,
    minibatch_size: 6,
    skip_perfect_score: false
  }
)
```

關鍵配置旋鈕：

| 旋鈕 | 用途 |
|------|------|
| `max_metric_calls` | 評估呼叫硬預算。至少設驗證集大小加幾個minibatch |
| `minibatch_size` | 每反思重放批次之範例數。更小=更便宜迭代、更吵分數 |
| `skip_perfect_score` | 設`true`候選達分數`1.0`時提前停止 |

### Minibatch大小選擇

| 目標 | 建議大小 | 理由 |
|------|----------|------|
| 緊預算內探索多候選 | 3--6 | 便宜迭代、更多prompt變體、較吵指標 |
| 每次rollout昂貴時穩定指標 | 8--12 | 更平滑分數、更少候選（除非提高預算） |
| 調查特定失敗模式 | 先3--4再8+ | 先廣後深 |

### 編譯與評估

```ruby
program = DSPy::Predict.new(MySignature)

result = teleprompter.compile(program, trainset: train, valset: val)
optimized_program = result.optimized_program

test_metrics = evaluate(optimized_program, test)
```

`result`物件暴露：
- `optimized_program` — 含更新指令與few-shot範例之predictor
- `best_score_value` — 最佳候選之驗證分數
- `metadata` — 候選計數、追蹤hash與遙測ID

### 反思LM

以任何接受反思prompt hash並回傳字串之可呼叫物件替換`DSPy::ReflectionLM`。預設反思signature自回應中三反引號間提取新指令。

### 實驗追蹤

插`GEPA::Logging::ExperimentTracker`至持久層：

```ruby
tracker = GEPA::Logging::ExperimentTracker.new
tracker.with_subscriber { |event| MyModel.create!(payload: event) }

teleprompter = DSPy::Teleprompt::GEPA.new(
  metric: metric,
  reflection_lm: reflection_lm,
  experiment_tracker: tracker,
  config: { max_metric_calls: 900 }
)
```

追蹤器以JSONL發射Pareto更新事件、合併決策與候選演化紀錄。

### Pareto前沿

GEPA維護多樣候選池並自Pareto前沿取樣而非僅變異最高分程式。平衡探索並防搜尋坍縮至單一譜系。

多個強譜系浮現後啟用合併提案者：

```ruby
config: {
  max_metric_calls: 900,
  enable_merge_proposer: true
}
```

過早合併耗預算而無實質增益。先有數個驗證候選後再開啟。

### 進階選項

- `acceptance_strategy:` — 插入客製Pareto篩選或提前停止啟發式。
- 遙測span經`GEPA::Telemetry`發射。以`DSPy.configure { |c| c.observability = true }`啟用全域可觀察性以串流span至OpenTelemetry匯出器。

---

## 評估框架

`DSPy::Evals`以內建與自訂指標對predictor做批次評估。

### 基本用法

```ruby
metric = proc do |example, prediction|
  prediction.answer == example.expected_values[:answer]
end

evaluator = DSPy::Evals.new(predictor, metric: metric)

result = evaluator.evaluate(
  test_examples,
  display_table: true,
  display_progress: true
)

puts "Pass rate: #{(result.pass_rate * 100).round(1)}%"
puts "Passed: #{result.passed_examples}/#{result.total_examples}"
```

### DSPy::Example

先將原始資料轉為`DSPy::Example`實例再傳予最佳化器或評估器。每範例含`input_values`與`expected_values`：

```ruby
examples = rows.map do |row|
  DSPy::Example.new(
    input_values: { text: row[:text] },
    expected_values: { label: row[:label] }
  )
end

train, val, test = split_examples(examples, train_ratio: 0.6, val_ratio: 0.2, seed: 42)
```

自最佳化迴圈扣留測試集。最佳化器處理train/val；僅測試集證明泛化。

### 內建指標

```ruby
metric = DSPy::Metrics.exact_match(field: :answer, case_sensitive: true)
metric = DSPy::Metrics.contains(field: :answer, case_sensitive: false)
metric = DSPy::Metrics.numeric_difference(field: :answer, tolerance: 0.01)
metric = DSPy::Metrics.composite_and(
  DSPy::Metrics.exact_match(field: :answer),
  DSPy::Metrics.contains(field: :reasoning)
)
```

### 自訂指標

```ruby
quality_metric = lambda do |example, prediction|
  return false unless prediction

  score = 0.0
  score += 0.5 if prediction.answer == example.expected_values[:answer]
  score += 0.3 if prediction.explanation && prediction.explanation.length > 50
  score += 0.2 if prediction.confidence && prediction.confidence > 0.8
  score >= 0.7
end

evaluator = DSPy::Evals.new(predictor, metric: quality_metric)
```

以點記法存取預測欄位（`prediction.answer`），非hash記法。

### 可觀察性掛鉤

不編輯評估器即可註冊回呼：

```ruby
DSPy::Evals.before_example do |payload|
  example = payload[:example]
  DSPy.logger.info("Evaluating example #{example.id}") if example.respond_to?(:id)
end

DSPy::Evals.after_batch do |payload|
  result = payload[:result]
  Langfuse.event(
    name: 'eval.batch',
    metadata: {
      total: result.total_examples,
      passed: result.passed_examples,
      score: result.score
    }
  )
end
```

可用掛鉤：`before_example`、`after_example`、`before_batch`、`after_batch`。

### Langfuse分數匯出

啟用`export_scores: true`以發射`score.create`事件：

```ruby
evaluator = DSPy::Evals.new(
  predictor,
  metric: metric,
  export_scores: true,
  score_name: 'qa_accuracy'
)

result = evaluator.evaluate(test_examples)
```

分數自動附著於當前trace上下文並非同步流向Langfuse。

### 評估結果

```ruby
result = evaluator.evaluate(test_examples)

result.score
result.passed_count
result.failed_count
result.error_count

result.results.each do |r|
  r.passed
  r.score
  r.error
end
```

### 與最佳化器整合

```ruby
metric = proc do |example, prediction|
  expected  = example.expected_values[:answer].to_s.strip.downcase
  predicted = prediction.answer.to_s.strip.downcase
  !expected.empty? && predicted.include?(expected)
end

optimizer = DSPy::Teleprompt::MIPROv2::AutoMode.medium(metric: metric)

result = optimizer.compile(
  DSPy::Predict.new(QASignature),
  trainset: train_examples,
  valset: val_examples
)

evaluator = DSPy::Evals.new(result.optimized_program, metric: metric)
test_result = evaluator.evaluate(test_examples, display_table: true)
puts "Test accuracy: #{(test_result.pass_rate * 100).round(2)}%"
```

---

## 儲存系統

`DSPy::Storage`持久化最佳化結果、追蹤歷史並管理多版最佳化程式。

### ProgramStorage（低階）

```ruby
storage = DSPy::Storage::ProgramStorage.new(storage_path: "./dspy_storage")

saved = storage.save_program(
  result.optimized_program,
  result,
  metadata: {
    signature_class: 'ClassifyText',
    optimizer: 'MIPROv2',
    examples_count: examples.size
  }
)
puts "Stored with ID: #{saved.program_id}"

saved = storage.load_program(program_id)
predictor = saved.program
score = saved.optimization_result[:best_score_value]

storage.list_programs.each do |p|
  puts "#{p[:program_id]} -- score: #{p[:best_score]} -- saved: #{p[:saved_at]}"
end
```

### StorageManager（推薦）

```ruby
manager = DSPy::Storage::StorageManager.new

saved = manager.save_optimization_result(
  result,
  tags: ['production', 'sentiment-analysis'],
  description: 'Optimized sentiment classifier v2'
)

programs = manager.find_programs(
  optimizer: 'MIPROv2',
  min_score: 0.85,
  tags: ['production']
)

recent = manager.find_programs(
  max_age_days: 7,
  signature_class: 'ClassifyText'
)

best = manager.get_best_program('ClassifyText')
predictor = best.program
```

全域簡寫：

```ruby
DSPy::Storage::StorageManager.save(result, metadata: { version: '2.0' })
DSPy::Storage::StorageManager.load(program_id)
DSPy::Storage::StorageManager.best('ClassifyText')
```

### 檢查點

於長時間最佳化中建立與恢復檢查點：

```ruby
manager.create_checkpoint(
  current_result,
  'iteration_50',
  metadata: { iteration: 50, current_score: 0.87 }
)

restored = manager.restore_checkpoint('iteration_50')
program = restored.program

if iteration % 10 == 0
  manager.create_checkpoint(current_result, "auto_checkpoint_#{iteration}")
end
```

### 匯入與匯出

跨環境分享程式：

```ruby
storage = DSPy::Storage::ProgramStorage.new

storage.export_programs(['abc123', 'def456'], './export_backup.json')

imported = storage.import_programs('./export_backup.json')
puts "Imported #{imported.size} programs"
```

### 最佳化歷史

```ruby
history = manager.get_optimization_history

history[:summary][:total_programs]
history[:summary][:avg_score]

history[:optimizer_stats].each do |optimizer, stats|
  puts "#{optimizer}: #{stats[:count]} programs, best: #{stats[:best_score]}"
end

history[:trends][:improvement_percentage]
```

### 程式比較

```ruby
comparison = manager.compare_programs(id_a, id_b)
comparison[:comparison][:score_difference]
comparison[:comparison][:better_program]
comparison[:comparison][:age_difference_hours]
```

### 儲存配置

```ruby
config = DSPy::Storage::StorageManager::StorageConfig.new
config.storage_path = Rails.root.join('dspy_storage')
config.auto_save = true
config.save_intermediate_results = false
config.max_stored_programs = 100

manager = DSPy::Storage::StorageManager.new(config: config)
```

### 清理

移除舊程式。清理以加權分數（70%效能、30%新近度）保留最佳與最新程式：

```ruby
deleted_count = manager.cleanup_old_programs
```

### 儲存事件

儲存系統發射結構化日誌事件：
- `dspy.storage.save_start`、`dspy.storage.save_complete`、`dspy.storage.save_error`
- `dspy.storage.load_start`、`dspy.storage.load_complete`、`dspy.storage.load_error`
- `dspy.storage.delete`、`dspy.storage.export`、`dspy.storage.import`、`dspy.storage.cleanup`

### 檔案佈局

```
dspy_storage/
  programs/
    abc123def456.json
    789xyz012345.json
  history.json
```

---

## API規則

- 以`.call()`呼叫predictors，非`.forward()`。
- 以點記法存取預測欄位（`result.answer`），非hash記法（`result[:answer]`）。
- GEPA指標回傳`DSPy::Prediction.new(score:, feedback:)`，非布林值。
- MIPROv2指標可回傳`true`/`false`、數值分數或`DSPy::Prediction`。
