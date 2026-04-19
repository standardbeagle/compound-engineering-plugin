# Nuxt 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `nuxt` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `nuxt.config.js`、`nuxt.config.mjs` 或 `nuxt.config.ts` 存在
- `package.json` 含 `nuxt` 依賴

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

預設：`3000`。Nuxt 接受 `--port <port>` 及 `PORT` 環境變數。覆寫遵循 `references/dev-server-detection.md` 中之層疊。

## 存根生成

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

替換為已解析之套件管理器（`npm` / `pnpm` / `yarn` / `bun`）及埠號。

## 常見陷阱

- **Nitro 伺服器引擎：** Nitro（Nuxt 之伺服器引擎）在 Nuxt 背後添加自身開發伺服器；polish 僅關注 Nuxt 埠號。勿單獨探測 Nitro 內部埠號。
- **埠號自動遞增：** 3000 已被佔用時 Nuxt 自動遞增埠號（Next.js 會報錯）。Polish 之 kill-by-port 步驟透過啟動前回收埠號處理此情況，故自動遞增行為實際上不造成問題。
- **Nuxt 3 vs Nuxt 2：** Nuxt 3 用 `nuxt.config.ts`，Nuxt 2 用 `nuxt.config.js`——兩者皆被簽名檢查偵測。開發伺服器命令及埠號預設跨版本相同。
