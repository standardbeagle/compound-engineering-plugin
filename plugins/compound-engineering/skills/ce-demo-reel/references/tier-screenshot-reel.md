# 層：截圖影卷

從文字渲染樣式化終端幀，縫合為動畫 GIF。每幀展示 CLI 展示之一步（命令 + 輸出）。

**適用：** CLI 工具以離散步驟展示（命令 → 輸出 → 下一命令 → 輸出）。VHS 於引號或特殊字符出錯時亦適用。
**產出：** GIF（silicon PNG經 ffmpeg 縫合）
**標籤：** "Demo"
**所需工具：** silicon, ffmpeg

## 步驟一：撰寫展示內容

以 `---` 分隔符建立文字檔。每幀展示一步之終端狀態：

寫至 `[RUN_DIR]/demo-steps.txt`：

```
$ your-cli-command --flag value
Output line 1
Output line 2
Success: feature works correctly
---
$ your-cli-command --another-flag
Different output showing another aspect
Result: 42 items processed
---
$ your-cli-command --verify
All checks passed
```

**要訣：**
- 含 `$` 提示符以示使用者輸入
- 每幀寬度保持在~80字元以內
- 3-5幀最佳——足以敘事，不致 GIF 過大
- 剔除 silicon 預設字體無法渲染之 unicode 字符（勾號、花式箭頭）

## 步驟二：拆分為幀檔

以 `---` 行拆分展示內容為獨立文字檔，每幀一檔：

- `[RUN_DIR]/frame-001.txt`
- `[RUN_DIR]/frame-002.txt`
- `[RUN_DIR]/frame-003.txt`
- 餘類推

## 步驟三：渲染與縫合

以擷取管線腳本一次呼叫渲染各文字幀經 silicon 並縫合為動畫 GIF：

```bash
python3 scripts/capture-demo.py screenshot-reel --output [RUN_DIR]/demo.gif --duration 2.5 --text [RUN_DIR]/frame-001.txt [RUN_DIR]/frame-002.txt [RUN_DIR]/frame-003.txt
```

腳本處理 silicon 渲染、尺寸正規化、兩遍調色盤生成、超限時自動縮減幀。預設每幀2.5秒（終端幀閱讀較快故快於瀏覽器影卷）。

**腳本失敗時**（silicon 渲染錯誤、縫合錯誤、空輸出）：退至靜態截圖層。改以原始終端輸出作為程式碼區塊置於 PR 說明中。標籤為 "Terminal output"，非 "Screenshots"。

## 步驟四：清理

移除個別 PNG 及文字檔。僅保留最終 GIF 待上傳。

續至 `references/upload-and-approval.md`。
