# DSPy.rb 可觀察性

DSPy.rb提供基於OpenTelemetry之事件驅動可觀察性系統。取代monkey-patching，採結構化事件發射、可插拔監聽器、自動span建立與非阻塞Langfuse匯出。

## 事件系統

### 發射事件

以`DSPy.event`發射結構化事件：

```ruby
DSPy.event('lm.tokens', {
  'gen_ai.system' => 'openai',
  'gen_ai.request.model' => 'gpt-4',
  input_tokens: 150,
  output_tokens: 50,
  total_tokens: 200
})
```

事件名稱為**字串**，以點分隔命名空間（如`'llm.generate'`、`'react.iteration_complete'`）。勿用符號。

屬性須可JSON序列化。DSPy自動合併上下文（trace ID、module stack）並建立OpenTelemetry span。

### 全域訂閱

以`DSPy.events.subscribe`跨整個應用訂閱：

```ruby
subscription_id = DSPy.events.subscribe('lm.tokens') do |event_name, attrs|
  puts "Tokens used: #{attrs[:total_tokens]}"
end

DSPy.events.subscribe('llm.*') do |event_name, attrs|
  track_llm_usage(attrs)
end

DSPy.events.subscribe('*') do |event_name, attrs|
  log_everything(event_name, attrs)
end
```

全域訂閱用於跨切關注：可觀察性匯出器（Langfuse、Datadog）、集中日誌、指標收集。

### Module域訂閱

於`DSPy::Module`子類別內宣告監聽器。訂閱自動限域於module實例及其後代：

```ruby
class ResearchReport < DSPy::Module
  subscribe 'lm.tokens', :track_tokens, scope: :descendants

  def initialize
    super
    @outliner = DSPy::Predict.new(OutlineSignature)
    @writer   = DSPy::Predict.new(SectionWriterSignature)
    @token_count = 0
  end

  def forward(question:)
    outline = @outliner.call(question: question)
    outline.sections.map do |title|
      draft = @writer.call(question: question, section_title: title)
      { title: title, body: draft.paragraph }
    end
  end

  def track_tokens(_event, attrs)
    @token_count += attrs.fetch(:total_tokens, 0)
  end
end
```

`scope:`參數接受：
- `:descendants`（預設）— 接收module及**所有**巢狀module所發事件。
- `DSPy::Module::SubcriptionScope::SelfOnly` — 僅限module實例自身發出之事件；忽略後代。

以`registered_module_subscriptions`檢查。以`unsubscribe_module_events`拆除。

### 取消訂閱與清理

以訂閱ID移除全域監聽器：

```ruby
id = DSPy.events.subscribe('llm.*') { |name, attrs| }
DSPy.events.unsubscribe(id)
```

建構追蹤器類別管理自身訂閱生命週期：

```ruby
class TokenBudgetTracker
  def initialize(budget:)
    @budget = budget
    @usage  = 0
    @subscriptions = []
    @subscriptions << DSPy.events.subscribe('lm.tokens') do |_event, attrs|
      @usage += attrs.fetch(:total_tokens, 0)
      warn("Budget hit") if @usage >= @budget
    end
  end

  def unsubscribe
    @subscriptions.each { |id| DSPy.events.unsubscribe(id) }
    @subscriptions.clear
  end
end
```

### 測試中清除監聽器

於`before`/`after`區塊呼叫`DSPy.events.clear_listeners`以防跨測試污染：

```ruby
RSpec.configure do |config|
  config.after(:each) { DSPy.events.clear_listeners }
end
```

## dspy-o11y Gems

三gem組成可觀察性棧：

| Gem | 用途 |
|---|---|
| `dspy` | 核心事件匯流排（`DSPy.event`、`DSPy.events`）— 恆可用 |
| `dspy-o11y` | OpenTelemetry span、`AsyncSpanProcessor`、`DSPy::Context.with_span`輔助 |
| `dspy-o11y-langfuse` | Langfuse適配器 — 配置OTLP匯出器指向Langfuse端點 |

### 安裝

```ruby
# Gemfile
gem 'dspy'
gem 'dspy-o11y'           # core spans + helpers
gem 'dspy-o11y-langfuse'  # Langfuse/OpenTelemetry adapter (optional)
```

可選gem缺時，DSPy退回僅日誌模式，無錯誤。

## Langfuse整合

### 環境變數

```bash
export LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
export LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
export LANGFUSE_HOST=https://us.cloud.langfuse.com

export DSPY_TELEMETRY_BATCH_SIZE=100
export DSPY_TELEMETRY_QUEUE_SIZE=1000
export DSPY_TELEMETRY_EXPORT_INTERVAL=60
export DSPY_TELEMETRY_SHUTDOWN_TIMEOUT=10
```

### 自動配置

啟動時呼叫`DSPy::Observability.configure!`一次（`require 'dspy'`且Langfuse環境變數存在時自動執行）：

```ruby
require 'dspy'
# 自動配置：OTLP匯出器、結構化日誌+OTel span、匯出至Langfuse、缺gem時優雅退化
```

以`DSPy::Observability.enabled?`驗證狀態。

### 自動追蹤

可觀察性啟用後，每次`DSPy::Module#forward`呼叫、LM請求與工具調用皆建立正確巢狀span。Langfuse接收層級追蹤：

```
Trace: abc-123-def
+-- ChainOfThought.forward [2000ms]  (observation type: chain)
    +-- llm.generate [1000ms]        (observation type: generation)
        Model: gpt-4-0613
        Tokens: 100 in / 50 out / 150 total
```

DSPy經`DSPy::ObservationType.for_module_class`自動映射module類別至Langfuse觀察類型：

| Module | 觀察類型 |
|---|---|
| `DSPy::LM` (raw chat) | `generation` |
| `DSPy::ChainOfThought` | `chain` |
| `DSPy::ReAct` | `agent` |
| Tool invocations | `tool` |
| Memory/retrieval | `retriever` |
| Embedding engines | `embedding` |
| Evaluation modules | `evaluator` |
| Generic operations | `span` |

## 評分報告

### DSPy.score API

以`DSPy.score`報告評估分數：

```ruby
DSPy.score('accuracy', 0.95)
DSPy.score('relevance', 0.87, comment: 'High semantic similarity')
DSPy.score('is_valid', 1, data_type: DSPy::Scores::DataType::Boolean)
DSPy.score('sentiment', 'positive', data_type: DSPy::Scores::DataType::Categorical)
DSPy.score('accuracy', 0.95, trace_id: 'custom-trace-id')
```

可用資料型別：`DSPy::Scores::DataType::Numeric`、`::Boolean`、`::Categorical`。

### score.create事件

每次`DSPy.score`呼叫發射`'score.create'`事件。訂閱以反應：

```ruby
DSPy.events.subscribe('score.create') do |event_name, attrs|
  puts "#{attrs[:score_name]} = #{attrs[:score_value]}"
end
```

### 以DSPy::Scores::Exporter非同步匯出Langfuse

```ruby
exporter = DSPy::Scores::Exporter.configure(
  public_key: ENV['LANGFUSE_PUBLIC_KEY'],
  secret_key: ENV['LANGFUSE_SECRET_KEY'],
  host: 'https://cloud.langfuse.com'
)

DSPy.score('accuracy', 0.95)
exporter.shutdown
```

匯出器內部訂閱`'score.create'`事件，排隊非同步處理，失敗時指數退避重試。

### 以DSPy::Evals自動匯出

傳`export_scores: true`給`DSPy::Evals`以自動匯出每範例分數與彙總批次分數：

```ruby
evaluator = DSPy::Evals.new(
  program,
  metric: my_metric,
  export_scores: true,
  score_name: 'qa_accuracy'
)

result = evaluator.evaluate(test_examples)
```

## DSPy::Context.with_span

為自訂操作建立手動span。需`dspy-o11y`。

```ruby
DSPy::Context.with_span(operation: 'custom.retrieval', 'retrieval.source' => 'pinecone') do |span|
  results = pinecone_client.query(embedding)
  span&.set_attribute('retrieval.count', results.size) if span
  results
end
```

關鍵字引數附`operation:`傳遞語意屬性。區塊接收OpenTelemetry span物件（可觀察性停用時為`nil`）。span自動巢狀於當前父span下，記錄`duration.ms`、`langfuse.observation.startTime`與`langfuse.observation.endTime`。

指定Langfuse觀察類型：

```ruby
DSPy::Context.with_span(
  operation: 'evaluate.batch',
  **DSPy::ObservationType::Evaluator.langfuse_attributes,
  'batch.size' => examples.length
) do |span|
  run_evaluation(examples)
end
```

`with_span`區塊內回報之分數自動繼承當前trace上下文。

## Module Stack元資料

`DSPy::Module#forward`運行時，上下文層維護module stack。每事件含：

```ruby
{
  module_path: [
    { id: "root_uuid",    class: "DeepSearch",    label: nil },
    { id: "planner_uuid", class: "DSPy::Predict", label: "planner" }
  ],
  module_root: { id: "root_uuid", class: "DeepSearch", label: nil },
  module_leaf: { id: "planner_uuid", class: "DSPy::Predict", label: "planner" },
  module_scope: {
    ancestry_token: "root_uuid>planner_uuid",
    depth: 2
  }
}
```

| 鍵 | 意義 |
|---|---|
| `module_path` | 由根至葉之`{id, class, label}`有序陣列 |
| `module_root` | 當前呼叫鏈最外層module |
| `module_leaf` | 當前呼叫鏈最內層（正執行中）module |
| `module_scope.ancestry_token` | UUID連接之穩定字串代表巢狀路徑 |
| `module_scope.depth` | 當前module在stack中之整數深度 |

標籤以`module_scope_label=`設定於module實例或自命名predictor自動推導。用以驅動Langfuse篩選、域限指標或自訂事件路由。

## 專屬匯出Worker

`DSPy::Observability::AsyncSpanProcessor`（出自`dspy-o11y`）將遙測匯出排除於熱路徑外：

- 運行於`Concurrent::SingleThreadExecutor` — LLM工作流不與OTLP網路競爭。
- 以`Thread::Queue`緩衝已完成span（最大佇列經`DSPY_TELEMETRY_QUEUE_SIZE`配置）。
- 以`DSPY_TELEMETRY_BATCH_SIZE`（預設100）批次排乾。佇列達批次大小時立即非同步匯出。
- 背景計時器每`DSPY_TELEMETRY_EXPORT_INTERVAL`秒（預設60）觸發週期匯出。
- 匯出失敗時指數退避（`0.1 * 2^attempt`秒），最多`DEFAULT_MAX_RETRIES`（3）次。
- 關閉時於`DSPY_TELEMETRY_SHUTDOWN_TIMEOUT`秒內排乾所有剩餘span。
- 佇列滿時丟棄最舊span，日誌記錄`'observability.span_dropped'`。

應用程式碼不直接與processor互動。全經環境變數配置。

## 內建事件參考

| 事件名稱 | 發射者 | 關鍵屬性 |
|---|---|---|
| `lm.tokens` | `DSPy::LM` | `gen_ai.system`, `gen_ai.request.model`, `input_tokens`, `output_tokens`, `total_tokens` |
| `chain_of_thought.reasoning_complete` | `DSPy::ChainOfThought` | `dspy.signature`, `cot.reasoning_steps`, `cot.reasoning_length`, `cot.has_reasoning` |
| `react.iteration_complete` | `DSPy::ReAct` | `iteration`, `thought`, `action`, `observation` |
| `codeact.iteration_complete` | `dspy-code_act` gem | `iteration`, `code_executed`, `execution_result` |
| `optimization.trial_complete` | Teleprompters (MIPROv2) | `trial_number`, `score` |
| `score.create` | `DSPy.score` | `score_name`, `score_value`, `score_data_type`, `trace_id` |
| `span.start` | `DSPy::Context.with_span` | `trace_id`, `span_id`, `parent_span_id`, `operation` |

## 要訣

- 事件名用點分隔字串。LLM屬性依OpenTelemetry `gen_ai.*`慣例。
- 追蹤器不再需要時恆呼叫`unsubscribe`以防記憶體洩漏。
- 測試拆卸中呼叫`DSPy.events.clear_listeners`以免跨污染。
- 風險監聽器邏輯包於rescue區塊。事件系統隔離監聽器失敗，但顯式rescue防領域錯誤靜默吞沒。
- module內部偏好module域`subscribe`。全域`DSPy.events.subscribe`保留予基礎設施層關注。
