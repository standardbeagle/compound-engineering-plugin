# Model — DHH Rails風

<model_concerns>
## 關切供橫切行為

Model廣用concerns。典型Card model含14+concerns：

```ruby
class Card < ApplicationRecord
  include Assignable
  include Attachments
  include Broadcastable
  include Closeable
  include Colored
  include Eventable
  include Golden
  include Mentions
  include Multistep
  include Pinnable
  include Postponable
  include Readable
  include Searchable
  include Taggable
  include Watchable
end
```

每concern自含關聯、scope與方法。

**命名：** 形容詞描述能力（`Closeable`、`Publishable`、`Watchable`）
</model_concerns>

<state_records>
## 狀態即記錄，非布林值

布林欄改為獨立記錄：

```ruby
# Instead of:
closed: boolean
is_golden: boolean
postponed: boolean

# Create records:
class Card::Closure < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

class Card::Goldness < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end

class Card::NotNow < ApplicationRecord
  belongs_to :card
  belongs_to :creator, class_name: "User"
end
```

**益處：**
- 自動時間戳（何時發生）
- 追蹤誰做更改
- 以join與`where.missing`輕鬆篩選
- 利於富UI顯示何時/誰

**於model中：**
```ruby
module Closeable
  extend ActiveSupport::Concern

  included do
    has_one :closure, dependent: :destroy
  end

  def closed?
    closure.present?
  end

  def close(creator: Current.user)
    create_closure!(creator: creator)
  end

  def reopen
    closure&.destroy
  end
end
```

**查詢：**
```ruby
Card.joins(:closure)         # closed cards
Card.where.missing(:closure) # open cards
```
</state_records>

<callbacks>
## 回呼 — 審慎使用

Fizzy中30檔僅38處回呼。準則：

**用於：**
- `after_commit` 供非同步工作
- `before_save` 供衍生資料
- `after_create_commit` 供副作用

**避免：**
- 複雜回呼鏈
- 回呼中置業務邏輯
- 同步外部呼叫

```ruby
class Card < ApplicationRecord
  after_create_commit :notify_watchers_later
  before_save :update_search_index, if: :title_changed?

  private
    def notify_watchers_later
      NotifyWatchersJob.perform_later(self)
    end
end
```
</callbacks>

<scopes>
## Scope命名

標準scope名稱：

```ruby
class Card < ApplicationRecord
  scope :chronologically, -> { order(created_at: :asc) }
  scope :reverse_chronologically, -> { order(created_at: :desc) }
  scope :alphabetically, -> { order(title: :asc) }
  scope :latest, -> { reverse_chronologically.limit(10) }

  # Standard eager loading
  scope :preloaded, -> { includes(:creator, :assignees, :tags) }

  # Parameterized
  scope :indexed_by, ->(column) { order(column => :asc) }
  scope :sorted_by, ->(column, direction = :asc) { order(column => direction) }
end
```
</scopes>

<poros>
## 純Ruby物件

POROs置於父model命名空間下：

```ruby
# app/models/event/description.rb
class Event::Description
  def initialize(event)
    @event = event
  end

  def to_s
    # Presentation logic for event description
  end
end

# app/models/card/eventable/system_commenter.rb
class Card::Eventable::SystemCommenter
  def initialize(card)
    @card = card
  end

  def comment(message)
    # Business logic
  end
end

# app/models/user/filtering.rb
class User::Filtering
  # View context bundling
end
```

**非服務物件。** 業務邏輯留於model。
</poros>

<verbs_predicates>
## 方法命名

**動詞** — 改變狀態之動作：
```ruby
card.close
card.reopen
card.gild      # make golden
card.ungild
board.publish
board.archive
```

**述詞** — 由狀態衍生之查詢：
```ruby
card.closed?    # closure.present?
card.golden?    # goldness.present?
board.published?
```

**避免** 泛用setter：
```ruby
# Bad
card.set_closed(true)
card.update_golden_status(false)

# Good
card.close
card.ungild
```
</verbs_predicates>

<validation_philosophy>
## 驗證哲學

Model上最少驗證。情境驗證放表單/操作物件：

```ruby
# Model - minimal
class User < ApplicationRecord
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end

# Form object - contextual
class Signup
  include ActiveModel::Model

  attr_accessor :email, :name, :terms_accepted

  validates :email, :name, presence: true
  validates :terms_accepted, acceptance: true

  def save
    return false unless valid?
    User.create!(email: email, name: name)
  end
end
```

**偏好資料庫約束** 勝model驗證以保資料完整性：
```ruby
# migration
add_index :users, :email, unique: true
add_foreign_key :cards, :boards
```
</validation_philosophy>

<error_handling>
## 任其崩潰哲學

用bang方法，失敗時拋異常：

```ruby
# Preferred - raises on failure
@card = Card.create!(card_params)
@card.update!(title: new_title)
@comment.destroy!

# Avoid - silent failures
@card = Card.create(card_params)  # returns false on failure
if @card.save
  # ...
end
```

任錯誤自然傳播。Rails以422回應處理ActiveRecord::RecordInvalid。
</error_handling>

<default_values>
## Lambda預設值

以lambda預設值搭配Current關聯：

```ruby
class Card < ApplicationRecord
  belongs_to :creator, class_name: "User", default: -> { Current.user }
  belongs_to :account, default: -> { Current.account }
end

class Comment < ApplicationRecord
  belongs_to :commenter, class_name: "User", default: -> { Current.user }
end
```

Lambda確保建立時動態解析。
</default_values>

<rails_71_patterns>
## Rails 7.1+ Model模式

**Normalizes** — 驗證前淨化資料：
```ruby
class User < ApplicationRecord
  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :phone, with: ->(phone) { phone.gsub(/\D/, "") }
end
```

**Delegated Types** — 取代多型關聯：
```ruby
class Message < ApplicationRecord
  delegated_type :messageable, types: %w[Comment Reply Announcement]
end

# Now you get:
message.comment?        # true if Comment
message.comment         # returns the Comment
Message.comments        # scope for Comment messages
```

**Store Accessor** — 結構化JSON儲存：
```ruby
class User < ApplicationRecord
  store :settings, accessors: [:theme, :notifications_enabled], coder: JSON
end

user.theme = "dark"
user.notifications_enabled = true
```
</rails_71_patterns>

<concern_guidelines>
## Concern準則

- **50-150行** 每concern（多數~100）
- **內聚** — 僅含相關功能
- **以能力命名** — `Closeable`、`Watchable`，非`CardHelpers`
- **自含** — 關聯、scope、方法同處
- **非僅為組織** — 真有複用需求時方建

**Touch鏈** 供快取失效：
```ruby
class Comment < ApplicationRecord
  belongs_to :card, touch: true
end

class Card < ApplicationRecord
  belongs_to :board, touch: true
end
```

comment更新→card之`updated_at`變→傳播至board。

**事務包裹** 供相關更新：
```ruby
class Card < ApplicationRecord
  def close(creator: Current.user)
    transaction do
      create_closure!(creator: creator)
      record_event(:closed)
      notify_watchers_later
    end
  end
end
```
</concern_guidelines>
