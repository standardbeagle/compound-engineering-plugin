---
name: ce-andrew-kane-gem-writer
description: 撰寫遵循 Andrew Kane 驗證模式與哲學之 Ruby gem 時使用。適用於建立新 Ruby gem、重構既有 gem、設計 gem API，或需要簡潔、最小化、生產就緒之 Ruby 函式庫程式碼。觸發詞如「create a gem」、「write a Ruby library」、「design a gem API」或提及 Andrew Kane 風格。
---

# Andrew Kane Gem 撰寫器

依循 Andrew Kane 歷經百餘 gem、3.74 億次下載之實戰模式撰寫 Ruby gem（Searchkick、PgHero、Chartkick、Strong Migrations、Lockbox、Ahoy、Blazer、Groupdate、Neighbor、Blind Index）。

## 核心哲學

**簡潔勝於取巧。** 零或最少依賴。顯式程式碼勝於元編程。Rails 整合而不耦合 Rails。每個模式皆服務於生產用途。

## 入口點結構

每個 gem 於 `lib/gemname.rb` 遵循此確切模式：

```ruby
# 1. Dependencies (stdlib preferred)
require "forwardable"

# 2. Internal modules
require_relative "gemname/model"
require_relative "gemname/version"

# 3. Conditional Rails (CRITICAL - never require Rails directly)
require_relative "gemname/railtie" if defined?(Rails)

# 4. Module with config and errors
module GemName
  class Error < StandardError; end
  class InvalidConfigError < Error; end

  class << self
    attr_accessor :timeout, :logger
    attr_writer :client
  end

  self.timeout = 10  # Defaults set immediately
end
```

## 類別巨集 DSL 模式

Kane 之標誌模式——單一方法呼叫配置一切：

```ruby
# Usage
class Product < ApplicationRecord
  searchkick word_start: [:name]
end

# Implementation
module GemName
  module Model
    def gemname(**options)
      unknown = options.keys - KNOWN_KEYWORDS
      raise ArgumentError, "unknown keywords: #{unknown.join(", ")}" if unknown.any?

      mod = Module.new
      mod.module_eval do
        define_method :some_method do
          # implementation
        end unless method_defined?(:some_method)
      end
      include mod

      class_eval do
        cattr_reader :gemname_options, instance_reader: false
        class_variable_set :@@gemname_options, options.dup
      end
    end
  end
end
```

## Rails 整合

**一律使用 `ActiveSupport.on_load`——勿直接 require Rails gem：**

```ruby
# WRONG
require "active_record"
ActiveRecord::Base.include(MyGem::Model)

# CORRECT
ActiveSupport.on_load(:active_record) do
  extend GemName::Model
end

# Use prepend for behavior modification
ActiveSupport.on_load(:active_record) do
  ActiveRecord::Migration.prepend(GemName::Migration)
end
```

## 配置模式

使用 `class << self` 搭配 `attr_accessor`，而非 Configuration 物件：

```ruby
module GemName
  class << self
    attr_accessor :timeout, :logger
    attr_writer :master_key
  end

  def self.master_key
    @master_key ||= ENV["GEMNAME_MASTER_KEY"]
  end

  self.timeout = 10
  self.logger = nil
end
```

## 錯誤處理

簡潔繼承層級附明確訊息：

```ruby
module GemName
  class Error < StandardError; end
  class ConfigError < Error; end
  class ValidationError < Error; end
end

# Validate early with ArgumentError
def initialize(key:)
  raise ArgumentError, "Key must be 32 bytes" unless key&.bytesize == 32
end
```

## 測試（僅 Minitest）

```ruby
# test/test_helper.rb
require "bundler/setup"
Bundler.require(:default)
require "minitest/autorun"
require "minitest/pride"

# test/model_test.rb
class ModelTest < Minitest::Test
  def test_basic_functionality
    assert_equal expected, actual
  end
end
```

## Gemspec 模式

儘可能零運行時依賴：

```ruby
Gem::Specification.new do |spec|
  spec.name = "gemname"
  spec.version = GemName::VERSION
  spec.required_ruby_version = ">= 3.1"
  spec.files = Dir["*.{md,txt}", "{lib}/**/*"]
  spec.require_path = "lib"
  # NO add_dependency lines - dev deps go in Gemfile
end
```

## 應避免之反模式

- `method_missing`（改用 `define_method`）
- Configuration 物件（改用類別存取器）
- `@@class_variables`（改用 `class << self`）
- 直接 require Rails gem
- 大量運行時依賴
- 於 gem 中提交 Gemfile.lock
- RSpec（改用 Minitest）
- 重量級 DSL（偏好顯式 Ruby）

## 參考檔案

深入模式請參照：
- `references/module-organization.md` - 目錄佈局、方法分解
- `references/rails-integration.md` - Railtie、Engine、on_load 模式
- `references/database-adapters.md` - 多資料庫支援模式
- `references/testing-patterns.md` - 多版本測試、CI 設定
- `references/resources.md` - Kane 倉庫與文章連結
