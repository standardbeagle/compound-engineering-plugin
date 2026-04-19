# DSPy.rb 核心概念

## Signatures

Signatures定義應用程式碼與語言模型間之介面。以Sorbet型別規範輸入、輸出與任務描述，供編譯期與運行期型別安全。

### 結構

```ruby
class ClassifyEmail < DSPy::Signature
  description "Classify customer support emails by urgency and category"

  input do
    const :subject, String
    const :body, String
  end

  output do
    const :category, String
    const :urgency, String
  end
end
```

### 支援型別

| 型別 | JSON Schema | 備註 |
|------|-------------|------|
| `String` | `string` | 必填字串 |
| `Integer` | `integer` | 整數 |
| `Float` | `number` | 浮點數 |
| `T::Boolean` | `boolean` | true/false |
| `T::Array[X]` | `array` | 型別化陣列 |
| `T::Hash[K, V]` | `object` | 型別化鍵值映射 |
| `T.nilable(X)` | nullable | 可選欄位 |
| `Date` | `string` (ISO 8601) | 自動轉換 |
| `DateTime` | `string` (ISO 8601) | 保留時區 |
| `Time` | `string` (ISO 8601) | 轉UTC |

### 日期與時間型別

Date、DateTime、Time欄位序列化為ISO 8601字串，輸出自動轉回Ruby物件。

```ruby
class EventScheduler < DSPy::Signature
  description "Schedule events based on requirements"

  input do
    const :start_date, Date                  # ISO 8601: YYYY-MM-DD
    const :preferred_time, DateTime          # ISO 8601 with timezone
    const :deadline, Time                    # Converted to UTC
    const :end_date, T.nilable(Date)         # Optional date
  end

  output do
    const :scheduled_date, Date              # String from LLM, auto-converted to Date
    const :event_datetime, DateTime          # Preserves timezone info
    const :created_at, Time                  # Converted to UTC
  end
end

predictor = DSPy::Predict.new(EventScheduler)
result = predictor.call(
  start_date: "2024-01-15",
  preferred_time: "2024-01-15T10:30:45Z",
  deadline: Time.now,
  end_date: nil
)

result.scheduled_date.class  # => Date
result.event_datetime.class  # => DateTime
```

時區慣例依ActiveRecord：Time物件轉UTC、DateTime物件保留時區、Date物件不涉時區。

### 以T::Enum列舉

以`T::Enum`類別定義受約束之輸出值。勿用行內`T.enum([...])`語法。

```ruby
class SentimentAnalysis < DSPy::Signature
  description "Analyze sentiment of text"

  class Sentiment < T::Enum
    enums do
      Positive = new('positive')
      Negative = new('negative')
      Neutral = new('neutral')
    end
  end

  input do
    const :text, String
  end

  output do
    const :sentiment, Sentiment
    const :confidence, Float
  end
end

predictor = DSPy::Predict.new(SentimentAnalysis)
result = predictor.call(text: "This product is amazing!")

result.sentiment              # => #<Sentiment::Positive>
result.sentiment.serialize    # => "positive"
result.confidence             # => 0.92
```

列舉匹配不區分大小寫。LLM回傳`"POSITIVE"`匹配`new('positive')`。

### 預設值

預設值適用於輸入與輸出。輸入預設減少呼叫樣板。輸出預設提供LLM省略可選欄位時之後備。

```ruby
class SmartSearch < DSPy::Signature
  description "Search with intelligent defaults"

  input do
    const :query, String
    const :max_results, Integer, default: 10
    const :language, String, default: "English"
  end

  output do
    const :results, T::Array[String]
    const :total_found, Integer
    const :cached, T::Boolean, default: false
  end
end

search = DSPy::Predict.new(SmartSearch)
result = search.call(query: "Ruby programming")
# max_results defaults to 10, language defaults to "English"
# If LLM omits `cached`, it defaults to false
```

### 欄位描述

任何欄位加`description:`以指引LLM。描述出現於送至模型之JSON schema。

```ruby
class ASTNode < T::Struct
  const :node_type, String, description: "The type of AST node (heading, paragraph, code_block)"
  const :text, String, default: "", description: "Text content of the node"
  const :level, Integer, default: 0, description: "Heading level 1-6, only for heading nodes"
  const :children, T::Array[ASTNode], default: []
end

ASTNode.field_descriptions[:node_type]  # => "The type of AST node ..."
ASTNode.field_descriptions[:children]   # => nil (no description set)
```

欄位描述亦適用於signature之`input`與`output`區塊：

```ruby
class ExtractEntities < DSPy::Signature
  description "Extract named entities from text"

  input do
    const :text, String, description: "Raw text to analyze"
    const :language, String, default: "en", description: "ISO 639-1 language code"
  end

  output do
    const :entities, T::Array[String], description: "List of extracted entity names"
    const :count, Integer, description: "Total number of unique entities found"
  end
end
```

### Schema格式

DSPy.rb支援三種schema格式以傳遞型別結構予LLM。

#### JSON Schema（預設）

冗長但通用。以`YourSignature.output_json_schema`存取。

#### BAML Schema

精簡格式，減少schema tokens 80-85%。需`sorbet-baml` gem。

```ruby
DSPy.configure do |c|
  c.lm = DSPy::LM.new('openai/gpt-4o-mini',
    api_key: ENV['OPENAI_API_KEY'],
    schema_format: :baml
  )
end
```

BAML僅適用於Enhanced Prompting模式（`structured_outputs: false`）。`structured_outputs: true`時provider直接接收JSON Schema。

#### TOON Schema + Data Format

表格式文字格式，縮減schema定義與prompt值。

```ruby
DSPy.configure do |c|
  c.lm = DSPy::LM.new('openai/gpt-4o-mini',
    api_key: ENV['OPENAI_API_KEY'],
    schema_format: :toon,
    data_format:   :toon
  )
end
```

`schema_format: :toon`替換系統prompt中之schema區塊。`data_format: :toon`以`toon`圍欄渲染輸入值與輸出模板。僅Enhanced Prompting模式有效。`sorbet-toon` gem自動為依賴。

### 遞迴型別

自引用之struct於生成JSON schema中產生`$defs`項，以`$ref`指標避免無限遞迴。

```ruby
class ASTNode < T::Struct
  const :node_type, String
  const :text, String, default: ""
  const :children, T::Array[ASTNode], default: []
end
```

schema生成器偵測`T::Array[ASTNode]`中之自引用並輸出：

```json
{
  "$defs": {
    "ASTNode": { "type": "object", "properties": { ... } }
  },
  "properties": {
    "children": {
      "type": "array",
      "items": { "$ref": "#/$defs/ASTNode" }
    }
  }
}
```

以`YourSignature.output_json_schema_with_defs`存取含累積定義之schema。

### 以T.any()聯集型別

指定接受多種型別之欄位：

```ruby
output do
  const :result, T.any(Float, String)
end
```

struct聯集時，DSPy.rb自動加`_type`辨別欄位至各struct之JSON schema。LLM回傳`_type`，DSPy轉換hash為正確struct實例。

```ruby
class CreateTask < T::Struct
  const :title, String
  const :priority, String
end

class DeleteTask < T::Struct
  const :task_id, String
  const :reason, T.nilable(String)
end

class TaskRouter < DSPy::Signature
  description "Route user request to the appropriate task action"

  input do
    const :request, String
  end

  output do
    const :action, T.any(CreateTask, DeleteTask)
  end
end

result = DSPy::Predict.new(TaskRouter).call(request: "Create a task for Q4 review")
result.action.class  # => CreateTask
result.action.title  # => "Q4 Review"
```

結果可用模式匹配：

```ruby
case result.action
when CreateTask then puts "Creating: #{result.action.title}"
when DeleteTask then puts "Deleting: #{result.action.task_id}"
end
```

聯集型別亦適用於陣列中之異質集合：

```ruby
output do
  const :events, T::Array[T.any(LoginEvent, PurchaseEvent)]
end
```

聯集限2-4型別以利LLM理解。用清晰struct名稱，因其成為`_type`辨別值。

---

## Modules

Modules為可組合建構塊，包裹predictor。定義`forward`方法；以`.call()`呼叫module。

### 基本結構

```ruby
class SentimentAnalyzer < DSPy::Module
  def initialize
    super
    @predictor = DSPy::Predict.new(SentimentSignature)
  end

  def forward(text:)
    @predictor.call(text: text)
  end
end

analyzer = SentimentAnalyzer.new
result = analyzer.call(text: "I love this product!")

result.sentiment    # => "positive"
result.confidence   # => 0.9
```

**API規則：**
- 以`.call()`呼叫modules與predictors，非`.forward()`。
- 以`result.field`存取結果欄位，非`result[:field]`。

### Module組合

透過`forward`中之顯式方法呼叫組合多個modules：

```ruby
class DocumentProcessor < DSPy::Module
  def initialize
    super
    @classifier = DocumentClassifier.new
    @summarizer = DocumentSummarizer.new
  end

  def forward(document:)
    classification = @classifier.call(content: document)
    summary = @summarizer.call(content: document)

    {
      document_type: classification.document_type,
      summary: summary.summary
    }
  end
end
```

### 生命週期回呼

Modules支援`before`、`after`與`around`回呼於`forward`。以類別級巨集宣告，引用私有方法。

#### 執行順序

1. `before`回呼（依註冊序）
2. `around`回呼（`yield`前）
3. `forward`方法
4. `around`回呼（`yield`後）
5. `after`回呼（依註冊序）

```ruby
class InstrumentedModule < DSPy::Module
  before :setup_metrics
  after :log_metrics
  around :manage_context

  def initialize
    super
    @predictor = DSPy::Predict.new(MySignature)
    @metrics = {}
  end

  def forward(question:)
    @predictor.call(question: question)
  end

  private

  def setup_metrics
    @metrics[:start_time] = Time.now
  end

  def manage_context
    load_context
    result = yield
    save_context
    result
  end

  def log_metrics
    @metrics[:duration] = Time.now - @metrics[:start_time]
  end
end
```

同類型之多回呼依註冊序執行。回呼繼承自父類別；父回呼先執行。

#### Around回呼

Around回呼必須呼叫`yield`以執行包裹方法並回傳結果：

```ruby
def with_retry
  retries = 0
  begin
    yield
  rescue StandardError => e
    retries += 1
    retry if retries < 3
    raise e
  end
end
```

### 指令更新合約

Teleprompters（GEPA、MIPROv2）要求modules暴露不可變更新鉤。引入`DSPy::Mixins::InstructionUpdatable`並實作`with_instruction`與`with_examples`，各回傳新實例：

```ruby
class SentimentPredictor < DSPy::Module
  include DSPy::Mixins::InstructionUpdatable

  def initialize
    super
    @predictor = DSPy::Predict.new(SentimentSignature)
  end

  def with_instruction(instruction)
    clone = self.class.new
    clone.instance_variable_set(:@predictor, @predictor.with_instruction(instruction))
    clone
  end

  def with_examples(examples)
    clone = self.class.new
    clone.instance_variable_set(:@predictor, @predictor.with_examples(examples))
    clone
  end
end
```

若module省略這些鉤，teleprompters拋`DSPy::InstructionUpdateError`而非靜默變更狀態。

---

## Predictors

Predictors為執行引擎，取signature並自語言模型產生結構化結果。DSPy.rb提供四種predictor類型。

### Predict

直接LLM呼叫配型別化輸入/輸出。最快，最少token。

```ruby
classifier = DSPy::Predict.new(ClassifyText)
result = classifier.call(text: "Technical document about APIs")

result.sentiment    # => #<Sentiment::Positive>
result.topics       # => ["APIs", "technical"]
result.confidence   # => 0.92
```

### ChainOfThought

自動添加`reasoning`欄位至輸出。模型先逐步推理再給最終答案。使用ChainOfThought時勿於signature output中定義`:reasoning`欄位。

```ruby
class SolveMathProblem < DSPy::Signature
  description "Solve mathematical word problems step by step"

  input do
    const :problem, String
  end

  output do
    const :answer, String
    # :reasoning is added automatically by ChainOfThought
  end
end

solver = DSPy::ChainOfThought.new(SolveMathProblem)
result = solver.call(problem: "Sarah has 15 apples. She gives 7 away and buys 12 more.")

result.reasoning  # => "Step by step: 15 - 7 = 8, then 8 + 12 = 20"
result.answer     # => "20 apples"
```

用ChainOfThought處理複雜分析、多步推理或需可解釋性之情境。

### ReAct

推理+行動代理，以工具迭代運行。以`DSPy::Tools::Base`子類定義工具。以`DSPy::Tools::Toolset`群組相關工具。

```ruby
class WeatherTool < DSPy::Tools::Base
  extend T::Sig

  tool_name "weather"
  tool_description "Get weather information for a location"

  sig { params(location: String).returns(String) }
  def call(location:)
    { location: location, temperature: 72, condition: "sunny" }.to_json
  end
end

class TravelSignature < DSPy::Signature
  description "Help users plan travel"

  input do
    const :destination, String
  end

  output do
    const :recommendations, String
  end
end

agent = DSPy::ReAct.new(
  TravelSignature,
  tools: [WeatherTool.new],
  max_iterations: 5
)

result = agent.call(destination: "Tokyo, Japan")
result.recommendations  # => "Visit Senso-ji Temple early morning..."
result.history          # => Array of reasoning steps, actions, observations
result.iterations       # => 3
result.tools_used       # => ["weather"]
```

以toolsets自單一類別暴露多個工具方法：

```ruby
text_tools = DSPy::Tools::TextProcessingToolset.to_tools
agent = DSPy::ReAct.new(MySignature, tools: text_tools)
```

### CodeAct

思考-程式碼-觀察代理，合成並執行Ruby程式碼。獨立gem發布。

```ruby
# Gemfile
gem 'dspy-code_act', '~> 0.29'
```

```ruby
programmer = DSPy::CodeAct.new(ProgrammingSignature, max_iterations: 10)
result = programmer.call(task: "Calculate the factorial of 20")
```

### Predictor比較

| Predictor | 速度 | Token用量 | 適用情境 |
|-----------|------|-----------|----------|
| Predict | 最快 | 低 | 分類、萃取 |
| ChainOfThought | 中等 | 中高 | 複雜推理、分析 |
| ReAct | 較慢 | 高 | 多步任務配工具 |
| CodeAct | 最慢 | 極高 | 動態程式設計、計算 |

### 並行預測

以`Async::Barrier`同時處理多個獨立預測：

```ruby
require 'async'
require 'async/barrier'

analyzer = DSPy::Predict.new(ContentAnalyzer)
documents = ["Text one", "Text two", "Text three"]

Async do
  barrier = Async::Barrier.new

  tasks = documents.map do |doc|
    barrier.async { analyzer.call(content: doc) }
  end

  barrier.wait
  predictions = tasks.map(&:wait)

  predictions.each { |p| puts p.sentiment }
end
```

Gemfile加`gem 'async', '~> 2.29'`。各`barrier.async`區塊內處理錯誤以防一個失敗取消其他：

```ruby
barrier.async do
  begin
    analyzer.call(content: doc)
  rescue StandardError => e
    nil
  end
end
```

### Few-Shot範例與指令調校

```ruby
classifier = DSPy::Predict.new(SentimentAnalysis)

examples = [
  DSPy::FewShotExample.new(
    input: { text: "Love it!" },
    output: { sentiment: "positive", confidence: 0.95 }
  )
]

optimized = classifier.with_examples(examples)
tuned = classifier.with_instruction("Be precise and confident.")
```

---

## 型別系統

### 自動型別轉換

DSPy.rb v0.9.0+自動將LLM JSON回應轉為型別化Ruby物件：

- **Enums**：字串值成為`T::Enum`實例（不區分大小寫）
- **Structs**：巢狀hash成為`T::Struct`物件
- **Arrays**：元素遞迴轉換
- **Defaults**：缺欄位用宣告預設值

### 聯集型別之辨別子

欄位用`T.any()`配struct型別時，DSPy加`_type`欄位至各struct之schema。反序列化時，`_type`選取正確struct類別：

```json
{
  "action": {
    "_type": "CreateTask",
    "title": "Review Q4 Report"
  }
}
```

DSPy匹配`"CreateTask"`於聯集成員並實例化正確struct。無需手動辨別欄位。

### 遞迴型別

自引用之struct受支援。schema生成器追蹤已訪型別並於`$defs`下產生`$ref`指標：

```ruby
class TreeNode < T::Struct
  const :label, String
  const :children, T::Array[TreeNode], default: []
end
```

生成schema以`"$ref": "#/$defs/TreeNode"`為children陣列項，防止無限schema展開。

### 巢狀深度

- 1-2層：跨所有provider可靠。
- 3-4層：可行但增schema複雜度。
- 5+層：可能觸發OpenAI深度驗證警告並降低LLM準確度。深巢結構宜扁平化或拆分為多signature。

### 要訣

- 偏好`T::Array[X], default: []`勝`T.nilable(T::Array[X])` — nilable形式在OpenAI structured outputs引發schema問題。
- 聯集型別用清晰struct名稱，因其成為`_type`辨別值。
- 聯集限2-4成員以利模型理解。
- 以`DSPy::OpenAI::LM::SchemaConverter.validate_compatibility(schema)`檢查schema相容性。
