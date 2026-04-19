# 層：靜態截圖

擷取個別 PNG 截圖。無動畫、無縫合。

**適用：** 他工具不可用時之後備、函式庫展示、動畫無增值之功能。
**產出：** PNG 檔案
**標籤：** "Screenshots"
**所需工具：** 視情而定（web 用 agent-browser，CLI 用 silicon，或原生截圖）

## 依專案類型擷取

### Web應用或桌面應用（agent-browser 可用）

若 `agent-browser` 未安裝，告使用者：「`agent-browser` is not installed. Run `/ce-setup` to install required dependencies.」然後跳至下方 CLI 或後備段落。

```bash
agent-browser open [URL]
```

```bash
agent-browser wait 2000
```

```bash
agent-browser screenshot [RUN_DIR]/screenshot-01.png
```

擷取1-3幅截圖：前態、功能運作、結果態。

### CLI 工具（silicon 可用）

執行命令，將輸出捕至文字檔，以 silicon 渲染：

```bash
silicon [RUN_DIR]/output.txt -o [RUN_DIR]/screenshot-01.png --theme Dracula -l bash --pad-horiz 20 --pad-vert 20
```

### CLI 工具（無 silicon）

執行命令並捕獲原始終端輸出。以程式碼區塊置於 PR 說明中代替圖片。標籤為 "Terminal output"，永不為 "Screenshot"。

### 函式庫

執行演練新 API 之範例代碼。依上法捕獲輸出（有 silicon 用 silicon，無則用程式碼區塊）。

## 上傳

每幅 PNG 個別上傳。續至 `references/upload-and-approval.md` 逐檔處理，或全部上傳後一併呈請核准。

多幅截圖之 markdown 嵌入用多行圖片：

```markdown
## Screenshots

![Before](url-1)
![After](url-2)
```
