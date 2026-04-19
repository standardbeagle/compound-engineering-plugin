# 開發伺服器埠號偵測

埠號解析透過 `scripts/resolve-port.sh` 運行。此文說明探測順序、框架預設及與 `test-browser` 技能行內層疊之刻意分歧。

此層疊**僅於** `.claude/launch.json` 不存在或已解析配置無 `port` 欄位時運行。`launch.json` 指定埠號時，直接使用，完全跳過此層疊。

## 優先順序

1. **顯式 `--port` 旗標** —— 若呼叫者傳入 `--port <n>`，直接使用。
2. **框架配置檔** —— `next.config.*`、`vite.config.*`、`nuxt.config.*`、`astro.config.*` 以保守正則掃描，僅匹配數字字面埠值。變數引用（`process.env.PORT`、`getPort()`）刻意不匹配。
3. **Rails `config/puma.rb`** —— grep `port <n>`。
4. **`Procfile.dev`** —— web 行掃描 `-p <n>` / `--port <n>` / `-p=<n>` / `--port=<n>`。
5. **`docker-compose.yml`** —— 行錨定 grep `"<n>:<n>"` 埠映射模式。非完整 YAML 解析。
6. **`package.json`** —— `dev`/`start` 腳本掃描 `--port <n>` / `-p <n>` / `--port=<n>` / `-p=<n>`。
7. **`.env` 檔案** —— 依覆寫順序檢查：`.env.local` -> `.env.development` -> `.env`（首次命中勝出）。解析 `PORT=<n>`，含引號剝離及註解截斷。
8. **框架預設查詢表** —— 見下表。

## 框架預設

| 框架 | 預設埠 |
|------|--------|
| Rails | 3000 |
| Next.js | 3000 |
| Nuxt | 3000 |
| Remix（經典） | 3000 |
| Vite | 5173 |
| SvelteKit | 5173 |
| Astro | 4321 |
| Procfile | 3000 |
| 未知 | 3000 |

## 同步備註區塊

`resolve-port.sh` 與 `test-browser` 技能行內層疊用途重疊但有三點具體分歧。這些分歧為刻意——未理解理據前勿「修正」任一方以匹配另一方。

**(a) `.env` 值之引號剝離。** `resolve-port.sh` 剝離 `PORT=` 值周圍之 `"` 及 `'`（故 `PORT="3001"` 解析為 `3001`）。`test-browser` 行內層疊不剝離引號。腳本版本對真實 `.env` 檔案更穩健，因引號常見。

**(b) `.env` 值之註解剝離。** `resolve-port.sh` 於修剪空白後截斷 `#`（故 `PORT=3001 # dev only` 解析為 `3001`）。`test-browser` 行內層疊不剝離註解。同理：真實 `.env` 檔案常含行內註解。

**(c) 移除 `AGENTS.md`/`CLAUDE.md` grep。** `resolve-port.sh` 不掃描指示檔案中之埠號引用。`test-browser` 行內層疊則掃描。指示檔案攜帶自然語言，可能在與開發伺服器無關之上下文中提及埠號（文檔、範例、故障排除），產生難以調試之誤報。框架配置檔及 `.env` 為更可靠之真實來源。
