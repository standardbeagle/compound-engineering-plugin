# 控制器 — DHH Rails風

<rest_mapping>
## 萬物歸CRUD

自訂動作化為新資源。動詞改名詞：

```ruby
# Instead of this:
POST /cards/:id/close
DELETE /cards/:id/close
POST /cards/:id/archive

# Do this:
POST /cards/:id/closure      # create closure
DELETE /cards/:id/closure    # destroy closure
POST /cards/:id/archival     # create archival
```

**37signals實例：**
```ruby
resources :cards do
  resource :closure       # closing/reopening
  resource :goldness      # marking important
  resource :not_now       # postponing
  resources :assignments  # managing assignees
end
```

每資源各擁控制器，行標準CRUD動作。
</rest_mapping>

<controller_concerns>
## 關切共用行為

控制器廣用concerns。常見模式：

**CardScoped** — 載@card、@board，供render_card_replacement
```ruby
module CardScoped
  extend ActiveSupport::Concern

  included do
    before_action :set_card
  end

  private
    def set_card
      @card = Card.find(params[:card_id])
      @board = @card.board
    end

    def render_card_replacement
      render turbo_stream: turbo_stream.replace(@card)
    end
end
```

**BoardScoped** — 載@board
**CurrentRequest** — 填Current以請求資料
**CurrentTimezone** — 以用戶時區包裹請求
**FilterScoped** — 處理複雜篩選
**TurboFlash** — 以Turbo Stream傳閃訊
**ViewTransitions** — 頁面刷新時停用
**BlockSearchEngineIndexing** — 設X-Robots-Tag標頭
**RequestForgeryProtection** — Sec-Fetch-Site CSRF（現代瀏覽器）
</controller_concerns>

<authorization_patterns>
## 授權模式

控制器以before_action查驗許可，model定義許可含義：

```ruby
# Controller concern
module Authorization
  extend ActiveSupport::Concern

  private
    def ensure_can_administer
      head :forbidden unless Current.user.admin?
    end

    def ensure_is_staff_member
      head :forbidden unless Current.user.staff?
    end
end

# Usage
class BoardsController < ApplicationController
  before_action :ensure_can_administer, only: [:destroy]
end
```

**Model層授權：**
```ruby
class Board < ApplicationRecord
  def editable_by?(user)
    user.admin? || user == creator
  end

  def publishable_by?(user)
    editable_by?(user) && !published?
  end
end
```

授權宜簡、可讀、與領域同置。
</authorization_patterns>

<security_concerns>
## 安全關切

**Sec-Fetch-Site CSRF防護：**
現代瀏覽器傳Sec-Fetch-Site標頭。以之為縱深防禦：

```ruby
module RequestForgeryProtection
  extend ActiveSupport::Concern

  included do
    before_action :verify_request_origin
  end

  private
    def verify_request_origin
      return if request.get? || request.head?
      return if %w[same-origin same-site].include?(
        request.headers["Sec-Fetch-Site"]&.downcase
      )
      # Fall back to token verification for older browsers
      verify_authenticity_token
    end
end
```

**速率限制（Rails 8+）：**
```ruby
class MagicLinksController < ApplicationController
  rate_limit to: 10, within: 15.minutes, only: :create
end
```

適用於：認證端點、寄信、外部API呼叫、資源建立。
</security_concerns>

<request_context>
## 請求上下文關切

**CurrentRequest** — 填Current以HTTP元資料：
```ruby
module CurrentRequest
  extend ActiveSupport::Concern

  included do
    before_action :set_current_request
  end

  private
    def set_current_request
      Current.request_id = request.request_id
      Current.user_agent = request.user_agent
      Current.ip_address = request.remote_ip
      Current.referrer = request.referrer
    end
end
```

**CurrentTimezone** — 以用戶時區包裹請求：
```ruby
module CurrentTimezone
  extend ActiveSupport::Concern

  included do
    around_action :set_timezone
    helper_method :timezone_from_cookie
  end

  private
    def set_timezone
      Time.use_zone(timezone_from_cookie) { yield }
    end

    def timezone_from_cookie
      cookies[:timezone] || "UTC"
    end
end
```

**SetPlatform** — 偵測mobile/desktop：
```ruby
module SetPlatform
  extend ActiveSupport::Concern

  included do
    helper_method :platform
  end

  def platform
    @platform ||= request.user_agent&.match?(/Mobile|Android/) ? :mobile : :desktop
  end
end
```
</request_context>

<turbo_responses>
## Turbo Stream回應

以Turbo Stream做局部更新：

```ruby
class Cards::ClosuresController < ApplicationController
  include CardScoped

  def create
    @card.close
    render_card_replacement
  end

  def destroy
    @card.reopen
    render_card_replacement
  end
end
```

複雜更新用morphing：
```ruby
render turbo_stream: turbo_stream.morph(@card)
```
</turbo_responses>

<api_patterns>
## API設計

同控制器，異格式。回應慣例：

```ruby
def create
  @card = Card.create!(card_params)

  respond_to do |format|
    format.html { redirect_to @card }
    format.json { head :created, location: @card }
  end
end

def update
  @card.update!(card_params)

  respond_to do |format|
    format.html { redirect_to @card }
    format.json { head :no_content }
  end
end

def destroy
  @card.destroy

  respond_to do |format|
    format.html { redirect_to cards_path }
    format.json { head :no_content }
  end
end
```

**狀態碼：**
- Create: 201 Created + Location標頭
- Update: 204 No Content
- Delete: 204 No Content
- Bearer token認證
</api_patterns>

<http_caching>
## HTTP快取

廣用ETags與條件GET：

```ruby
class CardsController < ApplicationController
  def show
    @card = Card.find(params[:id])
    fresh_when etag: [@card, Current.user.timezone]
  end

  def index
    @cards = @board.cards.preloaded
    fresh_when etag: [@cards, @board.updated_at]
  end
end
```

要旨：伺服端以用戶時區渲染時間→時區須入ETag→免錯投他區。

**ApplicationController全域etag：**
```ruby
class ApplicationController < ActionController::Base
  etag { "v1" }  # Bump to invalidate all caches
end
```

以`touch: true`於關聯做快取失效。
</http_caching>
