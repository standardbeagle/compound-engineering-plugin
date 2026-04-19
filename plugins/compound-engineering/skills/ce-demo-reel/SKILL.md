---
name: ce-demo-reel
description: "為 PR 描述擷取視覺展示影片（GIF、終端錄製、截圖）。適用於交付 UI 變更、CLI 功能或任何具可觀察行為且受益於視覺證據之工作。亦適用於被要求加入 demo、錄製 GIF、截圖功能、視覺化展示變更、建立展示影片、擷取證據、為 PR 加入證明、建立前後對比。"
argument-hint: "[what to capture, e.g. 'the new settings page' or 'CLI output of the migrate command']"
---

# 展示影片

偵測專案類型、推薦擷取層級、錄製視覺證據、上傳至公開 URL、回傳 PR 用之 markdown。

**證據指使用產品，非跑測試。** "I ran npm test" 是測試證據。證據擷取是執行實際 CLI 指令、開啟網頁應用、呼叫 API 或觸發功能。區別是絕對的——測試輸出永不標記為 "Demo" 或 "Screenshots"。

若真實產品使用不切實際（需 API 金鑰、雲端部署、付費服務、bot token），明確說明：「Real evidence would require [X]. Recommending [fallback approach] instead.」勿靜默跳至「no evidence needed」或以測試輸出替代。

絕不生成假或佔位圖片/GIF URL。若上傳失敗，回報失敗。

## 參數

解析 `$ARGUMENTS`：
- **擷取目標**：要展示之功能或行為描述。若提供，用以引導訪問哪些頁面、執行哪些指令或擷取哪些狀態。
- 若留空，自可恢復之分支或 PR 上下文推斷。若目標仍模糊，先問用戶想展示什麼再繼續。

## 步驟零：發現擷取目標

將目標發現視為無狀態且分支感知。代理可能在工作完成後之新對話中被調用，故不依賴對話歷史或假設呼叫方知道正確產物。

若由另一技能調用，將呼叫方提供之目標視為提示，非證明。擷取前重新執行目標發現與驗證。

以最輕量之可用上下文識別最佳證據目標：

- 當前分支名稱
- 開放 PR 之標題與描述（若存在）
- 相對於基礎分支之變更檔案與 diff
- 近期提交
- 計劃檔案——僅當分支、PR、參數或呼叫方上下文明顯引用時

形成擷取假說：「The best evidence appears to be [behavior].」

僅在有恰好一個高信心可觀察行為且有合理方式從工作區執行時方不問而進。當多個行為皆有可能、diff 未揭示如何執行行為或請求之目標無法映射至產品表面時，詢問用戶想展示什麼。

當 diff 僅含文檔、僅 markdown、僅配置、僅 CI、僅測試或純內部重構無可觀察輸出變更時，附明確理由跳過證據。

## 步驟一：演練功能

擷取前先驗證功能確實可用：

- **CLI 工具**：執行新增/變更之指令並確認輸出正確
- **網頁應用**：導航至新增/變更之頁面並確認渲染正確
- **函式庫**：執行使用新增/變更 API 之範例程式碼
- **錯誤修復**：重現原始錯誤情境並確認已修復

使用建構功能之工作區。勿從頭重新安裝。若設定需要憑證或服務，使用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）詢問用戶。

## 步驟二：偵測專案類型

使用步驟零之擷取目標決定分類哪個目錄。若 diff 觸及特定子目錄且有其自有的套件清單（如 `packages/cli/`、`apps/web/`），以之作為根目錄。否則使用倉庫根目錄。

```bash
python3 scripts/capture-demo.py detect --repo-root [TARGET_DIR]
```

輸出含 `type` 與 `reason` 之 JSON。結果為信號，非關卡。若代理自步驟零之理解與腳本之分類矛盾（如 diff 明確改變 CLI 行為但倉庫根因兄弟 Next.js 應用而分類為 `web-app`），代理之判斷優先。

## 步驟三：評估變更類型

步驟零已處理「無可觀察行為」之提早退出。此步將有可觀察行為之變更分類為 `motion` 或 `states` 以引導層級選擇。

若參數描述擷取目標，依描述分類。否則使用步驟零之 diff 上下文。

**變更分類：**

1. **涉及動態或互動？**（動畫、輸入流程、拖放、即時更新、持續 CLI 輸出）→ 分類為 `motion`。
2. **涉及離散狀態？**（前後 UI、新頁面、含輸出之指令、API 回應）→ 分類為 `states`。

| 變更特徵 | 分類 |
|---|---|
| 動畫、輸入、拖放、串流輸出 | `motion` |
| 新 UI、前後、指令輸出、API 回應 | `states` |

**功能 vs. 錯誤修復——展示什麼：**

- **新功能（`feat`）**：展示功能運作。展現高光時刻——功能做它的事。
- **錯誤修復（`fix`）**：展示前後。重現原始損壞狀態（若可能）再展示修復。若損壞狀態無法重現（工作區中已修復），擷取已修復狀態並描述曾損壞之物。

自提交訊息、分支名稱或計劃檔案 frontmatter（`type: feat` 或 `type: fix`）推斷 feat vs. fix。若不明確，詢問。

## 步驟四：工具預檢

執行預檢：

```bash
python3 scripts/capture-demo.py preflight
```

輸出含各工具布林可用性之 JSON：`agent_browser`、`vhs`、`silicon`、`ffmpeg`、`ffprobe`。依結果為用戶列印人類可讀之摘要，標注缺失工具之安裝指令（如 vhs 用 `brew install charmbracelet/tap/vhs`、silicon 用 `brew install silicon`、ffmpeg 用 `brew install ffmpeg`）。

## 步驟五：建立執行目錄

於 OS 臨時位置建立每次執行之臨時目錄：

```bash
mktemp -d -t demo-reel-XXXXXX
```

以輸出作為 `RUN_DIR`。將此具體執行目錄傳予每個層級參照。證據產物為短暫的——上傳至公開 URL 後即丟棄。OS 臨時目錄為正確位置，非倉庫樹。

## 步驟六：推薦層級並詢問用戶

以步驟二之專案類型、步驟三之變更分類及步驟四之預檢 JSON 執行推薦腳本：

```bash
python3 scripts/capture-demo.py recommend --project-type [TYPE] --change-type [motion|states] --tools '[PREFLIGHT_JSON]'
```

輸出含 `recommended`（最佳層級）、`available`（工具已備之層級列表）及 `reasoning` 之 JSON。

透過平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）向用戶呈現可用層級。標記推薦層級。一律以「No evidence needed」作為最後選項。

**問題：** "How should evidence be captured for this change?"

**選項**（僅顯示 `available` 列表中之層級，依推薦排序）：
1. **Browser reel** ——Agent-browser 截圖拼接為動畫 GIF。最適網頁應用。
2. **Terminal recording** ——VHS 終端錄製為 GIF。最適含互動/動態之 CLI 工具。
3. **Screenshot reel** ——風格化終端框架拼接為動畫 GIF。最適離散 CLI 步驟。
4. **Static screenshots** ——個別 PNG。其他工具不可用時之後備。
5. **No evidence needed** ——diff 本身說明一切。最適純文字或配置變更。

若提問工具不可用（背景代理、批次模式），呈現編號選項並等候用戶回覆後方續。

## 步驟七：執行所選層級

將步驟零之擷取假說與步驟一之功能演練結果帶入層級執行——這些決定訪問哪些頁面、執行哪些指令或截圖哪些狀態。以步驟五之具體路徑替換層級參照中之 `[RUN_DIR]`。

載入所選層級之對應參照檔案：

- **Browser reel** → 讀取 `references/tier-browser-reel.md`
- **Terminal recording** → 讀取 `references/tier-terminal-recording.md`
- **Screenshot reel** → 讀取 `references/tier-screenshot-reel.md`
- **Static screenshots** → 讀取 `references/tier-static-screenshots.md`
- **No evidence needed** → 跳至輸出。設 `evidence_url` 為 null、`evidence_label` 為 null。

**運行時失敗後備：** 若所選層級執行期間失敗（工具崩潰、伺服器不可達、錄製產出空輸出），回退至下一可用層級而非完全失敗。後備順序：browser reel → static screenshots、terminal recording → screenshot reel → static screenshots、screenshot reel → static screenshots。Static screenshots 為最終後備——若連它都失敗，回報失敗讓用戶決定。

## 步驟八：上傳與批准

所選層級產出產物後，讀取 `references/upload-and-approval.md` 以了解上傳至公開主機、用戶批准關卡及 markdown 嵌入生成。

## 輸出

將以下值回傳予呼叫方（如 ce-commit-push-pr）：

```
=== Evidence Capture Complete ===
Tier: [browser-reel / terminal-recording / screenshot-reel / static / skipped]
Description: [1 sentence describing what the evidence shows]
URL: [public URL or "none" (multiple URLs comma-separated for static screenshots)]
=== End Evidence ===
```

`Description` 為自步驟零之擷取假說推導之一行摘要（如 "CLI detect command classifying 3 project types and recommending capture tiers"）。呼叫方決定如何將 URL 格式化至 PR 描述。

- `Tier: skipped` 或 `URL: "none"` 表示未擷取證據。

**標籤慣例：**
- Browser reel、terminal recording、screenshot reel：標記為 "Demo"
- Static screenshots：標記為 "Screenshots"
- 呼叫方於格式化時套用標籤。ce-demo-reel 不生成 markdown。
- 測試輸出永不標記為 "Demo" 或 "Screenshots"
