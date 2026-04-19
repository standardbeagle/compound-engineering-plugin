# 交接

此內容於第四階段起始時載入 — 需求文檔已撰就並審畢。

---

#### 4.1 呈現下一步選項

以平台阻塞式提問工具呈現選項（Claude Code 用 `AskUserQuestion`，Codex 用 `request_user_input`，Gemini 用 `ask_user`）。若無提問工具，於對話中呈現編號選項，候用戶回覆方續行。

若 `Resolve Before Planning` 尚有項目：
- 預設逐一阻塞式提問
- 若用戶明示欲續行，先將各餘項轉為明確決策、假設或 `Deferred to Planning` 問題
- 若用戶選暫停，呈現交接為暫停或阻塞狀態
- `Resolve Before Planning` 非空時，勿提供 `Proceed to planning` 或 `Proceed directly to work`

**無阻塞問題時之提問：**「腦力激盪完成。下一步何為？」

**有阻塞問題且用戶暫停時之提問：**「腦力激盪暫停。規劃受阻於待決問題。下一步何為？**

僅呈現適用選項，總數不超四：

- **進入規劃（推薦）** — 轉入 `/ce-plan` 作結構化實施規劃。僅於 `Resolve Before Planning` 為空時顯示。
- **直接開工** — 跳過規劃轉入 `/ce-work`；適於輕量、明確之變更。僅於 `Resolve Before Planning` 為空 **且** 範圍輕量、成功標準清晰、範圍邊界明確、無重大技術或研究問題殘留時顯示（「直接開工門檻」）。
- **繼續腦力激盪** — 回答更多澄清問題以收緊範圍、邊界案例及偏好。恆顯。
- **在 Proof 開啟（Web 應用）— 審閱並留言以與代理反覆** — 於 Every 之 Proof 編輯器開啟文檔，以留言與代理反覆，或複製連結分享他人。僅於需求文檔存在 **且** 未達直接開工門檻時顯示（兩條件衝突時，`直接開工` 優先，Proof 可由自由形式請求達）。
- **暫且結束** — 暫停；需求文檔已存，可續。恆顯。

**文檔審閱按脈絡呈現，非固定選單項：** 當前次文檔審閱發現用戶未處理之 P0/P1 餘項，於選單旁提及並以正文提議再審一輪（如「文檔審閱標記 2 項 P1 發現，或需處理 — 再跑一輪？」）。勿加至選項列表。

#### 4.2 處理所選選項

**若選「進入規劃（推薦）」：**

即於當前會話執行 `/ce-plan`。有需求文檔時傳其路徑；否則傳腦力激盪定案決策之簡要摘要。勿先印結束摘要。

**若選「直接開工」：**

即於當前會話以定案腦力激盪產出為上下文執行 `/ce-work`。若有精簡需求文檔，傳其路徑。勿先印結束摘要。

**若選「繼續腦力激盪」：** 返第一階段 1.3（協作對話），繼續逐一澄清問題，進一步精煉範圍、邊界案例、約束及偏好。至用戶滿意，返第四階段。勿印結束摘要。

**若選「在 Proof 開啟（Web 應用）— 審閱並留言以與代理反覆」：**

以 HITL 審閱模式載入 `ce-proof` 技能：

- **原始檔：** `docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md`
- **文檔標題：** `Requirements: <topic title>`
- **身份：** `ai:compound-engineering` / `Compound Engineering`
- **建議下一步：** `/ce-plan`（顯示於 ce-proof 技能之最終終端輸出）

遵 ce-proof 技能中 `references/hitl-review.md`。其上傳文檔、提示用戶於 Proof Web UI 審閱、逐串讀取並回覆、以追蹤建議套用約定編輯、於 proceed 時原子化同步最終 markdown 回原始檔。

ce-proof 技能交還控制權時：

- `status: proceeded` 且 `localSynced: true` → 本地需求文檔已反映審閱。返第四階段選項並重繪選單（文檔或已大幅變更 → 重新評估 `Resolve Before Planning`、直接開工門檻、ce-doc-review 餘項）。
- `status: proceeded` 且 `localSynced: false` → 審閱版存於 Proof `docUrl` 但本地副本過時。提議以 ce-proof 技能之 Pull 工作流拉取 Proof 文檔至 `localPath`。拉取完成（或拒絕）後重繪第四階段選單。若拒絕拉取，於選單上方加註 `<localPath>` 相對 Proof 過時 — 否則 `進入規劃` / `直接開工` 將靜默讀取審閱前副本。
- `status: done_for_now` → 若用戶離開前曾在 Proof 編輯，本地文檔或已過時。提議拉取 Proof 文檔至 `localPath` 以保持本地需求檔同步，然後返第四階段選項。若拒絕拉取，於選單上方加過時註。`done_for_now` 意為用戶停止 HITL 迴圈而未同步 — 非結束整個腦力激盪；或仍欲進入規劃或繼續腦力激盪。
- `status: aborted` → 不作變更，返第四階段選項。

若初次上傳失敗（網路錯誤、Proof API 不可用），短暫等待後重試一次。仍敗則告知用戶上傳未成並簡述原因，返第四階段選項 — 勿令其困惑為何選項無效。

**若用戶要求再作文檔審閱**（來自 P0/P1 餘項之脈絡提示，或自由形式請求）：

載入 `ce-doc-review` 技能對需求文檔再審一輪。ce-doc-review 返「Review complete」後，返第四階段選項並僅呈現仍適用者。勿印結束摘要。

**若選「暫且結束」：** 顯示結束摘要（見 4.3），結束回合。

#### 4.3 結束摘要

僅於本次工作流結束或交接時用，返第四階段選項時不用。

完成並備規劃時，顯示：

```text
Brainstorm complete!

Requirements doc: docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md  # 若已建立

Key decisions:
- [Decision 1]
- [Decision 2]

Recommended next step: `/ce-plan`
```

若用戶暫停且 `Resolve Before Planning` 仍有項目，顯示：

```text
Brainstorm paused.

Requirements doc: docs/brainstorms/YYYY-MM-DD-<topic>-requirements.md  # 若已建立

Planning is blocked by:
- [Blocking question 1]
- [Blocking question 2]

Resume with `/ce-brainstorm` when ready to resolve these before planning.
```
