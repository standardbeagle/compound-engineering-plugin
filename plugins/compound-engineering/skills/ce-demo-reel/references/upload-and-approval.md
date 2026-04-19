# 上傳與核准

上傳臨時預覽供使用者審閱，核准後提升至永久託管。

## 步驟一：預覽上傳（臨時）

上傳證據檔（GIF 或 PNG）至 litterbox 取得1小時臨時預覽：

```bash
python3 scripts/capture-demo.py preview [ARTIFACT_PATH]
```

輸出末行為預覽 URL（如 `https://litter.catbox.moe/abc123.gif`）。此 URL 一小時後失效——無需清理。

多檔時（靜態截圖層），逐檔分別上傳。

**上傳失敗**經重試後，退至以平台檔案開啟器開啟本地檔案（macOS 用 `open`，Linux 用 `xdg-open`）供使用者審閱。以本地路徑替代 URL 置於核准問題中。

## 步驟二：核准關卡

呈預覽 URL 予使用者核准。用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`，Codex 之 `request_user_input`，Gemini 之 `ask_user`）。

**問題：** "Evidence preview (1h link): [PREVIEW_URL]"

**選項：**
1. **用於 PR**——提升至永久託管
2. **重新擷取**——提供更改指示
3. **無證據繼續**——設證據為 null 並繼續

提問工具不可用時（無頭/背景模式），呈編號選項，等候使用者回覆後再繼續。

### 選「重新擷取」

返回層執行步驟。使用者指示引導下次擷取之更改。重新擷取後上傳新預覽，重複核准關卡。

### 選「無證據繼續」

設證據為 null 並繼續。預覽連結自行失效。

## 步驟三：提升至永久託管

使用者核准後，上傳至永久 catbox 託管。命令接受預覽 URL（優先）或本地檔案路徑（後備）：

```bash
python3 scripts/capture-demo.py upload [PREVIEW_URL or ARTIFACT_PATH]
```

步驟一產出預覽 URL 時傳此處——catbox 直接從 litterbox 複製免重新上傳。步驟一退至本地審閱（無預覽 URL）時傳本地產物路徑。

輸出末行為永久 URL（如 `https://files.catbox.moe/abc123.gif`。輸出用此 URL，非預覽 URL。

多檔時逐個提升。

## 步驟四：回傳輸出

回傳 SKILL.md 輸出段落所定之結構化輸出：`Tier`、`Description`、及 `URL`（永久 catbox URL）。呼叫者將證據格式化至 PR 說明中。ce-demo-reel 不生成 markdown。

## 步驟五：清理

移除 `[RUN_DIR]` 暫存目錄及所有臨時檔案。不保留任何物——證據已存於永久 URL。
