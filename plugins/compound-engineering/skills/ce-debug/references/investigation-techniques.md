# 調查技法

標準代碼追蹤不足時之深層技法。缺陷不可靠重現、涉時序或並行、或需框架特定追蹤時載入。

---

## 根因追蹤

缺陷顯現於調用棧深處時，本能乃在錯誤出現處修復。此治症狀。當逆調用鏈追溯惡態之源。

**逆向追蹤：**

- 從錯誤處起始
- 每層問：此值何來？誰調此函？傳入何態？
- 持續上游直至有效狀態首次變為無效之處——即根因

**實例：**

```
Symptom: API returns 500 with "Cannot read property 'email' of undefined"
Where it crashes: sendWelcomeEmail(user.email) in NotificationService
Who called this? UserController.create() after saving the user record
What was passed? user = await UserRepo.create(params) — but create() returns undefined on duplicate key
Original cause: UserRepo.create() silently swallows duplicate key errors and returns undefined instead of throwing
```

修復應在源頭（`UserRepo.create` 應於重複鍵時拋異常），非錯誤顯現處（`NotificationService`）。

**手動追蹤受阻時**，加插樁：

```
// Before the problematic operation
const stack = new Error().stack;
console.error('DEBUG [operation]:', { value, cwd: process.cwd(), stack });
```

測試中用 `console.error()`——日誌器輸出或被抑制。於危險操作前記錄，非失敗後。

---

## Git Bisect 定位回歸

缺陷為回歸時（「以前能用的」），二分搜尋找破壞提交：

```bash
git bisect start
git bisect bad                    # current commit is broken
git bisect good <known-good-ref> # a commit where it worked
# git bisect will checkout a middle commit — test it
# mark as good or bad, repeat until the breaking commit is found
git bisect reset                  # return to original branch when done
```

自動二分：

```bash
git bisect start HEAD <known-good-ref>
git bisect run <test-command>
```

測試命令正常退出為0，非0為壞。

---

## 間歇性缺陷技法

2-3次嘗試後仍不可靠重現時：

**日誌陷阱。** 於疑似失敗點加定向日誌，反覆執行場景。捕獲通過與失敗運行間差異之狀態。

**統計重現。** 迴圈執行失敗場景以確立重現率：

```bash
for i in $(seq 1 20); do echo "Run $i:"; <test-command> && echo "PASS" || echo "FAIL"; done
```

5%重現率確認缺陷存在，但暗示時序或資料敏感性。

**環境隔離。** 系統消除變量：
- 同測試，不同機器？
- 同測試，不同資料種子？
- 同測試，串行 vs 並行？
- 同測試，有無網路？

**資料相依觸發。** 缺陷僅於特定資料出現時，識別觸發條件：
- 失敗輸入有何獨特？
- 輸入大小、編碼或邊界值是否相關？
- 資料順序是否關鍵（排序 vs 隨機）？

---

## 框架特定除錯

### Rails
- 檢查回調：`before_save`, `after_commit`, `around_action`——隱式執行，可改狀態
- 檢查中介鏈：`rake middleware` 列出完整堆疊
- 檢查 Active Record 查詢生成：任何關聯上加 `.to_sql`
- 用 `Rails.logger.debug` 加標籤日誌追蹤請求

### Node.js
- 異步堆疊追蹤：以 `--async-stack-traces` 旗標運行
- 未處理拒絕：檢查缺失 `.catch()` 或 promise 上之 `await`
- 事件循環延遲：可疑操作前後用 `process.hrtime()`
- 記憶體洩漏：`--inspect` 旗標 + Chrome DevTools 堆快照

### Python
- 回溯豐富化：except 區塊中 `traceback.print_exc()`
- `pdb.set_trace()` 或 `breakpoint()` 互動除錯
- `sys.settrace()` 執行追蹤
- `logging.basicConfig(level=logging.DEBUG)` 詳盡輸出

---

## 競態條件調查

懷疑時序或並行時：

**時序隔離。** 於疑似點加刻意延遲以拓寬競態窗口，使之可重現：

```
// Simulate slow operation to expose race
await new Promise(r => setTimeout(r, 100));
```

**共享可變狀態。** 搜尋由多線程或進程無同步存取之變數、快取或資料庫行。常見模式：
- 全域或模組級可變狀態
- 無鎖快取讀取
- 資料庫行先讀後更新無樂觀鎖

**異步排序。** 檢查操作是否假定不保證之特定執行順序：
- `Promise.all` 含相依操作
- 事件處理器假定發射順序
- 資料庫寫入假定讀取一致性

---

## 瀏覽器除錯

以 `agent-browser` 或等效工具調查 UI 缺陷時：

```bash
# Open the affected page
agent-browser open http://localhost:${PORT:-3000}/affected/route

# Capture current state
agent-browser snapshot -i

# Interact with the page
agent-browser click @ref          # click an element
agent-browser fill @ref "text"    # fill a form field
agent-browser snapshot -i         # capture state after interaction

# Save visual evidence
agent-browser screenshot bug-evidence.png
```

**埠偵測：** 查項目指令檔（`AGENTS.md`, `CLAUDE.md`）之埠參照，次查 `package.json` 開發腳本，再查 `.env` 檔，後備 `3000`。

**主控台錯誤：** 查瀏覽器主控台輸出之 JavaScript 錯誤、失敗網路請求、CORS 問題。常於代碼追蹤前即揭露 UI 缺陷根因。

**網路面板：** 查失敗 API 請求、非預期回應碼、缺失 CORS 標頭。後端 422 或 500 回應即收窄調查範圍。
