# Rails 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `rails` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `bin/dev` 存在且可執行
- `Gemfile` 存在

## 啟動命令

```bash
bin/dev
```

`bin/dev` 為 Rails 7+ 之「啟動一切」慣例（web + assets watcher + 可選 workers）。其為一行腳本，底層調用 `foreman start -f Procfile.dev`，故 `Procfile.dev` 為 `bin/dev` 缺失或不可執行時讀取*實際命令*之規範位置。

## 埠號

預設：`3000`。覆寫遵循 `references/dev-server-detection.md` 中之層疊：
1. `Procfile.dev` `web:` 行可能含 `-p <n>`
2. `config/puma.rb` 可能綁定非預設埠
3. `.env` / `.env.development` `PORT=<n>`
4. `AGENTS.md` / `CLAUDE.md` 專案指示

## `.claude/launch.json` 存根生成

用戶接受「儲存為 `.claude/launch.json`？」時，從 `launch-json-schema.md` 發出 Rails 存根：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Rails dev",
      "runtimeExecutable": "bin/dev",
      "runtimeArgs": [],
      "port": 3000
    }
  ]
}
```

若層疊解析出非 3000 埠號，寫入前替換存根之 `port` 欄位。

## 常見陷阱

- **Bundler 路徑：** 部分機器需要 `bundle exec bin/dev`。若 `bin/dev` 因載入路徑錯誤失敗，回退至 `bundle exec bin/dev`。
- **Foreman vs overmind：** `Procfile` 與 `Procfile.dev` 通常同時存在。Rails 之 `bin/dev` 解析為 `Procfile.dev`；若專案顯式使用 `overmind`，偏好 `overmind start -f Procfile.dev`（見 `dev-server-procfile.md`）。
- **SSL 開發伺服器：** `rails s` 附 `--ssl` 改變 URL scheme。Polish 之可達性探測使用 `http://`；SSL 開發伺服器之用戶應於 `.claude/launch.json` 中顯式設 `port` 並於檢查清單中注明 scheme。
