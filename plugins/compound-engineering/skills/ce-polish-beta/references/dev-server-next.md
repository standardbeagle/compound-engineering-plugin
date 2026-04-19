# Next.js 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `next` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `next.config.js`、`next.config.mjs`、`next.config.ts` 或 `next.config.cjs` 存在
- `package.json` 含 `next` 依賴

## 啟動命令

標準：

```bash
npm run dev
```

亦有效（讀 `package.json` scripts 確認專案使用何者）：

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

預設：`3000`。Next.js 接受 `-p <port>` / `--port <port>` 及 `PORT` 環境變數。覆寫遵循 `references/dev-server-detection.md` 中之層疊。

## Turbopack

Next.js 14+ 支援 `--turbo`（15+ 預設啟用）。若 `package.json` 中之 `dev` 腳本含 `--turbo`，保留之。Turbopack 改變重新載入行為但不改變埠號或 URL 慣例。

## 存根生成

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

替換為已解析之套件管理器（`npm` / `pnpm` / `yarn` / `bun`）及埠號。

## 常見陷阱

- **App Router vs Pages Router：** 開發伺服器行為相同；polish 不在乎。檢查清單生成（單元 5）在乎——`app/` 及 `pages/` 中之頁面為不同介面。
- **Monorepo 根目錄：** pnpm/Turborepo monorepo 中，根目錄之 `npm run dev` 通常展開至多個套件。用戶應於 `.claude/launch.json` 中設 `cwd` 為特定 Next 應用（`cwd: "apps/web"`）。
- **環境載入：** `.env.local` 由 Next 自動載入；polish 不需匯出。
