# Gems — DHH Rails風

<what_they_use>
## 37signals所用

**核心Rails棧：**
- turbo-rails, stimulus-rails, importmap-rails
- propshaft（資產管線）

**資料庫為後端服務（Solid套件）：**
- solid_queue — 背景作業
- solid_cache — 快取
- solid_cable — WebSockets/Action Cable

**認證與安全：**
- bcrypt（密碼雜湊）

**自製gems：**
- geared_pagination（遊標分頁）
- lexxy（富文本編輯器）
- mittens（mailer工具）

**工具：**
- rqrcode（QR碼生成）
- redcarpet + rouge（Markdown渲染）
- web-push（推播通知）

**部署與維運：**
- kamal（Docker部署）
- thruster（HTTP/2代理）
- mission_control-jobs（作業監控）
- autotuner（GC調校）
</what_they_use>

<what_they_avoid>
## 刻意不用之物

**認證：**
```
devise → 自製~150行認證
```
緣由：完全掌控、magic link無密碼責任、更簡。

**授權：**
```
pundit/cancancan → Model中簡單角色檢查
```
緣由：多數應用無需policy物件。Model上一方法足矣：
```ruby
class Board < ApplicationRecord
  def editable_by?(user)
    user.admin? || user == creator
  end
end
```

**背景作業：**
```
sidekiq → Solid Queue
```
緣由：資料庫為後端→無Redis→同享事務保證。

**快取：**
```
redis → Solid Cache
```
緣由：資料庫已在，基礎設施更簡。

**搜尋：**
```
elasticsearch → 自製分片搜尋
```
緣由：精建所需，無外部服務依賴。

**View層：**
```
view_component → 標準partial
```
緣由：partial足矣。ViewComponents增複雜而無明確益處。

**API：**
```
GraphQL → REST + Turbo
```
緣由：兩端自控時REST已足。GraphQL複雜度無正當理由。

**工廠：**
```
factory_bot → Fixtures
```
緣由：Fixtures更簡、更快、促使先思資料關聯。

**服務物件：**
```
Interactor, Trailblazer → 胖Model
```
緣由：業務邏輯留於model。`card.close`而非`CardCloser.call(card)`。

**表單物件：**
```
Reform, dry-validation → params.expect + model驗證
```
緣由：Rails 7.1之`params.expect`已夠清爽。情境驗證放model。

**裝飾器：**
```
Draper → View helper + partial
```
緣由：helper與partial更簡，無裝飾器間接層。

**CSS：**
```
Tailwind, Sass → 原生CSS
```
緣由：現代CSS有巢狀、變數、layer。無須建置步驟。

**前端：**
```
React, Vue, SPA → Turbo + Stimulus
```
緣由：伺服端渲染HTML配少量JS。SPA複雜度無正當理由。

**測試：**
```
RSpec → Minitest
```
緣由：更簡、啟動更快、少DSL魔術、Rails內建。
</what_they_avoid>

<testing_philosophy>
## 測試哲學

**Minitest** — 更簡、更快：
```ruby
class CardTest < ActiveSupport::TestCase
  test "closing creates closure" do
    card = cards(:one)
    assert_difference -> { Card::Closure.count } do
      card.close
    end
    assert card.closed?
  end
end
```

**Fixtures** — 載一次、確定性：
```yaml
# test/fixtures/cards.yml
open_card:
  title: Open Card
  board: main
  creator: alice

closed_card:
  title: Closed Card
  board: main
  creator: bob
```

**動態時間戳** 以ERB：
```yaml
recent:
  title: Recent
  created_at: <%= 1.hour.ago %>

old:
  title: Old
  created_at: <%= 1.month.ago %>
```

**時間旅行** 供時間相關測試：
```ruby
test "expires after 15 minutes" do
  magic_link = MagicLink.create!(user: users(:alice))

  travel 16.minutes

  assert magic_link.expired?
end
```

**VCR** 供外部API：
```ruby
VCR.use_cassette("stripe/charge") do
  charge = Stripe::Charge.create(amount: 1000)
  assert charge.paid
end
```

**測試隨功能交付** — 同一commit，非先非後。
</testing_philosophy>

<decision_framework>
## 決策框架

加gem前自問：

1. **原生Rails能否為之？**
   - ActiveRecord能做Sequel大部分事
   - ActionMailer處理信件無礙
   - ActiveJob應付大部分作業需求

2. **複雜度值得否？**
   - 150行自製碼 vs 10,000行gem
   - 自製碼更易理解
   - 升級頭痛更少

3. **是否增加基礎設施？**
   - Redis？考慮資料庫為後端之替代
   - 外部服務？考慮自建
   - 基礎設施越簡→故障點越少

4. **來源可信否？**
   - 37signals gems：經規模驗證
   - 維護良好、聚焦之gem：通常可用
   - 大雜燴gem：多半多餘

**哲學：**
> "先建方案，再找gem。"

非反gem，乃主理解。gem當解真實問題，非可能問題。
</decision_framework>

<gem_patterns>
## Gem使用模式

**分頁：**
```ruby
# geared_pagination - cursor-based
class CardsController < ApplicationController
  def index
    @cards = @board.cards.geared(page: params[:page])
  end
end
```

**Markdown：**
```ruby
# redcarpet + rouge
class MarkdownRenderer
  def self.render(text)
    Redcarpet::Markdown.new(
      Redcarpet::Render::HTML.new(filter_html: true),
      autolink: true,
      fenced_code_blocks: true
    ).render(text)
  end
end
```

**背景作業：**
```ruby
# solid_queue - no Redis
class ApplicationJob < ActiveJob::Base
  queue_as :default
  # Just works, backed by database
end
```

**快取：**
```ruby
# solid_cache - no Redis
# config/environments/production.rb
config.cache_store = :solid_cache_store
```
</gem_patterns>
