# Vite 開發伺服器配方（自動偵測後備）

當 `detect-project-type.sh` 回傳 `vite` 且無 `.claude/launch.json` 可查時載入。

## 簽名

- `vite.config.js`、`vite.config.ts`、`vite.config.mjs` 或 `vite.config.cjs` 存在

## 啟動命令

標準：

```bash
npm run dev
```

`package.json` 中之 `dev` 腳本通常直接包裹 `vite`。依 lockfile 指示之套件管理器偏好（見 Next.js 配方之 lockfile → 命令映射）。

## 埠號

預設：`5173`。Vite 接受 `--port <n>` 及 `VITE_PORT` 環境變數。`references/dev-server-detection.md` 中之層疊從 `package.json` 腳本拾取 `--port` 及從 `.env*` 拾取 `PORT`。

Vite 之 `--strictPort` 旗標使開發伺服器在請求埠號被佔用時失敗而非遞增至下一可用埠。Polish 之 kill-by-port 步驟於啟動前回收埠號，故 `strictPort` 實際上不造成問題——但禁用埠號回收且運行多個 Vite 實例之用戶會看到埠號自動遞增，除非 `vite.config.ts` 中設 `strictPort: true`。

## 主機綁定

Vite 預設綁定 `127.0.0.1`。Polish 運行於 devcontainer 或 WSL 內時，用戶可能需 `--host 0.0.0.0` 於 `runtimeArgs`。若與差異相關，檢查清單可注明。

## 存根生成

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

## 常見陷阱

- **HMR websocket 埠號：** Vite 之 HMR 使用獨立 websocket，預設繼承開發伺服器埠號。若專案於 `vite.config.ts` 中固定 `server.hmr.port`，polish 對開發伺服器埠號之可達性探測仍有效，但嵌入式瀏覽器可能需額外配置以到達 HMR。
- **Vite 上之框架：** SvelteKit、SolidStart、Qwik City 及 Astro 皆使用 Vite 但添加自身開發腳本。`vite` 簽名捕獲之，`npm run dev` 對全部皆為正確命令。不同預設埠號適用（SvelteKit: 5173, Astro: 4321, Qwik: 5173）——依賴層疊從 `package.json` 或 `.env` 拾取實際埠號。
