# Remix 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `remix` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `remix.config.js` 或 `remix.config.ts` 存在（經典 Remix）
- Vite 上之 Remix 2.x+ 無 `remix.config.*`——使用 `vite.config.ts` 附 Remix 插件，故解析為 `vite` 類型，非 `remix`

## 啟動命令

標準：

```bash
npm run dev
```

`package.json` 中之 `dev` 腳本通常包裹 `remix dev`。亦有效（讀 `package.json` scripts 確認專案使用何者）：

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

預設：`3000`。Remix 接受 `--port <port>` 旗標。經典 Remix 開發伺服器亦讀取 `PORT` 環境變數。覆寫遵循 `references/dev-server-detection.md` 中之層疊。

## 存根生成

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

替換為已解析之套件管理器（`npm` / `pnpm` / `yarn` / `bun`）及埠號。

## 常見陷阱

- **經典 vs Vite：** 經典 Remix 使用 `remix.config.js`；新版 Remix（v2+）使用 Vite——偵測為 `vite` 類型，非 `remix`。`remix` 類型專為仍含 `remix.config.*` 檔案之經典 Remix 專案。
- **Remix v1 vs v2 開發伺服器：** v2 中 `remix dev` 啟動基於 Express 之開發伺服器並綁定埠號；v1 中 `remix dev` 僅為監視器（無伺服器）。Polish 需要 v2+ 使開發伺服器綁定埠號並回應可達性探測。
- **Vite 上之 Remix 繼承 Vite 埠號：** 當 Remix 運行於 Vite 上（無 `remix.config.*`），預設埠為 5173（Vite 預設），非 3000。該情況由 `vite` 配方處理，非此文。
