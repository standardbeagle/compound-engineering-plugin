# 測試 — DHH Rails風

## 核心哲學

「Minitest配fixtures — 簡、快、確定性。」此法重實用勝慣例。

## 何以Minitest勝RSpec

- **更簡**：少DSL魔術，純Ruby斷言
- **Rails內建**：無額外依賴
- **啟動更快**：負擔更少
- **純Ruby**：無特殊語法可學

## Fixtures為測試資料

工廠之外，fixtures提供預載資料：
- 載一次，跨測試複用
- 無運行時物件建立負擔
- 關聯一目了然
- 確定性ID便於除錯

### Fixture結構
```yaml
# test/fixtures/users.yml
david:
  identity: david
  account: basecamp
  role: admin

jason:
  identity: jason
  account: basecamp
  role: member

# test/fixtures/rooms.yml
watercooler:
  name: Water Cooler
  creator: david
  direct: false

# test/fixtures/messages.yml
greeting:
  body: Hello everyone!
  room: watercooler
  creator: david
```

### 於測試中用Fixtures
```ruby
test "sending a message" do
  user = users(:david)
  room = rooms(:watercooler)

  # Test with fixture data
end
```

### 動態Fixture值
ERB啟用時間敏感資料：
```yaml
recent_card:
  title: Recent Card
  created_at: <%= 1.hour.ago %>

old_card:
  title: Old Card
  created_at: <%= 1.month.ago %>
```

## 測試組織

### 單元測試
以setup區塊與標準斷言驗證業務邏輯：

```ruby
class CardTest < ActiveSupport::TestCase
  setup do
    @card = cards(:one)
    @user = users(:david)
  end

  test "closing a card creates a closure" do
    assert_difference -> { Card::Closure.count } do
      @card.close(creator: @user)
    end

    assert @card.closed?
    assert_equal @user, @card.closure.creator
  end

  test "reopening a card destroys the closure" do
    @card.close(creator: @user)

    assert_difference -> { Card::Closure.count }, -1 do
      @card.reopen
    end

    refute @card.closed?
  end
end
```

### 整合測試
測完整請求/回應週期：

```ruby
class CardsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:david)
    sign_in @user
  end

  test "closing a card" do
    card = cards(:one)

    post card_closure_path(card)

    assert_response :success
    assert card.reload.closed?
  end

  test "unauthorized user cannot close card" do
    sign_in users(:guest)
    card = cards(:one)

    post card_closure_path(card)

    assert_response :forbidden
    refute card.reload.closed?
  end
end
```

### 系統測試
以Capybara做瀏覽器測試：

```ruby
class MessagesTest < ApplicationSystemTestCase
  test "sending a message" do
    sign_in users(:david)
    visit room_path(rooms(:watercooler))

    fill_in "Message", with: "Hello, world!"
    click_button "Send"

    assert_text "Hello, world!"
  end

  test "editing own message" do
    sign_in users(:david)
    visit room_path(rooms(:watercooler))

    within "#message_#{messages(:greeting).id}" do
      click_on "Edit"
    end

    fill_in "Message", with: "Updated message"
    click_button "Save"

    assert_text "Updated message"
  end

  test "drag and drop card to new column" do
    sign_in users(:david)
    visit board_path(boards(:main))

    card = find("#card_#{cards(:one).id}")
    target = find("#column_#{columns(:done).id}")

    card.drag_to target

    assert_selector "#column_#{columns(:done).id} #card_#{cards(:one).id}"
  end
end
```

## 進階模式

### 時間測試
以`travel_to`做確定性時間斷言：

```ruby
test "card expires after 30 days" do
  card = cards(:one)

  travel_to 31.days.from_now do
    assert card.expired?
  end
end
```

### 外部API測試以VCR
錄製並重播HTTP互動：

```ruby
test "fetches user data from API" do
  VCR.use_cassette("user_api") do
    user_data = ExternalApi.fetch_user(123)

    assert_equal "John", user_data[:name]
  end
end
```

### 背景作業測試
斷言作業排入與信件投遞：

```ruby
test "closing card enqueues notification job" do
  card = cards(:one)

  assert_enqueued_with(job: NotifyWatchersJob, args: [card]) do
    card.close
  end
end

test "welcome email is sent on signup" do
  assert_emails 1 do
    Identity.create!(email: "new@example.com")
  end
end
```

### 測Turbo Streams
```ruby
test "message creation broadcasts to room" do
  room = rooms(:watercooler)

  assert_turbo_stream_broadcasts [room, :messages] do
    room.messages.create!(body: "Test", creator: users(:david))
  end
end
```

## 測試原則

### 1. 測可觀察行為
聚焦於做什麼，非怎麼做：

```ruby
# ❌ 測實作
test "calls notify method on each watcher" do
  card.expects(:notify).times(3)
  card.close
end

# ✅ 測行為
test "watchers receive notifications when card closes" do
  assert_difference -> { Notification.count }, 3 do
    card.close
  end
end
```

### 2. 勿萬事皆mock

```ruby
# ❌ 過度mock
test "sending message" do
  room = mock("room")
  user = mock("user")
  message = mock("message")

  room.expects(:messages).returns(stub(create!: message))
  message.expects(:broadcast_create)

  MessagesController.new.create
end

# ✅ 測真實物
test "sending message" do
  sign_in users(:david)
  post room_messages_url(rooms(:watercooler)),
    params: { message: { body: "Hello" } }

  assert_response :success
  assert Message.exists?(body: "Hello")
end
```

### 3. 測試隨功能交付
同一commit，非TDD先行亦非延後。非先（嚴格TDD）非後（遞延測試）。

### 4. 安全修復恆附回歸測試
每項安全修復須含一能捕捉該漏洞之測試。

### 5. 整合測試驗完整工作流
勿僅測個別部件 — 測其協作。

## 檔案組織

```
test/
├── controllers/         # 控制器整合測試
├── fixtures/           # 全model之YAML fixtures
├── helpers/            # 輔助方法測試
├── integration/        # API整合測試
├── jobs/               # 背景作業測試
├── mailers/            # Mailer測試
├── models/             # Model單元測試
├── system/             # 瀏覽器系統測試
└── test_helper.rb      # 測試配置
```

## Test Helper設定

```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  fixtures :all

  parallelize(workers: :number_of_processors)
end

class ActionDispatch::IntegrationTest
  include SignInHelper
end

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome
end
```

## 登入輔助

```ruby
# test/support/sign_in_helper.rb
module SignInHelper
  def sign_in(user)
    session = user.identity.sessions.create!
    cookies.signed[:session_id] = session.id
  end
end
```
