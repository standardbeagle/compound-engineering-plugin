# DSPy.rb 工具集

## Tools::Base

`DSPy::Tools::Base` 為單一用途工具之基類。各子類透過 `call` 方法向語言模型代理暴露單一操作。

### 定義工具

以 `tool_name` 及 `tool_description` 類別級 DSL 方法設定工具身份。定義 `call` 實例方法並附 Sorbet `sig` 宣告，使 DSPy.rb 能生成語言模型調用工具所需之 JSON schema。

```ruby
class WeatherLookup < DSPy::Tools::Base
  extend T::Sig

  tool_name "weather_lookup"
  tool_description "Look up current weather for a given city"

  sig { params(city: String, units: T.nilable(String)).returns(String) }
  def call(city:, units: nil)
    # 擷取天氣資料並回傳字串摘要
    "72F and sunny in #{city}"
  end
end
```

要點：

- 繼承 `DSPy::Tools::Base`，非 `DSPy::Tool`。
- 用 `tool_name`（類別方法）設定語言模型所見名稱。未設則以類別名小寫為後備。
- 用 `tool_description`（類別方法）設定工具 schema 中展示之描述。
- `call` 方法須使用**關鍵字引數**。位置引數亦支援，但關鍵字引數生成更佳 schema。
- 必須為 `call` 附加 Sorbet `sig`。缺少簽名則生成之 schema 屬性為空，語言模型無法判斷參數類型。

### Schema 生成

`call_schema_object` 內省 `call` 之 Sorbet 簽名，回傳代表 JSON Schema `parameters` 物件之雜湊：

```ruby
WeatherLookup.call_schema_object
# => {
#   type: "object",
#   properties: {
#     city:  { type: "string", description: "Parameter city" },
#     units: { type: "string", description: "Parameter units (optional)" }
#   },
#   required: ["city"]
# }
```

`call_schema` 將其包裹為完整語言模型工具呼叫格式：

```ruby
WeatherLookup.call_schema
# => {
#   type: "function",
#   function: {
#     name: "call",
#     description: "Call the WeatherLookup tool",
#     parameters: { ... }
#   }
# }
```

### 搭配 ReAct 使用工具

將工具實例以陣列傳入 `DSPy::ReAct`：

```ruby
agent = DSPy::ReAct.new(
  MySignature,
  tools: [WeatherLookup.new, AnotherTool.new]
)

result = agent.call(question: "What is the weather in Berlin?")
puts result.answer
```

以點記法存取輸出欄位（`result.answer`），非雜湊存取（`result[:answer]`）。

---

## Tools::Toolset

`DSPy::Tools::Toolset` 將多個相關方法歸入單一類別。各暴露方法自語言模型視角成為獨立工具。

### 定義工具集

```ruby
class DatabaseToolset < DSPy::Tools::Toolset
  extend T::Sig

  toolset_name "db"

  tool :query,  description: "Run a read-only SQL query"
  tool :insert, description: "Insert a record into a table"
  tool :delete, description: "Delete a record by ID"

  sig { params(sql: String).returns(String) }
  def query(sql:)
    # 執行唯讀查詢
  end

  sig { params(table: String, data: T::Hash[String, String]).returns(String) }
  def insert(table:, data:)
    # 新增紀錄
  end

  sig { params(table: String, id: Integer).returns(String) }
  def delete(table:, id:)
    # 刪除紀錄
  end
end
```

### DSL 方法

**`toolset_name(name)`** —— 設定所有生成工具名稱之前綴。省略則以類別名減去 `Toolset` 後綴之小寫（如 `DatabaseToolset` → `database`）。

```ruby
toolset_name "db"
# tool :query 產生名為 "db_query" 之工具
```

**`tool(method_name, tool_name:, description:)`** —— 將方法暴露為工具。

- `method_name`（Symbol，必須）—— 欲暴露之實例方法。
- `tool_name:`（String，可選）—— 覆寫預設 `<toolset_name>_<method_name>` 命名。
- `description:`（String，可選）—— 展示給語言模型之描述。預設為方法名之人性化版本。

```ruby
tool :word_count, tool_name: "text_wc", description: "Count lines, words, and characters"
# 產生名為 "text_wc" 之工具，非 "text_word_count"
```

### 轉換為工具陣列

於類別（非實例）上呼叫 `to_tools` 取得相容 `DSPy::Tools::Base` 之 `ToolProxy` 物件陣列：

```ruby
agent = DSPy::ReAct.new(
  AnalyzeText,
  tools: DatabaseToolset.to_tools
)
```

各 `ToolProxy` 包裝一個方法，將 `call` 委託至底層工具集實例，並從方法之 Sorbet 簽名生成自身 JSON schema。

### 共享狀態

單次 `to_tools` 呼叫之所有工具代理共享一個工具集實例。將共享狀態（連線、快取、配置）存於工具集之 `initialize`：

```ruby
class ApiToolset < DSPy::Tools::Toolset
  extend T::Sig

  toolset_name "api"

  tool :get,  description: "Make a GET request"
  tool :post, description: "Make a POST request"

  sig { params(base_url: String).void }
  def initialize(base_url:)
    @base_url = base_url
    @client = HTTP.persistent(base_url)
  end

  sig { params(path: String).returns(String) }
  def get(path:)
    @client.get("#{@base_url}#{path}").body.to_s
  end

  sig { params(path: String, body: String).returns(String) }
  def post(path:, body:)
    @client.post("#{@base_url}#{path}", body: body).body.to_s
  end
end
```

---

## 類型安全

工具方法上之 Sorbet 簽名驅動 JSON schema 生成及語言模型回應之自動類型強制轉換。

### 基本類型

```ruby
sig { params(
  text: String,
  count: Integer,
  score: Float,
  enabled: T::Boolean,
  threshold: Numeric
).returns(String) }
def analyze(text:, count:, score:, enabled:, threshold:)
  # ...
end
```

| Sorbet 類型       | JSON Schema                                         |
|-------------------|-----------------------------------------------------|
| `String`          | `{"type": "string"}`                                |
| `Integer`         | `{"type": "integer"}`                               |
| `Float`           | `{"type": "number"}`                                |
| `Numeric`         | `{"type": "number"}`                                |
| `T::Boolean`      | `{"type": "boolean"}`                               |
| `T::Enum`         | `{"type": "string", "enum": [...]}`                 |
| `T::Struct`       | `{"type": "object", "properties": {...}}`           |
| `T::Array[Type]`  | `{"type": "array", "items": {...}}`                 |
| `T::Hash[K, V]`   | `{"type": "object", "additionalProperties": {...}}` |
| `T.nilable(Type)` | `{"type": [original, "null"]}`                      |
| `T.any(T1, T2)`   | `{"oneOf": [{...}, {...}]}`                         |
| `T.class_of(X)`   | `{"type": "string"}`                                |

### T::Enum 參數

定義 `T::Enum` 並於工具簽名中引用。DSPy.rb 生成 JSON Schema `enum` 約束，並自動將語言模型之字串回應反序列化為正確列舉實例。

```ruby
class Priority < T::Enum
  enums do
    Low = new('low')
    Medium = new('medium')
    High = new('high')
    Critical = new('critical')
  end
end

class Status < T::Enum
  enums do
    Pending = new('pending')
    InProgress = new('in-progress')
    Completed = new('completed')
  end
end

sig { params(priority: Priority, status: Status).returns(String) }
def update_task(priority:, status:)
  "Updated to #{priority.serialize} / #{status.serialize}"
end
```

生成之 schema 將參數約束為有效值：

```json
{
  "priority": {
    "type": "string",
    "enum": ["low", "medium", "high", "critical"]
  }
}
```

**不區分大小寫匹配：** 語言模型回傳 `"HIGH"` 或 `"High"` 而非 `"low"` 時，DSPy.rb 先嘗試精確 `try_deserialize`，再回退至不區分大小寫查找。防止語言模型大小寫變異導致失敗。

### T::Struct 參數

用 `T::Struct` 表達複雜巢狀物件。DSPy.rb 生成巢狀 JSON Schema 屬性，並遞迴將語言模型之雜湊回應強制轉換為結構實例。

```ruby
class TaskMetadata < T::Struct
  prop :id, String
  prop :priority, Priority
  prop :tags, T::Array[String]
  prop :estimated_hours, T.nilable(Float), default: nil
end

class TaskRequest < T::Struct
  prop :title, String
  prop :description, String
  prop :status, Status
  prop :metadata, TaskMetadata
  prop :assignees, T::Array[String]
end

sig { params(task: TaskRequest).returns(String) }
def create_task(task:)
  "Created: #{task.title} (#{task.status.serialize})"
end
```

語言模型可見完整巢狀物件 schema，DSPy.rb 自 JSON 回應重建結構樹，包含巢狀結構內之列舉欄位。

### 可空參數

以 `T.nilable(...)` 標記可選參數，方法簽名中提供 `nil` 預設值。此類參數排除於 JSON Schema `required` 陣列之外。

```ruby
sig { params(
  query: String,
  max_results: T.nilable(Integer),
  filter: T.nilable(String)
).returns(String) }
def search(query:, max_results: nil, filter: nil)
  # query 必須；max_results 及 filter 可選
end
```

### 集合

帶型別之陣列與雜湊生成精確之元素/值 schema：

```ruby
sig { params(
  tags: T::Array[String],
  priorities: T::Array[Priority],
  config: T::Hash[String, T.any(String, Integer, Float)]
).returns(String) }
def configure(tags:, priorities:, config:)
  # 陣列元素與雜湊值經驗證並強制轉換
end
```

### 聯合類型

`T.any(...)` 生成 `oneOf` JSON Schema。聯合成員含 `T::Struct` 時，DSPy.rb 於強制轉換期間使用 `_type` 鑑別欄位選擇正確結構類別。

```ruby
sig { params(value: T.any(String, Integer, Float)).returns(String) }
def handle_flexible(value:)
  # 接受多種類型
end
```

---

## 內建工具集

### TextProcessingToolset

`DSPy::Tools::TextProcessingToolset` 提供 Unix 風格之文字分析與操作。工具集名稱前綴：`text`。

| 工具名                              | 方法             | 描述                                     |
|------------------------------------|-----------------|------------------------------------------|
| `text_grep`                        | `grep`          | 搜尋模式，可選不區分大小寫及僅計數模式         |
| `text_wc`                          | `word_count`    | 計算行數、詞數及字元數                       |
| `text_rg`                          | `ripgrep`       | 快速模式搜尋，附上下文行                     |
| `text_extract_lines`               | `extract_lines` | 依行號提取行範圍                            |
| `text_filter_lines`                | `filter_lines`  | 保留或排除匹配正則表達式之行                   |
| `text_unique_lines`                | `unique_lines`  | 行去重，可選保留順序                         |
| `text_sort_lines`                  | `sort_lines`    | 按字母或數值排序行                           |
| `text_summarize_text`              | `summarize_text`| 生成統計摘要（計數、平均值、高頻詞）            |

用法：

```ruby
agent = DSPy::ReAct.new(
  AnalyzeText,
  tools: DSPy::Tools::TextProcessingToolset.to_tools
)

result = agent.call(text: log_contents, question: "How many error lines are there?")
puts result.answer
```

### GitHubCLIToolset

`DSPy::Tools::GitHubCLIToolset` 包裝 `gh` CLI 用於唯讀導向之 GitHub 操作。工具集名稱前綴：`github`。

| 工具名                   | 方法             | 描述                                          |
|-------------------------|-----------------|-----------------------------------------------|
| `github_list_issues`    | `list_issues`   | 按狀態、標籤、指派人篩選議題列表                 |
| `github_list_prs`       | `list_prs`      | 按狀態、作者、基礎分支篩選拉取請求列表            |
| `github_get_issue`      | `get_issue`     | 取得單一議題詳情                                |
| `github_get_pr`         | `get_pr`        | 取得單一拉取請求詳情                             |
| `github_api_request`    | `api_request`   | 對 GitHub API 發起任意 GET 請求                  |
| `github_traffic_views`  | `traffic_views` | 取得倉庫流量瀏覽計數                             |
| `github_traffic_clones` | `traffic_clones`| 取得倉庫流量複製計數                             |

此工具集使用 `T::Enum` 參數（`IssueState`、`PRState`、`ReviewState`）作為狀態篩選器，展示實際中之列舉式工具簽名。

```ruby
agent = DSPy::ReAct.new(
  RepoAnalysis,
  tools: DSPy::Tools::GitHubCLIToolset.to_tools
)
```

---

## 測試

### 單元測試個別工具

實例化 `DSPy::Tools::Base` 子類並直接呼叫 `call` 以測試：

```ruby
RSpec.describe WeatherLookup do
  subject(:tool) { described_class.new }

  it "returns weather for a city" do
    result = tool.call(city: "Berlin")
    expect(result).to include("Berlin")
  end

  it "exposes the correct tool name" do
    expect(tool.name).to eq("weather_lookup")
  end

  it "generates a valid schema" do
    schema = described_class.call_schema_object
    expect(schema[:required]).to include("city")
    expect(schema[:properties]).to have_key(:city)
  end
end
```

### 單元測試工具集

於實例上直接測試工具集方法。以 `to_tools` 驗證工具生成：

```ruby
RSpec.describe DatabaseToolset do
  subject(:toolset) { described_class.new }

  it "executes a query" do
    result = toolset.query(sql: "SELECT 1")
    expect(result).to be_a(String)
  end

  it "generates tools with correct names" do
    tools = described_class.to_tools
    names = tools.map(&:name)
    expect(names).to contain_exactly("db_query", "db_insert", "db_delete")
  end

  it "generates tool descriptions" do
    tools = described_class.to_tools
    query_tool = tools.find { |t| t.name == "db_query" }
    expect(query_tool.description).to eq("Run a read-only SQL query")
  end
end
```

### 模擬工具內部預測

工具內部呼叫 DSPy 預測器時，截取預測器以隔離工具邏輯與語言模型呼叫：

```ruby
class SmartSearchTool < DSPy::Tools::Base
  extend T::Sig

  tool_name "smart_search"
  tool_description "Search with query expansion"

  sig { void }
  def initialize
    @expander = DSPy::Predict.new(QueryExpansionSignature)
  end

  sig { params(query: String).returns(String) }
  def call(query:)
    expanded = @expander.call(query: query)
    perform_search(expanded.expanded_query)
  end

  private

  def perform_search(query)
    # 實際搜尋邏輯
  end
end

RSpec.describe SmartSearchTool do
  subject(:tool) { described_class.new }

  before do
    expansion_result = double("result", expanded_query: "expanded test query")
    allow_any_instance_of(DSPy::Predict).to receive(:call).and_return(expansion_result)
  end

  it "expands the query before searching" do
    allow(tool).to receive(:perform_search).with("expanded test query").and_return("found 3 results")
    result = tool.call(query: "test")
    expect(result).to eq("found 3 results")
  end
end
```

### 測試列舉強制轉換

驗證語言模型回應之字串值反序列化為正確列舉實例：

```ruby
RSpec.describe "enum coercion" do
  it "handles case-insensitive enum values" do
    toolset = GitHubCLIToolset.new
    # 語言模型可能回傳 "OPEN" 而非 "open"
    result = toolset.list_issues(state: IssueState::Open)
    expect(result).to be_a(String)
  end
end
```

---

## 約束

- 所有暴露之工具方法須使用**關鍵字引數**。僅位置參數可生成 schema，但關鍵字引數產生更可靠之語言模型互動。
- 各暴露方法成為**獨立、分離之工具**。單次工具呼叫內不支援方法鏈結或多步序列。
- 工具代理間之共享狀態作用域限於單次 `to_tools` 呼叫。獨立之 `to_tools` 呼叫建立獨立之工具集實例。
- 缺少 Sorbet `sig` 之方法生成空參數 schema。語言模型無從知悉應傳入何種引數。
