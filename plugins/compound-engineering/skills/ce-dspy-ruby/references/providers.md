# DSPy.rb 語言模型供應商

## 適配器架構

DSPy.rb 以獨立適配器 gem 發布各供應商 SDK。僅安裝所需適配器。各適配器 gem 依賴其供應商之官方 SDK，存在時自動載入——無需顯式 `require`。

```ruby
# Gemfile
gem 'dspy'              # 核心框架（無供應商 SDK）
gem 'dspy-openai'       # OpenAI, OpenRouter, Ollama
gem 'dspy-anthropic'    # Claude
gem 'dspy-gemini'       # Gemini
gem 'dspy-ruby_llm'     # RubyLLM 統一適配器（12+ 供應商）
```

---

## 各供應商適配器

### dspy-openai

涵蓋所有遵循 OpenAI chat-completions 協議之端點：OpenAI 本身、OpenRouter 及 Ollama。

**SDK 依賴：** `openai ~> 0.17`

```ruby
# OpenAI
lm = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])

# OpenRouter -- 單一金鑰存取 200+ 模型
lm = DSPy::LM.new('openrouter/x-ai/grok-4-fast:free',
  api_key: ENV['OPENROUTER_API_KEY']
)

# Ollama -- 本地模型，無需 API 金鑰
lm = DSPy::LM.new('ollama/llama3.2')

# 遠端 Ollama 實例
lm = DSPy::LM.new('ollama/llama3.2',
  base_url: 'https://my-ollama.example.com/v1',
  api_key: 'optional-auth-token'
)
```

三個子適配器共享相同之請求處理、結構化輸出支援及錯誤回報機制。切換供應商無需更改上層 DSPy 程式碼。

對於缺乏原生結構化輸出支援之 OpenRouter 模型，明確禁用之：

```ruby
lm = DSPy::LM.new('openrouter/deepseek/deepseek-chat-v3.1:free',
  api_key: ENV['OPENROUTER_API_KEY'],
  structured_outputs: false
)
```

### dspy-anthropic

提供 Claude 適配器。安裝後可用任何 `anthropic/*` 模型 ID。

**SDK 依賴：** `anthropic ~> 1.12`

```ruby
lm = DSPy::LM.new('anthropic/claude-sonnet-4-20250514',
  api_key: ENV['ANTHROPIC_API_KEY']
)
```

結構化輸出預設使用基於工具之 JSON 提取（`structured_outputs: true`）。設 `structured_outputs: false` 改用增強提示提取。

```ruby
# 基於工具之提取（預設，最可靠）
lm = DSPy::LM.new('anthropic/claude-sonnet-4-20250514',
  api_key: ENV['ANTHROPIC_API_KEY'],
  structured_outputs: true
)

# 增強提示提取
lm = DSPy::LM.new('anthropic/claude-sonnet-4-20250514',
  api_key: ENV['ANTHROPIC_API_KEY'],
  structured_outputs: false
)
```

### dspy-gemini

提供 Gemini 適配器。安裝後可用任何 `gemini/*` 模型 ID。

**SDK 依賴：** `gemini-ai ~> 4.3`

```ruby
lm = DSPy::LM.new('gemini/gemini-2.5-flash',
  api_key: ENV['GEMINI_API_KEY']
)
```

**環境變數：** `GEMINI_API_KEY`（亦接受 `GOOGLE_API_KEY`）。

---

## RubyLLM 統一適配器

`dspy-ruby_llm` gem 提供單一適配器，透過 [RubyLLM](https://rubyllm.com) 路由至 12+ 供應商。當專案需與多個供應商通訊，或需存取 Bedrock、VertexAI、DeepSeek、Mistral 而無專用適配器 gem 時使用之。

**SDK 依賴：** `ruby_llm ~> 1.3`

### 模型 ID 格式

所有模型 ID 前綴 `ruby_llm/`：

```ruby
lm = DSPy::LM.new('ruby_llm/gpt-4o-mini')
lm = DSPy::LM.new('ruby_llm/claude-sonnet-4-20250514')
lm = DSPy::LM.new('ruby_llm/gemini-2.5-flash')
```

適配器自 RubyLLM 模型註冊表自動偵測供應商。未在註冊表中之模型，顯式傳入 `provider:`：

```ruby
lm = DSPy::LM.new('ruby_llm/llama3.2', provider: 'ollama')
lm = DSPy::LM.new('ruby_llm/anthropic/claude-3-opus',
  api_key: ENV['OPENROUTER_API_KEY'],
  provider: 'openrouter'
)
```

### 使用既有 RubyLLM 配置

RubyLLM 已全域配置時，省略 `api_key:` 引數。DSPy 自動複用全域配置：

```ruby
RubyLLM.configure do |config|
  config.openai_api_key = ENV['OPENAI_API_KEY']
  config.anthropic_api_key = ENV['ANTHROPIC_API_KEY']
end

# 無需 api_key -- 沿用全域配置
DSPy.configure do |c|
  c.lm = DSPy::LM.new('ruby_llm/gpt-4o-mini')
end
```

當傳入 `api_key:`（或 `base_url:`、`timeout:`、`max_retries:` 任一）時，DSPy 建立**作用域上下文**而非複用全域配置。

### 雲端供應商（Bedrock, VertexAI）

先全域配置 RubyLLM，再引用模型：

```ruby
# AWS Bedrock
RubyLLM.configure do |c|
  c.bedrock_api_key = ENV['AWS_ACCESS_KEY_ID']
  c.bedrock_secret_key = ENV['AWS_SECRET_ACCESS_KEY']
  c.bedrock_region = 'us-east-1'
end
lm = DSPy::LM.new('ruby_llm/anthropic.claude-3-5-sonnet', provider: 'bedrock')

# Google VertexAI
RubyLLM.configure do |c|
  c.vertexai_project_id = 'your-project-id'
  c.vertexai_location = 'us-central1'
end
lm = DSPy::LM.new('ruby_llm/gemini-pro', provider: 'vertexai')
```

### 支援供應商表

| 供應商     | 範例模型 ID                                | 備註                           |
|-----------|-------------------------------------------|-------------------------------|
| OpenAI    | `ruby_llm/gpt-4o-mini`                   | 註冊表自動偵測                   |
| Anthropic | `ruby_llm/claude-sonnet-4-20250514`      | 註冊表自動偵測                   |
| Gemini    | `ruby_llm/gemini-2.5-flash`              | 註冊表自動偵測                   |
| DeepSeek  | `ruby_llm/deepseek-chat`                 | 註冊表自動偵測                   |
| Mistral   | `ruby_llm/mistral-large`                 | 註冊表自動偵測                   |
| Ollama    | `ruby_llm/llama3.2`                      | 用 `provider: 'ollama'`        |
| AWS Bedrock | `ruby_llm/anthropic.claude-3-5-sonnet` | 全域配置 RubyLLM                 |
| VertexAI  | `ruby_llm/gemini-pro`                    | 全域配置 RubyLLM                 |
| OpenRouter | `ruby_llm/anthropic/claude-3-opus`      | 用 `provider: 'openrouter'`    |
| Perplexity | `ruby_llm/llama-3.1-sonar-large`        | 用 `provider: 'perplexity'`    |
| GPUStack  | `ruby_llm/model-name`                    | 用 `provider: 'gpustack'`      |

---

## Rails 初始化器模式

於 `after_initialize` 區塊內配置 DSPy，確保 Rails 憑證及環境已完全載入：

```ruby
# config/initializers/dspy.rb
Rails.application.config.after_initialize do
  return if Rails.env.test? # 測試環境跳過——改用 VCR 錄音帶

  DSPy.configure do |config|
    config.lm = DSPy::LM.new(
      'openai/gpt-4o-mini',
      api_key: Rails.application.credentials.openai_api_key,
      structured_outputs: true
    )

    config.logger = if Rails.env.production?
      Dry.Logger(:dspy, formatter: :json) do |logger|
        logger.add_backend(stream: Rails.root.join("log/dspy.log"))
      end
    else
      Dry.Logger(:dspy) do |logger|
        logger.add_backend(level: :debug, stream: $stdout)
      end
    end
  end
end
```

要點：

- 包裹於 `after_initialize` 以確保 `Rails.application.credentials` 可用。
- 測試環境提前返回。依賴 VCR 錄音帶獲取確定性語言模型回應。
- 設 `structured_outputs: true`（預設）以啟用供應商原生 JSON 提取。
- 生產環境使用 `Dry.Logger` 搭配 `:json` 格式化器，利於結構化日誌解析。

---

## Fiber 區域語言模型上下文

`DSPy.with_lm` 設定臨時語言模型覆寫，作用域限於當前 Fiber。區塊內所有預測器呼叫使用覆寫值；區塊外恢復先前語言模型。

```ruby
fast = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])
powerful = DSPy::LM.new('anthropic/claude-sonnet-4-20250514', api_key: ENV['ANTHROPIC_API_KEY'])

classifier = Classifier.new

# 使用全域語言模型
result = classifier.call(text: "Hello")

# 暫時切換至快速模型
DSPy.with_lm(fast) do
  result = classifier.call(text: "Hello")   # 使用 gpt-4o-mini
end

# 暫時切換至強力模型
DSPy.with_lm(powerful) do
  result = classifier.call(text: "Hello")   # 使用 claude-sonnet-4
end
```

### 語言模型解析層級

DSPy 依此順序解析活動語言模型：

1. **實例層級語言模型** —— 透過 `configure` 直接設於模組實例
2. **Fiber 區域語言模型** —— 透過 `DSPy.with_lm` 設定
3. **全域語言模型** —— 透過 `DSPy.configure` 設定

實例層級配置恆勝出，即使在 `DSPy.with_lm` 區塊內亦然：

```ruby
classifier = Classifier.new
classifier.configure { |c| c.lm = DSPy::LM.new('anthropic/claude-sonnet-4-20250514', api_key: ENV['ANTHROPIC_API_KEY']) }

fast = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY'])

DSPy.with_lm(fast) do
  classifier.call(text: "Test")  # 仍使用 claude-sonnet-4（實例層級勝出）
end
```

### configure_predictor 精細代理控制

複雜代理（`ReAct`、`CodeAct`、`DeepResearch`、`DeepSearch`）包含內部預測器。用 `configure` 做整體覆寫，用 `configure_predictor` 定位特定子預測器：

```ruby
agent = DSPy::ReAct.new(MySignature, tools: tools)

# 設定代理及其所有子項之預設語言模型
agent.configure { |c| c.lm = DSPy::LM.new('openai/gpt-4o-mini', api_key: ENV['OPENAI_API_KEY']) }

# 僅覆寫推理預測器，使用更強模型
agent.configure_predictor('thought_generator') do |c|
  c.lm = DSPy::LM.new('anthropic/claude-sonnet-4-20250514', api_key: ENV['ANTHROPIC_API_KEY'])
end

result = agent.call(question: "Summarize the report")
```

兩種方法皆支援鏈式呼叫：

```ruby
agent
  .configure { |c| c.lm = cheap_model }
  .configure_predictor('thought_generator') { |c| c.lm = expensive_model }
```

#### 各代理類型之可用預測器

| 代理                    | 內部預測器                                              |
|------------------------|--------------------------------------------------------|
| `DSPy::ReAct`          | `thought_generator`、`observation_processor`            |
| `DSPy::CodeAct`        | `code_generator`、`observation_processor`               |
| `DSPy::DeepResearch`   | `planner`、`synthesizer`、`qa_reviewer`、`reporter`     |
| `DSPy::DeepSearch`     | `seed_predictor`、`search_predictor`、`reader_predictor`、`reason_predictor` |

#### 傳播規則

- 配置遞迴傳播至子項及孫項。
- 已配置語言模型之子項**不會**被後續父級 `configure` 呼叫覆寫。
- 先配置父級，再覆寫特定子項。

---

## 特性旗標模型選擇

使用以環境變數為後端之 `FeatureFlags` 模組集中管理模型選擇。各工具或代理從旗標讀取其模型，回退至全域預設。

```ruby
module FeatureFlags
  module_function

  def default_model
    ENV.fetch('DSPY_DEFAULT_MODEL', 'openai/gpt-4o-mini')
  end

  def default_api_key
    ENV.fetch('DSPY_DEFAULT_API_KEY') { ENV.fetch('OPENAI_API_KEY', nil) }
  end

  def model_for(tool_name)
    env_key = "DSPY_MODEL_#{tool_name.upcase}"
    ENV.fetch(env_key, default_model)
  end

  def api_key_for(tool_name)
    env_key = "DSPY_API_KEY_#{tool_name.upcase}"
    ENV.fetch(env_key, default_api_key)
  end
end
```

### 各工具模型覆寫

不改應用程式碼即覆寫個別工具之模型：

```bash
# .env
DSPY_DEFAULT_MODEL=openai/gpt-4o-mini
DSPY_DEFAULT_API_KEY=sk-...

# 覆寫分類器改用 Claude
DSPY_MODEL_CLASSIFIER=anthropic/claude-sonnet-4-20250514
DSPY_API_KEY_CLASSIFIER=sk-ant-...

# 覆寫摘要器改用 Gemini
DSPY_MODEL_SUMMARIZER=gemini/gemini-2.5-flash
DSPY_API_KEY_SUMMARIZER=...
```

初始化時將各代理接上其旗標：

```ruby
class ClassifierAgent < DSPy::Module
  def initialize
    super
    model = FeatureFlags.model_for('classifier')
    api_key = FeatureFlags.api_key_for('classifier')

    @predictor = DSPy::Predict.new(ClassifySignature)
    configure { |c| c.lm = DSPy::LM.new(model, api_key: api_key) }
  end

  def forward(text:)
    @predictor.call(text: text)
  end
end
```

此模式使模型路由聲明化，避免 `DSPy::LM.new` 呼叫散布於整個程式碼庫。

---

## 相容性矩陣

各直連適配器 gem 之功能支援。所列功能皆假設 `structured_outputs: true`（預設）。

| 功能               | OpenAI          | Anthropic         | Gemini          | Ollama    | OpenRouter | RubyLLM                    |
|-------------------|-----------------|-------------------|-----------------|-----------|------------|----------------------------|
| 結構化輸出         | 原生 JSON 模式   | 基於工具之提取     | 原生 JSON schema | OpenAI 相容 JSON | 因模型而異 | 透過 `with_schema`          |
| 視覺（圖像）       | 檔案 + URL       | 檔案 + Base64     | 檔案 + Base64   | 有限      | 因模型而異   | 委託至底層供應商             |
| 圖像 URL          | 是              | 否                | 否              | 否        | 因模型而異   | 視供應商而定                 |
| 工具呼叫           | 是              | 是                | 是              | 因模型而異 | 因模型而異   | 是                         |
| 串流              | 是              | 是                | 是              | 是        | 是          | 是                         |

**備註：**

- **結構化輸出**於所有適配器預設啟用。設 `structured_outputs: false` 回退至增強提示提取。
- **視覺/圖像 URL：** 僅 OpenAI 支援直接傳入 URL。Anthropic 及 Gemini 需從檔案或 Base64 載入：
  ```ruby
  DSPy::Image.from_url("https://example.com/img.jpg")    # 僅 OpenAI
  DSPy::Image.from_file("path/to/image.jpg")             # 所有供應商
  DSPy::Image.from_base64(data, mime_type: "image/jpeg")  # 所有供應商
  ```
- **RubyLLM** 委託至底層供應商，故功能支援與表中供應商欄一致。

### 適配器策略選擇

| 場景                                       | 建議適配器                     |
|-------------------------------------------|-------------------------------|
| 單一供應商（OpenAI、Claude 或 Gemini）        | 專用 gem（`dspy-openai`、`dspy-anthropic`、`dspy-gemini`） |
| 多供應商，需各代理模型路由                     | `dspy-ruby_llm`               |
| AWS Bedrock 或 Google VertexAI              | `dspy-ruby_llm`               |
| 本地開發使用 Ollama                           | `dspy-openai`（Ollama 子適配器）或 `dspy-ruby_llm` |
| OpenVPN 成本優化                             | `dspy-openai`（OpenRouter 子適配器） |

### 目前推薦模型

| 供應商    | 模型 ID                                | 用途              |
|----------|---------------------------------------|-------------------|
| OpenAI   | `openai/gpt-4o-mini`                  | 快速、經濟         |
| Anthropic | `anthropic/claude-sonnet-4-20250514` | 平衡推理           |
| Gemini   | `gemini/gemini-2.5-flash`             | 快速、經濟         |
| Ollama   | `ollama/llama3.2`                     | 本地、零 API 成本   |
