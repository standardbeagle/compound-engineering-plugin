# 前端 — DHH Rails風

<turbo_patterns>
## Turbo模式

**Turbo Streams** 做局部更新：
```erb
<%# app/views/cards/closures/create.turbo_stream.erb %>
<%= turbo_stream.replace @card %>
```

**Morphing** 做複雜更新：
```ruby
render turbo_stream: turbo_stream.morph(@card)
```

**全域morphing** — 於layout啟用：
```ruby
turbo_refreshes_with method: :morph, scroll: :preserve
```

**片段快取** 以`cached: true`：
```erb
<%= render partial: "card", collection: @cards, cached: true %>
```

**不用ViewComponents** — 標準partial足矣。
</turbo_patterns>

<turbo_morphing>
## Turbo Morphing要訣

**監聽morph事件** 以恢復客戶端狀態：
```javascript
document.addEventListener("turbo:morph-element", (event) => {
  // Restore any client-side state after morph
})
```

**永久元素** — 以data屬性略過morph：
```erb
<div data-turbo-permanent id="notification-count">
  <%= @count %>
</div>
```

**Frame morphing** — 加refresh屬性：
```erb
<%= turbo_frame_tag :assignment, src: path, refresh: :morph %>
```

**常見問題與對策：**

| 問題 | 對策 |
|------|------|
| 計時器不更新 | 於morph事件中清除/重啟 |
| 表單重設 | 以turbo frames包裹 |
| 分頁失效 | 用turbo frames附`refresh: :morph` |
| 替換時閃爍 | 改用morph |
| localStorage遺失 | 監`turbo:morph-element`，復原狀態 |
</turbo_morphing>

<turbo_frames>
## Turbo Frames

**延遲載入** 附spinner：
```erb
<%= turbo_frame_tag "menu",
      src: menu_path,
      loading: :lazy do %>
  <div class="spinner">Loading...</div>
<% end %>
```

**行內編輯** 附edit/view切換：
```erb
<%= turbo_frame_tag dom_id(card, :edit) do %>
  <%= link_to "Edit", edit_card_path(card),
        data: { turbo_frame: dom_id(card, :edit) } %>
<% end %>
```

**定位父frame** 免硬編碼：
```erb
<%= form_with model: @card, data: { turbo_frame: "_parent" } do |f| %>
```

**即時訂閱：**
```erb
<%= turbo_stream_from @card %>
<%= turbo_stream_from @card, :activity %>
```
</turbo_frames>

<stimulus_controllers>
## Stimulus控制器

Fizzy中52控制器，62%可複用、38%領域專屬。

**特徵：**
- 每控制器單一職責
- 以values/classes配置
- 以事件通訊
- 私有方法用#
- 多數不滿50行

**範例：**

```javascript
// copy-to-clipboard (25 lines)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { content: String }

  copy() {
    navigator.clipboard.writeText(this.contentValue)
    this.#showFeedback()
  }

  #showFeedback() {
    this.element.classList.add("copied")
    setTimeout(() => this.element.classList.remove("copied"), 1500)
  }
}
```

```javascript
// auto-click (7 lines)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.click()
  }
}
```

```javascript
// toggle-class (31 lines)
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static classes = ["toggle"]
  static values = { open: { type: Boolean, default: false } }

  toggle() {
    this.openValue = !this.openValue
  }

  openValueChanged() {
    this.element.classList.toggle(this.toggleClass, this.openValue)
  }
}
```

```javascript
// auto-submit (28 lines) - debounced form submission
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { delay: { type: Number, default: 300 } }

  connect() {
    this.timeout = null
  }

  submit() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.element.requestSubmit()
    }, this.delayValue)
  }

  disconnect() {
    clearTimeout(this.timeout)
  }
}
```

```javascript
// dialog (45 lines) - native HTML dialog management
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  open() {
    this.element.showModal()
  }

  close() {
    this.element.close()
    this.dispatch("closed")
  }

  clickOutside(event) {
    if (event.target === this.element) this.close()
  }
}
```

```javascript
// local-time (40 lines) - relative time display
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { datetime: String }

  connect() {
    this.#updateTime()
  }

  #updateTime() {
    const date = new Date(this.datetimeValue)
    const now = new Date()
    const diffMinutes = Math.floor((now - date) / 60000)

    if (diffMinutes < 60) {
      this.element.textContent = `${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      this.element.textContent = `${Math.floor(diffMinutes / 60)}h ago`
    } else {
      this.element.textContent = `${Math.floor(diffMinutes / 1440)}d ago`
    }
  }
}
```
</stimulus_controllers>

<stimulus_best_practices>
## Stimulus要訣

**Values API** 勝getAttribute：
```javascript
// Good
static values = { delay: { type: Number, default: 300 } }

// Avoid
this.element.getAttribute("data-delay")
```

**disconnect中清理：**
```javascript
disconnect() {
  clearTimeout(this.timeout)
  this.observer?.disconnect()
  document.removeEventListener("keydown", this.boundHandler)
}
```

**動作篩選** — `:self`防止冒泡：
```erb
<div data-action="click->menu#toggle:self">
```

**輔助抽取** — 共用工具置於獨立模組：
```javascript
// app/javascript/helpers/timing.js
export function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
```

**事件派發** 以鬆耦合：
```javascript
this.dispatch("selected", { detail: { id: this.idValue } })
```
</stimulus_best_practices>

<view_helpers>
## View輔助（整合Stimulus）

**Dialog輔助：**
```ruby
def dialog_tag(id, &block)
  tag.dialog(
    id: id,
    data: {
      controller: "dialog",
      action: "click->dialog#clickOutside keydown.esc->dialog#close"
    },
    &block
  )
end
```

**自動提交表單輔助：**
```ruby
def auto_submit_form_with(model:, delay: 300, **options, &block)
  form_with(
    model: model,
    data: {
      controller: "auto-submit",
      auto_submit_delay_value: delay,
      action: "input->auto-submit#submit"
    },
    **options,
    &block
  )
end
```

**複製按鈕輔助：**
```ruby
def copy_button(content:, label: "Copy")
  tag.button(
    label,
    data: {
      controller: "copy",
      copy_content_value: content,
      action: "click->copy#copy"
    }
  )
end
```
</view_helpers>

<css_architecture>
## CSS架構

原生CSS配現代特性，無預處理器。

**CSS @layer** 控制層疊：
```css
@layer reset, base, components, modules, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer base {
  body { font-family: var(--font-sans); }
}

@layer components {
  .btn { /* button styles */ }
}

@layer modules {
  .card { /* card module styles */ }
}

@layer utilities {
  .hidden { display: none; }
}
```

**OKLCH色彩系統** 以感知均勻：
```css
:root {
  --color-primary: oklch(60% 0.15 250);
  --color-success: oklch(65% 0.2 145);
  --color-warning: oklch(75% 0.15 85);
  --color-danger: oklch(55% 0.2 25);
}
```

**暗色模式** 以CSS變數：
```css
:root {
  --bg: oklch(98% 0 0);
  --text: oklch(20% 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: oklch(15% 0 0);
    --text: oklch(90% 0 0);
  }
}
```

**原生CSS巢狀：**
```css
.card {
  padding: var(--space-4);

  & .title {
    font-weight: bold;
  }

  &:hover {
    background: var(--bg-hover);
  }
}
```

**約60精簡工具類** vs Tailwind數百。

**所用現代特性：**
- `@starting-style` 供進入動畫
- `color-mix()` 供色彩操縱
- `:has()` 供父選取
- 邏輯屬性（`margin-inline`、`padding-block`）
- Container queries
</css_architecture>

<view_patterns>
## View模式

**標準partial** — 無ViewComponents：
```erb
<%# app/views/cards/_card.html.erb %>
<article id="<%= dom_id(card) %>" class="card">
  <%= render "cards/header", card: card %>
  <%= render "cards/body", card: card %>
  <%= render "cards/footer", card: card %>
</article>
```

**片段快取：**
```erb
<% cache card do %>
  <%= render "cards/card", card: card %>
<% end %>
```

**集合快取：**
```erb
<%= render partial: "card", collection: @cards, cached: true %>
```

**簡潔組件命名** — 無嚴格BEM：
```css
.card { }
.card .title { }
.card .actions { }
.card.golden { }
.card.closed { }
```
</view_patterns>

<caching_with_personalization>
## 快取中之用戶專屬內容

將個人化移至客戶端JS以保快取：

```erb
<%# Cacheable fragment %>
<% cache card do %>
  <article class="card"
           data-creator-id="<%= card.creator_id %>"
           data-controller="ownership"
           data-ownership-current-user-value="<%= Current.user.id %>">
    <button data-ownership-target="ownerOnly" class="hidden">Delete</button>
  </article>
<% end %>
```

```javascript
// Reveal user-specific elements after cache hit
export default class extends Controller {
  static values = { currentUser: Number }
  static targets = ["ownerOnly"]

  connect() {
    const creatorId = parseInt(this.element.dataset.creatorId)
    if (creatorId === this.currentUserValue) {
      this.ownerOnlyTargets.forEach(el => el.classList.remove("hidden"))
    }
  }
}
```

**動態內容抽取至獨立frames：**
```erb
<% cache [card, board] do %>
  <article class="card">
    <%= turbo_frame_tag card, :assignment,
          src: card_assignment_path(card),
          refresh: :morph %>
  </article>
<% end %>
```

指派下拉獨立更新，不致父快取失效。
</caching_with_personalization>

<broadcasting>
## 以Turbo Streams廣播

**Model回呼** 供即時更新：
```ruby
class Card < ApplicationRecord
  include Broadcastable

  after_create_commit :broadcast_created
  after_update_commit :broadcast_updated
  after_destroy_commit :broadcast_removed

  private
    def broadcast_created
      broadcast_append_to [Current.account, board], :cards
    end

    def broadcast_updated
      broadcast_replace_to [Current.account, board], :cards
    end

    def broadcast_removed
      broadcast_remove_to [Current.account, board], :cards
    end
end
```

**依租戶限域** 以`[Current.account, resource]`模式。
</broadcasting>
