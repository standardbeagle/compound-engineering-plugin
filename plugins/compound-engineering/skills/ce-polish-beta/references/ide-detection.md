# IDE 偵測以進行瀏覽器交接

Polish 嘗試將運行中之開發伺服器 URL 交接至 IDE 之嵌入式瀏覽器，使用戶無需上下文切換即可測試。偵測為盡力而為——失敗時回退至互動摘要中印出 URL。

## 偵測順序

依此順序探測環境變數，首次正面匹配時停止。較早者更特定；較晚者為通用後備。

| 順序 | 信號 | IDE | 交接方法 |
|------|------|-----|---------|
| 1 | `CLAUDE_CODE` 環境變數已設（任何值） | Claude Code 桌面 | 印出 `claude-code://browser?url=http://localhost:<port>` 作為可點擊提示；Claude Code 桌面應用攔截 `claude-code://` URL。 |
| 2 | `CURSOR_TRACE_ID` 環境變數已設 | Cursor | 若 Cursor 之 URL scheme 於用戶版本中穩定則發出 `cursor://anysphere.cursor-retrieval/open?url=...`；否則印出 URL 附備註於 Cursor 之 simple-browser view 中開啟。 |
| 3 | `TERM_PROGRAM=vscode` 且無 Cursor/Claude Code 信號 | 純 VS Code | 印出 URL 附提示：`Open in VS Code: Ctrl+Shift+P → "Simple Browser: Show" → paste URL`。 |
| 4 | 以上皆無 | 終端 / 未知 IDE | 印出 URL。不嘗試交接。 |

## 何以環境變數探測而非更花俏之方式

- 環境變數跨平台（macOS, Linux, Windows/WSL）
- 失敗時安全開啟——探測無回傳時 polish 仍正常運作
- 不需要任何 IDE API 或 socket 連線
- 編碼「此 shell 是否運行於已知 IDE 內」而無需猜測

## Codex 及其他平台

Codex（Claude Agent SDK、Gemini CLI 等）尚未暴露嵌入式瀏覽器交接。此類平台 polish 回退至終端分支（印出 URL）。當慣例出現時，於上方偵測表添加新列。

## 偵測失敗絕不致命

環境探測失敗或返回歧義結果時，polish 逐字印出 URL 並繼續。開發伺服器此時已運行——用戶恆可複製貼上 URL 至任何瀏覽器。IDE 交接為便利功能，非閘門。

## 探測模式（參考）

技能行內消耗這些探測而非透過 shell 腳本（無狀態、無解析、一次性讀取）。典型用法：

```
if [ -n "${CLAUDE_CODE:-}" ]; then
  IDE="claude-code"
elif [ -n "${CURSOR_TRACE_ID:-}" ]; then
  IDE="cursor"
elif [ "${TERM_PROGRAM:-}" = "vscode" ]; then
  IDE="vscode"
else
  IDE="none"
fi
```

永不以 `||` 連接不同變數之探測——缺失之環境變數必須解析為「無信號」，非「錯誤」。`${VAR:-}` 空預設模式於 `set -u` 下為必須。
