---
name: ce-dhh-rails-style
description: 撰寫 DHH 獨特之 37signals 風格 Ruby 與 Rails 程式碼時使用。適用於撰寫 Ruby 程式碼、Rails 應用、建立模型、控制器或任何 Ruby 檔案。觸發於 Ruby/Rails 程式碼生成、重構請求、碼審，或用戶提及 DHH、37signals、Basecamp、HEY 或 Campfire 風格。體現 REST 純粹性、胖模型瘦控制器、Current 屬性、Hotwire 模式及「清晰勝於取巧」哲學。
---

<objective>
將 37signals/DHH Rails 慣例套用於 Ruby 與 Rails 程式碼。此技能提供自分析 37signals 生產程式碼庫（Fizzy/Campfire）及 DHH 碼審模式中萃取之全面領域專業知識。
</objective>

<essential_principles>
## 核心哲學

"最好的程式碼是你不用寫的程式碼。次好的是一看就知道正確的程式碼。"

**原味 Rails 綽綽有餘：**
- 豐富領域模型勝於服務物件
- CRUD 控制器勝於自訂動作
- Concerns 用於水平程式碼共享
- 以記錄作為狀態而非布林欄位
- 一切以資料庫為後盾（不用 Redis）
- 先建方案再找 gem

**刻意避開之物：**
- devise（自製約 150 行認證取代）
- pundit/cancancan（模型中簡單角色檢查）
- sidekiq（Solid Queue 使用資料庫）
- redis（一切用資料庫）
- view_component（partial 即可）
- GraphQL（REST 搭 Turbo 已足）
- factory_bot（fixtures 更簡單）
- rspec（Minitest 隨 Rails 附帶）
- Tailwind（原生 CSS with layers）

**開發哲學：**
- 發布、驗證、精煉——原型品質程式碼上線以學習
- 修根因而非症狀
- 寫入時計算勝於讀取時計算
- 資料庫約束勝於 ActiveRecord 驗證
</essential_principles>

<intake>
正在做什麼？

1. **Controllers** - REST 映射、concerns、Turbo 回應、API 模式
2. **Models** - Concerns、狀態記錄、回呼、scope、PORO
3. **Views & Frontend** - Turbo、Stimulus、CSS、partial
4. **Architecture** - 路由、多租戶、認證、工作、快取
5. **Testing** - Minitest、fixtures、整合測試
6. **Gems & Dependencies** - 用什麼 vs. 避什麼
7. **Code Review** - 依 DHH 風格審查程式碼
8. **General Guidance** - 哲學與慣例

**輸入編號或描述任務。**
</intake>

<routing>

| 回應 | 讀取參照 |
|----------|-------------------|
| 1, controller | `references/controllers.md` |
| 2, model | `references/models.md` |
| 3, view, frontend, turbo, stimulus, css | `references/frontend.md` |
| 4, architecture, routing, auth, job, cache | `references/architecture.md` |
| 5, test, testing, minitest, fixture | `references/testing.md` |
| 6, gem, dependency, library | `references/gems.md` |
| 7, review | 讀取所有參照後審查程式碼 |
| 8, general task | 依上下文讀取相關參照 |

**讀取相關參照後，將模式套用於用戶之程式碼。**
</routing>

<quick_reference>
## 命名慣例

**動詞：** `card.close`、`card.gild`、`board.publish`（非 `set_style` 方法）

**述詞：** `card.closed?`、`card.golden?`（自關聯記錄之存在推導）

**Concerns：** 形容詞描述能力（`Closeable`、`Publishable`、`Watchable`）

**控制器：** 名詞匹配資源（`Cards::ClosuresController`）

**Scope：**
- `chronologically`、`reverse_chronologically`、`alphabetically`、`latest`
- `preloaded`（標準預載名稱）
- `indexed_by`、`sorted_by`（參數化）
- `active`、`unassigned`（業務術語，非 SQL 風格）

## REST 映射

以新建資源取代自訂動作：

```
POST /cards/:id/close    → POST /cards/:id/closure
DELETE /cards/:id/close  → DELETE /cards/:id/closure
POST /cards/:id/archive  → POST /cards/:id/archival
```

## Ruby 語法偏好

```ruby
# Symbol arrays with spaces inside brackets
before_action :set_message, only: %i[ show edit update destroy ]

# Private method indentation
  private
    def set_message
      @message = Message.find(params[:id])
    end

# Expression-less case for conditionals
case
when params[:before].present?
  messages.page_before(params[:before])
else
  messages.last_page
end

# Bang methods for fail-fast
@message = Message.create!(params)

# Ternaries for simple conditionals
@room.direct? ? @room.users : @message.mentionees
```

## 關鍵模式

**狀態即記錄：**
```ruby
Card.joins(:closure)         # closed cards
Card.where.missing(:closure) # open cards
```

**Current 屬性：**
```ruby
belongs_to :creator, default: -> { Current.user }
```

**模型上之授權：**
```ruby
class User < ApplicationRecord
  def can_administer?(message)
    message.creator == self || admin?
  end
end
```
</quick_reference>

<reference_index>
## 領域知識

所有詳細模式於 `references/`：

| 檔案 | 主題 |
|------|--------|
| `references/controllers.md` | REST 映射、concerns、Turbo 回應、API 模式、HTTP 快取 |
| `references/models.md` | Concerns、狀態記錄、回呼、scope、PORO、授權、廣播 |
| `references/frontend.md` | Turbo Streams、Stimulus 控制器、CSS layers、OKLCH 色彩、partial |
| `references/architecture.md` | 路由、認證、工作、Current 屬性、快取、資料庫模式 |
| `references/testing.md` | Minitest、fixtures、單元/整合/系統測試、測試模式 |
| `references/gems.md` | 用什麼 vs. 避什麼、決策框架、Gemfile 範例 |
</reference_index>

<success_criteria>
程式碼遵循 DHH 風格當：
- 控制器映射至資源之 CRUD 動詞
- 模型以 concerns 實現水平行為
- 狀態以記錄追蹤，非布林值
- 無不必要之服務物件或抽象
- 偏好資料庫方案勝於外部服務
- 測試使用 Minitest 搭配 fixtures
- Turbo/Stimulus 處理互動（無重型 JS 框架）
- 原生 CSS 使用現代特性（layers、OKLCH、nesting）
- 授權邏輯位於 User 模型
- 工作為呼叫模型方法之淺層包裝
</success_criteria>

<credits>
基於 [The Unofficial 37signals/DHH Rails Style Guide](https://github.com/marckohlbrugge/unofficial-37signals-coding-style-guide)，由 [Marc Köhlbrugge](https://x.com/marckohlbrugge) 透過深度分析 Fizzy 程式碼庫 265 個拉取請求生成。

**重要聲明：**
- LLM 生成之指南——可能含不準確之處
- Fizzy 程式碼範例依 O'Saasy License 授權
- 與 37signals 無從屬或認可關係
</credits>
