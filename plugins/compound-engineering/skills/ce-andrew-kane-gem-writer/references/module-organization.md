# 模組組織範式

## 簡易 Gem 結構

```
lib/
├── gemname.rb          # 入口、配置、錯誤
└── gemname/
    ├── helper.rb       # 核心功能
    ├── engine.rb       # Rails engine（按需）
    └── version.rb      # 僅 VERSION 常數
```

## 複雜 Gem 結構（PgHero 範式）

```
lib/
├── pghero.rb
└── pghero/
    ├── database.rb     # 主類
    ├── engine.rb       # Rails engine
    └── methods/        # 按功能分解
        ├── basic.rb
        ├── connections.rb
        ├── indexes.rb
        ├── queries.rb
        └── replication.rb
```

## 方法分解範式

大類按功能拆為可引入之模組：

```ruby
# lib/pghero/database.rb
module PgHero
  class Database
    include Methods::Basic
    include Methods::Connections
    include Methods::Indexes
    include Methods::Queries
  end
end

# lib/pghero/methods/indexes.rb
module PgHero
  module Methods
    module Indexes
      def index_hit_rate
        # implementation
      end

      def unused_indexes
        # implementation
      end
    end
  end
end
```

## 版本檔範式

`version.rb` 極簡：

```ruby
# lib/gemname/version.rb
module GemName
  VERSION = "2.0.0"
end
```

## 入口引入順序

```ruby
# lib/searchkick.rb

# 1. 標準庫
require "forwardable"
require "json"

# 2. 外部依賴（極少）
require "active_support"

# 3. 內部檔用 require_relative
require_relative "searchkick/index"
require_relative "searchkick/model"
require_relative "searchkick/query"
require_relative "searchkick/version"

# 4. 條件式 Rails 載入（末尾）
require_relative "searchkick/railtie" if defined?(Rails)
```

## Autoload vs Require

Kane 用顯式 `require_relative`，不用 autoload：

```ruby
# 宜
require_relative "gemname/model"
require_relative "gemname/query"

# 忌
autoload :Model, "gemname/model"
autoload :Query, "gemname/query"
```

## 註解風格

僅用極簡段落標頭：

```ruby
# dependencies
require "active_support"

# adapters
require_relative "adapters/postgresql_adapter"

# modules
require_relative "migration"
```
