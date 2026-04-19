# SvelteKit 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `sveltekit` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `svelte.config.js`、`svelte.config.mjs` 或 `svelte.config.ts` 存在
- `package.json` 含 `@sveltejs/kit` 依賴

## 啟動命令

標準：

```bash
npm run dev
```

`package.json` 中之 `dev` 腳本通常透過 SvelteKit 包裹 `vite dev`。亦有效（讀 `package.json` scripts 確認專案使用何者）：

```bash
pnpm dev
yarn dev
bun run dev
```

依 lockfile 指示之套件管理器偏好：
- `pnpm-lock.yaml` -> `pnpm dev`
- `yarn.lock` -> `yarn dev`
- `bun.lock` / `bun.lockb` -> `bun run dev`
- `package-lock.json` 或無 -> `npm run dev`

## 埠號

預設：`5173`（繼承自 Vite）。SvelteKit 接受 `--port <port>` 旗標及 `vite.config.ts` 中 Vite 之 `server.port` 配置。覆寫遵循 `references/dev-server-detection.md` 中之層疊。

## 存根生成

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

替換為已解析之套件管理器（`npm` / `pnpm` / `yarn` / `bun`）及埠號。

## 常見陷阱

- **底層 Vite：** SvelteKit 內部使用 Vite——相同埠號預設（5173）、相同 HMR 行為。`sveltekit` 類型存在因 `svelte.config.js` 為比泛用 `vite.config.ts` 更精確之信號，允許 polish 生成 SvelteKit 特定之存取名稱及標籤。
- **Adapter 不影響開發：** `adapter-auto`、`adapter-node`、`adapter-static` 及其他 adapter 產生相同開發伺服器。Adapter 僅影響生產建置輸出。
- **`svelte.config.js` 為主要簽名：** SvelteKit 專案中 `svelte.config.js` 恆存在，即使 `vite.config.ts` 亦存在。此檔案區分 SvelteKit 專案與純 Vite 專案。
