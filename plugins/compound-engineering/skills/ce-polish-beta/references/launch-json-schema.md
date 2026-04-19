# `.claude/launch.json` 結構描述

Polish 讀取倉庫根目錄之 `.claude/launch.json` 以解析開發伺服器啟動命令。此 schema 為 VS Code `launch.json` 格式之子集——選擇此格式因 Claude Code、Cursor 及 VS Code 皆理解，且用戶常已有用於編輯器整合者。

## 頂層結構

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "<人類可讀標籤>",
      "runtimeExecutable": "<二進位>",
      "runtimeArgs": ["<引數>", "<引數>"],
      "port": <數字>,
      "cwd": "<可選，倉庫相對>",
      "env": { "<鍵>": "<值>" }
    }
  ]
}
```

## Polish 消耗之欄位

| 欄位 | 必須 | 用途 |
|------|------|------|
| `name` | 是（多配置時） | 陣列有多於一個條目時用於消歧。Polish 請用戶以 `name` 選擇。 |
| `runtimeExecutable` | 是 | Polish 生成之二進位（如 `bin/dev`、`npm`、`overmind`、`bun`）。 |
| `runtimeArgs` | 否 | 傳遞至 `runtimeExecutable` 之引數陣列。預設：空陣列。 |
| `port` | 是 | 開發伺服器監聽之埠號。Polish 探測 `http://localhost:<port>` 以確認可達性，用於 IDE 瀏覽器交接。 |
| `cwd` | 否 | 開發伺服器之倉庫相對工作目錄。預設：倉庫根目錄。適用於 monorepo（`apps/web`、`packages/frontend`）。 |
| `env` | 否 | 開發伺服器進程之額外環境變數。預設：繼承 polish 之環境。 |

## 存根模板（用戶接受首次運行時寫入）

Polish 自動偵測專案類型且用戶確認「儲存為 `.claude/launch.json`？」時，寫入偵測類型衍生之最小存根。這些模板刻意硬編碼常見預設——用戶可稍後編輯。

### Rails 存根

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

### Next.js 存根

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

### Vite 存根

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Vite dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

### Procfile / Overmind 存根

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

### Nuxt 存根

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Nuxt dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

### Astro 存根

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Astro dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 4321
    }
  ]
}
```

### Remix 存根

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Remix dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

### SvelteKit 存根

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "SvelteKit dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

## 何以為 VS Code schema 之子集

Polish 不使用 `type`、`request`、`console`、`stopOnEntry` 或 VS Code 其他欄位。包含之無害——polish 忽略之——但存根寫入器永不添加。Polish 關注之欄位描述*如何在已知埠號上啟動長時間運行之開發伺服器*，此為比 VS Code 用於除錯步進更小之介面。

## 跨 IDE 備註

`.claude/launch.json` 尚未為 Claude Code、Cursor、VS Code 及 Codex 間之完全統一標準。Polish 以 `.claude/launch.json` 為先因：
- Claude Code、Cursor 及 VS Code 皆可將其讀作啟動配置
- 其位於清晰之倉庫根信任邊界（用戶撰寫，非自動偵測）
- 偏好 `.vscode/launch.json` 之用戶可手動符號連結或鏡像兩個檔案

若跨 IDE 標準出現（如 `.workspace/launch.json`），存根寫入器及讀取器可替換路徑而不觸碰技能其餘部分。
