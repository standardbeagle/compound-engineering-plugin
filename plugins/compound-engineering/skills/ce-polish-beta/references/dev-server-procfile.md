# Procfile / Overmind 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `procfile` 且無 `.claude/launch.json` 可查時載入。含 `bin/dev` 之 Rails 應用優先於裸 Procfile 路徑（見 `dev-server-rails.md`）。

## 簽名

- `Procfile` 或 `Procfile.dev` 存在於倉庫根目錄
- `bin/dev` **不存在**（若存在，使用 Rails 配方）

## 啟動命令

`overmind` 可用時偏好——處理 socket 檔案、支援按進程熱重啟，為多進程開發之社群預設：

```bash
overmind start -f Procfile.dev
```

`overmind` 未安裝時回退至 `foreman`：

```bash
foreman start -f Procfile.dev
```

兩者皆缺失時，提示用戶提供啟動命令而非猜測。

## 埠號

預設：`3000`。Procfile 專案於 `Procfile.dev` 中列出其進程，故權威埠號來自 `web:` 行：

```
web: bundle exec puma -p 3000 -C config/puma.rb
worker: bundle exec sidekiq
```

解析 `web:` 行之 `-p <n>` 或 `--port <n>`。若兩者皆無，透過 `references/dev-server-detection.md` 中之層疊回退。

## 存根生成

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Overmind dev",
      "runtimeExecutable": "overmind",
      "runtimeArgs": ["start", "-f", "Procfile.dev"],
      "port": 3000
    }
  ]
}
```

若用戶機器上 `overmind` 不可用則替換為 `foreman`——存根代表用戶將運行者，非規範配方。

## 常見陷阱

- **Socket 檔案：** `overmind` 預設寫入 socket 至 `.overmind.sock`。Polish 之 kill-by-port 邏輯回收埠號但不清理 socket。若 overmind 已運行且 polish 重啟之，新進程可能因 "connection refused" 失敗直到過時 socket 被移除。`OVERMIND_SOCKET` 環境變數可將 socket 重定向至每次運行之路徑。
- **Procfile vs Procfile.dev：** 生產及開發 Procfile 通常不同。Polish 恆偏好 `Procfile.dev`。
- **多個 web 進程：** 部分 Procfile 將 web 流量拆分至多個進程（API + 前端）。Polish 僅能開啟一個 URL——多用戶多 web 設置應手動撰寫 `.claude/launch.json` 以選擇哪個進程為 polish 之「開發伺服器」。
