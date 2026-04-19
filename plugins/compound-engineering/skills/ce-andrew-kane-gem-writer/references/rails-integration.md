# Rails 整合範式

## 金律

**勿直接引入 Rails gem。** → 載入順序生患。

```ruby
# 誤 — 提前載入
require "active_record"
ActiveRecord::Base.include(MyGem::Model)

# 正 — 延遲載入
ActiveSupport.on_load(:active_record) do
  extend MyGem::Model
end
```

## ActiveSupport.on_load 鉤子

常用鉤子及其用途：

```ruby
# 模型
ActiveSupport.on_load(:active_record) do
  extend GemName::Model        # 增類方法（searchkick, has_encrypted）
  include GemName::Callbacks   # 增實例方法
end

# 控制器
ActiveSupport.on_load(:action_controller) do
  include Ahoy::Controller
end

# 任務
ActiveSupport.on_load(:active_job) do
  include GemName::JobExtensions
end

# 郵件器
ActiveSupport.on_load(:action_mailer) do
  include GemName::MailerExtensions
end
```

## Preload 改寫行為

覆寫既有 Rails 方法時：

```ruby
ActiveSupport.on_load(:active_record) do
  ActiveRecord::Migration.prepend(StrongMigrations::Migration)
  ActiveRecord::Migrator.prepend(StrongMigrations::Migrator)
end
```

## Railtie 範式

非掛載型 gem 之極簡 Railtie：

```ruby
# lib/gemname/railtie.rb
module GemName
  class Railtie < Rails::Railtie
    initializer "gemname.configure" do
      ActiveSupport.on_load(:active_record) do
        extend GemName::Model
      end
    end

    # 可選：增控制器運行時日誌
    initializer "gemname.log_runtime" do
      require_relative "controller_runtime"
      ActiveSupport.on_load(:action_controller) do
        include GemName::ControllerRuntime
      end
    end

    # 可選：Rake 任務
    rake_tasks do
      load "tasks/gemname.rake"
    end
  end
end
```

## Engine 範式（可掛載 Gem）

具 Web 界面之 gem（PgHero、Blazer、Ahoy）：

```ruby
# lib/pghero/engine.rb
module PgHero
  class Engine < ::Rails::Engine
    isolate_namespace PgHero

    initializer "pghero.assets", group: :all do |app|
      if app.config.respond_to?(:assets) && defined?(Sprockets)
        app.config.assets.precompile << "pghero/application.js"
        app.config.assets.precompile << "pghero/application.css"
      end
    end

    initializer "pghero.config" do
      PgHero.config = Rails.application.config_for(:pghero) rescue {}
    end
  end
end
```

## Engine 路由

```ruby
# config/routes.rb（engine 內）
PgHero::Engine.routes.draw do
  root to: "home#index"
  resources :databases, only: [:show]
end
```

應用中掛載：

```ruby
# config/routes.rb（應用中）
mount PgHero::Engine, at: "pghero"
```

## YAML 配置含 ERB

複雜 gem 需配置檔時：

```ruby
def self.settings
  @settings ||= begin
    path = Rails.root.join("config", "blazer.yml")
    if path.exist?
      YAML.safe_load(ERB.new(File.read(path)).result, aliases: true)
    else
      {}
    end
  end
end
```

## 生成器範式

```ruby
# lib/generators/gemname/install_generator.rb
module GemName
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)

      def copy_initializer
        template "initializer.rb", "config/initializers/gemname.rb"
      end

      def copy_migration
        migration_template "migration.rb", "db/migrate/create_gemname_tables.rb"
      end
    end
  end
end
```

## 條件功能偵測

```ruby
# 檢特定 Rails 版本
if ActiveRecord.version >= Gem::Version.new("7.0")
  # Rails 7+ 專用碼
end

# 檢可選依賴
def self.client
  @client ||= if defined?(OpenSearch::Client)
    OpenSearch::Client.new
  elsif defined?(Elasticsearch::Client)
    Elasticsearch::Client.new
  else
    raise Error, "Install elasticsearch or opensearch-ruby"
  end
end
```
