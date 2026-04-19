# Astro 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `astro` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `astro.config.js`、`astro.config.mjs` 或 `astro.config.ts` 存在
- `package.json` 含 `astro` 依賴

## 啟動命令

標準：

```bash
npm run dev
```

`package.json` 中之 `dev` 腳本通常包裹 `astro dev`。亦有效（讀 `package.json` scripts 確認專案使用何者）：

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

預設：`4321`。Astro 接受 `--port <port>` 及 `astro.config.*` 中之 `server.port` 欄位。覆寫遵循 `references/dev-server-detection.md` 中之層疊。

## 存根生成

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

替換為已解析之套件管理器（`npm` / `pnpm` / `yarn` / `bun`）及埠號。

## 常見陷阱

- **SSR vs SSG：** `astro dev` 對兩種輸出模式運行相同；差異僅在建置時。Polish 不需區分。
- **Astro 配置優先於 Vite 配置：** Astrio 底層使用 Vite 但附帶自身配置檔。`astro` 類型優先於 `vite`（當 `astro.config.*` 及 `vite.config.*` 同時存在時）。此情況罕見——Astro 專案通常無獨立 Vite 配置檔。
- **開發工具列（Astro 4+）：** Astro 4+ 含開發工具列，於瀏覽器中添加覆蓋 UI。不影響埠號綁定或 URL 路由——polish 可忽略。
