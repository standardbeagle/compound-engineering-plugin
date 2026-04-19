# Andrew Kane 資源

## 主要文檔

- **Gem 範式文章**: https://ankane.org/gem-patterns
  - Kane 自述其 gem 常用範式
  - 涵蓋配置、Rails 整合、錯誤處理

## 按星數之頂級 Ruby Gem

### 搜尋與資料

| Gem | 星數 | 述 | 源 |
|-----|------|-----|-----|
| **Searchkick** | 6.6k+ | Rails 智慧搜尋 | https://github.com/ankane/searchkick |
| **Chartkick** | 6.4k+ | Ruby 美觀圖表 | https://github.com/ankane/chartkick |
| **Groupdate** | 3.8k+ | 按日/週/月分組 | https://github.com/ankane/groupdate |
| **Blazer** | 4.6k+ | Rails SQL 儀表板 | https://github.com/ankane/blazer |

### 資料庫與遷移

| Gem | 星數 | 述 | 源 |
|-----|------|-----|-----|
| **PgHero** | 8.2k+ | PostgreSQL 洞察 | https://github.com/ankane/pghero |
| **Strong Migrations** | 4.1k+ | 安全遷移檢查 | https://github.com/ankane/strong_migrations |
| **Dexter** | 1.8k+ | 自動索引建議 | https://github.com/ankane/dexter |
| **PgSync** | 1.5k+ | 同步 Postgres 資料 | https://github.com/ankane/pgsync |

### 安全與加密

| Gem | 星數 | 述 | 源 |
|-----|------|-----|-----|
| **Lockbox** | 1.5k+ | 應用層加密 | https://github.com/ankane/lockbox |
| **Blind Index** | 1.0k+ | 加密搜尋 | https://github.com/ankane/blind_index |
| **Secure Headers** | — | 貢獻範式 | 見於 gem 引用 |

### 分析與機器學習

| Gem | 星數 | 述 | 源 |
|-----|------|-----|-----|
| **Ahoy** | 4.2k+ | Rails 分析 | https://github.com/ankane/ahoy |
| **Neighbor** | 1.1k+ | Rails 向量搜尋 | https://github.com/ankane/neighbor |
| **Rover** | 700+ | Ruby DataFrame | https://github.com/ankane/rover |
| **Tomoto** | 200+ | 主題建模 | https://github.com/ankane/tomoto-ruby |

### 工具

| Gem | 星數 | 述 | 源 |
|-----|------|-----|-----|
| **Pretender** | 2.0k+ | 以他人身份登入 | https://github.com/ankane/pretender |
| **Authtrail** | 900+ | 登入活動追蹤 | https://github.com/ankane/authtrail |
| **Notable** | 200+ | 追蹤顯著請求 | https://github.com/ankane/notable |
| **Logstop** | 200+ | 過濾敏感日誌 | https://github.com/ankane/logstop |

## 值得研讀之原始碼

### 入口範式
- https://github.com/ankane/searchkick/blob/master/lib/searchkick.rb
- https://github.com/ankane/pghero/blob/master/lib/pghero.rb
- https://github.com/ankane/strong_migrations/blob/master/lib/strong_migrations.rb
- https://github.com/ankane/lockbox/blob/master/lib/lockbox.rb

### 類別巨集實作
- https://github.com/ankane/searchkick/blob/master/lib/searchkick/model.rb
- https://github.com/ankane/lockbox/blob/master/lib/lockbox/model.rb
- https://github.com/ankane/neighbor/blob/master/lib/neighbor/model.rb
- https://github.com/ankane/blind_index/blob/master/lib/blind_index/model.rb

### Rails 整合（Railtie/Engine）
- https://github.com/ankane/pghero/blob/master/lib/pghero/engine.rb
- https://github.com/ankane/searchkick/blob/master/lib/searchkick/railtie.rb
- https://github.com/ankane/ahoy/blob/master/lib/ahoy/engine.rb
- https://github.com/ankane/blazer/blob/master/lib/blazer/engine.rb

### 資料庫配接器
- https://github.com/ankane/strong_migrations/tree/master/lib/strong_migrations/adapters
- https://github.com/ankane/groupdate/tree/master/lib/groupdate/adapters
- https://github.com/ankane/neighbor/tree/master/lib/neighbor

### 錯誤訊息（模板範式）
- https://github.com/ankane/strong_migrations/blob/master/lib/strong_migrations/error_messages.rb

### Gemspec 範例
- https://github.com/ankane/searchkick/blob/master/searchkick.gemspec
- https://github.com/ankane/neighbor/blob/master/neighbor.gemspec
- https://github.com/ankane/ahoy/blob/master/ahoy_matey.gemspec

### 測試配置
- https://github.com/ankane/searchkick/tree/master/test
- https://github.com/ankane/lockbox/tree/master/test
- https://github.com/ankane/strong_migrations/tree/master/test

## GitHub 檔案

- **檔案**: https://github.com/ankane
- **Ruby 倉庫**: https://github.com/ankane?tab=repositories&q=&type=&language=ruby&sort=stargazers
- **RubyGems**: https://rubygems.org/profiles/ankane

## 部落格文章

- **ankane.org**: https://ankane.org/
- **Gem 範式**: https://ankane.org/gem-patterns（必讀）
- **Postgres 效能**: https://ankane.org/introducing-pghero
- **搜尋要訣**: https://ankane.org/search-rails

## 設計理念要旨

研習百餘 gem 所得之一致原則：

1. **零依賴為上** — 每一依賴皆為維護負擔
2. **必用 `ActiveSupport.on_load`** — 勿直接引入 Rails gem
3. **類別巨集 DSL** — 單一方法配置一切
4. **顯式優於魔法** — 不用 `method_missing`，直接定義方法
5. **僅用 Minitest** — 簡潔足矣，不用 RSpec
6. **多版本測試** — 支援廣泛 Rails/Ruby 版本
7. **友善錯誤** — 模板訊息含修復建議
8. **抽象配接器** — 潔淨多資料庫支援
9. **Engine 隔離** — `isolate_namespace` 供可掛載 gem
10. **極簡文檔** — 碼即文檔，README 即範例
