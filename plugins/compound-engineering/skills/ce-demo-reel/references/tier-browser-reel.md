# 層：瀏覽器影卷

擷取3-5幅瀏覽器截圖於關鍵 UI 狀態，縫合為動畫 GIF。

**適用：** Web應用、可透過 localhost 或 CDP 存取之桌面應用。
**產出：** GIF（PNG截圖經 ffmpeg 兩遍調色盤縫合）
**標籤：** "Demo"
**所需工具：** agent-browser, ffmpeg

若 `agent-browser` 未安裝，告使用者：「`agent-browser` is not installed. Run `/ce-setup` to install required dependencies.」然後退至低層（靜態截圖或跳過）。

## 步驟一：連接應用

**Web應用**——驗證開發伺服器可達：

- 讀 `package.json` `scripts` 之 `dev`, `start`, `serve` 命令
- 查 `Procfile`, `Procfile.dev`, 或 `bin/dev`（若存在）
- 查 `Gemfile` 是否有 Rails（`bin/rails server`）或 Sinatra
- 查常見埠（3000, 5000, 8080）上之運行進程

伺服器未運行時，告使用者偵測到之啟動命令並請其啟動。勿自動啟動（可能需環境變數、資料庫設定等）。

使用者確認應已運行但仍不可達時，退至靜態截圖層。

可達後，記基準 URL（如 `http://localhost:3000`）。

**Electron/桌面應用**——透過 Chrome DevTools Protocol (CDP) 連接：

1. 檢查應用是否已啟用 CDP 運行，探測常用埠：
   ```bash
   curl -s http://localhost:9222/json/version
   ```
   若回傳 JSON，應用已備——連接：
   ```bash
   agent-browser connect 9222
   ```

2. 未運行時，需以 `--remote-debugging-port` 啟動。從 `package.json` 偵測入口（查 `main` 欄或腳本中之 `electron`），請使用者以如下方式啟動：
   ```
   your-electron-app --remote-debugging-port=9222
   ```
   埠 9222 佔用時試 9223-9230。

3. 輪詢至 CDP 就緒（逾時30秒）：
   ```bash
   curl -s http://localhost:9222/json/version
   ```

4. 連接 agent-browser：
   ```bash
   agent-browser connect 9222
   ```

**CDP之利：** 截圖取自渲染器之幀緩衝，非 macOS 螢幕截取——無需輔助使用或螢幕錄製權限。

**CDP連接失敗時：** 退至靜態截圖層。告使用者：「Could not connect to the app via CDP. Falling back to static screenshots.」

## 步驟二：擷取截圖

導航至相關頁面，於關鍵 UI 狀態擷取3-5幅截圖：

1. **初始/空白態**——功能使用前
2. **導航**——使用者如何到達功能（若非首頁）
3. **功能運作**——展示功能之主角畫面
4. **結果態**——互動後（資料呈現、項目已建、成功訊息）
5. **詳情檢視**（選填）——展開項目、設定面板、對話框

每幅截圖寫入父技能所建之 `RUN_DIR`：

```bash
agent-browser open [URL]
```

```bash
agent-browser wait 2000
```

```bash
agent-browser screenshot [RUN_DIR]/frame-01-initial.png
```

**擷取要訣：**
- 用 URL 導航（`agent-browser open URL`）而非點擊 SPA 元素（點擊常於 React/Vue/Svelte SPA 失敗）
- 導航後等2-3秒讓頁面穩定
- 擷取完整視口（側邊欄、頁首予審查者上下文）

## 步驟三：縫合為 GIF

以擷取管線腳本正規化幀尺寸、兩遍調色盤縫合，超10 MB時自動縮減：

```bash
python3 scripts/capture-demo.py stitch [RUN_DIR]/demo.gif [RUN_DIR]/frame-*.png
```

腳本處理尺寸正規化（ffprobe + ffmpeg 填充）、concat demuxer 縫合、調色盤生成、超 GitHub 10 MB 行內限制時自動縮減幀。預設每幀3秒。調整：

```bash
python3 scripts/capture-demo.py stitch --duration 2.0 [RUN_DIR]/demo.gif [RUN_DIR]/frame-*.png
```

**縫合失敗時：** 以已擷取之個別 PNG 退至靜態截圖層。若無 PNG，報告失敗。

## 步驟四：清理

GIF 建立成功後，移除個別 PNG 幀。僅保留最終 GIF 待上傳。

續至 `references/upload-and-approval.md`。
