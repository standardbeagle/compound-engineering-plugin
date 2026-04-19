# 層：終端錄製

以 VHS（charmbracelet/vhs）錄製終端會話產生 GIF 展示。

**適用：** CLI 工具、腳本、含互動或動態之命令列功能（打字、串流輸出、漸進渲染）。
**產出：** GIF（VHS 直接產出）
**標籤：** "Demo"
**所需工具：** vhs

## 步驟一：規劃錄製

生成 .tape 檔前，確定：

- **執行何命令**——實際產品命令，非測試命令。「跑了 npm test」乃測試證據，非展示。
- **預期輸出**——命令成功時終端應顯示什麼。
- **終端尺寸**——寬度足以容最長輸出行，高度足以免捲動。
- **時序**——總計5-10秒。每命令後充分等待以渲染輸出。

## 步驟二：生成 .tape 檔

寫 VHS tape 檔至 `[RUN_DIR]/demo.tape`：

```tape
Output [RUN_DIR]/demo.gif

Set FontSize 16
Set Width 800
Set Height 500
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

# Hide boring setup
Hide
Type "cd /path/to/project"
Enter
Sleep 500ms
Show

# The demo
Type "your-cli-command --flag value"
Sleep 500ms
Enter
Sleep 3s

# Let viewer read the output
Sleep 2s
```

**關鍵 .tape 指令：**
- `Output [path]`——GIF 寫入處（須為首行）
- `Set FontSize [14-18]`——放大以利閱讀
- `Set Width/Height [pixels]`——配合內容需求
- `Set Theme [name]`——"Catppuccin Mocha" 或 "Dracula" 為可讀預設
- `Set TypingSpeed [ms]`——30-50ms 覺自然
- `Hide`/`Show`——跳過無聊前置（cd, source, npm install）
- `Type [text]`——鍵入字符（不執行）
- `Enter`——按回車（執行所鍵命令）
- `Sleep [duration]`——等待輸出渲染

**避免：**
- 不確定輸出（隨機 ID、每次不同之時間戳）
- 需互動輸入之命令（提示、密碼輸入）
- 過長輸出致捲出螢幕

## 步驟三：執行 VHS

以擷取管線腳本執行 tape 檔並驗證輸出：

```bash
python3 scripts/capture-demo.py terminal-recording --output [RUN_DIR]/demo.gif --tape [RUN_DIR]/demo.tape
```

腳本運行 VHS、驗證輸出存在、報告檔案大小。GIF 超 10 MB 時，調整 .tape 以縮減：更小終端尺寸（`Set Width/Height`）、更短錄製（更少 sleep）、或更低字體大小。重新執行。

## 步驟四：品質檢查

讀取生成之 GIF 驗證：

1. 命令清晰可讀
2. 輸出完整渲染（未被截斷）
3. 所展示功能明確呈現
4. 無密鑰、憑證或敏感路徑可見

品質不佳時，修訂 .tape 檔重新錄製。

**VHS 失敗時**（崩潰、產出空 GIF、或所展示命令失敗）：退至截圖影卷層。以同樣命令與預期輸出作為文字幀，經 silicon + ffmpeg 縫合。silicon 亦不可用時，退至靜態截圖。

續至 `references/upload-and-approval.md`。
