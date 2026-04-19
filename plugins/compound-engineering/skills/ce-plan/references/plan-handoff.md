# 計劃交接

此文包含計劃撰寫後之指示：文檔審閱、生成後選項及議題建立。計劃檔案寫入且信心檢查（5.3.1-5.3.7）完成後載入。

## 5.3.8 文檔審閱

信心檢查（及任何深化）後，於計劃檔案上運行 `ce-doc-review` 技能。傳入計劃路徑作為引數。此步驟為強制——勿因信心檢查已運行而跳過。兩工具捕捉不同類別之問題。

信心檢查及 ce-doc-review 互補：
- 信心檢查強化理據、排序、風險處理及立基
- 文檔審閱檢查連貫性、可行性、範圍對齊並浮現角色特定問題

若 ce-doc-review 回傳自動套用之發現，呈現交接選項時簡要提及。若殘留 P0/P1 發現浮現，提及之使用戶可決定是否在繼續前處理。

ce-doc-review 回傳 "Review complete" 時，進入最終檢查。

**管道模式：** 若從自動化工作流（如 LFG、SLFG 或任何 `disable-model-invocation` 上下文）調用，以 `mode:headless` 及計劃路徑運行 `ce-doc-review`。無頭模式靜默套用自動修正並回傳結構化發現，無互動提示。返回控制予呼叫者前處理任何 P0/P1 發現。

## 5.3.9 最終檢查與清理

進入生成後選項前：
- 確認計劃以具體方式更強，非僅更長
- 確認規劃邊界完整
- 確認來源文檔存在時其決策已保留

若使用產物備份模式：
- 計劃安全更新後清理臨時臨時目錄
- 若當前平台上清理不切實際，註明產物留存位置

## 5.4 生成後選項

**管道模式：** 若從自動化工作流（如 LFG、SLFG 或任何 `disable-model-invocation` 上下文）調用，跳過以下互動選單並立即返回控制予呼叫者。計劃檔案已寫入，信心檢查已運行，ce-doc-review 已運行——呼叫者（如 lfg, slfg）決定下一步。

文檔審閱完成後，使用平台之阻斷式提問工具呈現選項（Claude Code 之 `AskUserQuestion`，Codex 之 `request_user_input`，Gemini 之 `ask_user`）。若無提問工具，於聊天中呈現編號選項並等候用戶回覆。

**問題：** "Plan ready at `docs/plans/YYYY-MM-DD-NNN-<type>-<name>-plan.md`. What would you like to do next?"

**選項：**
1. **開始 `/ce-work`**（推薦） - 於當前會話中開始實施此計劃
2. **建立議題** - 從此計劃於配置之議題追蹤器（GitHub 或 Linear）建立追蹤議題
3. **在 Proof 中開啟（網頁應用）—— 審閱並留言以與代理迭代** - 在 Every 之 Proof 編輯器中開啟文檔，透過留言與代理迭代，或複製連結分享他人
4. **暫停** - 計劃檔案已儲存，可稍後恢復

**上下文性呈現額外文檔審閱，非作為選單固定項：** 先前文檔審閱通過浮現用戶未處理之殘留 P0/P1 發現時，於選單旁提及並以散文提議再次審閱通過（如「文檔審閱標記了 2 個 P1 發現您可能想處理——要我再次運行通過再選嗎？」）。勿加入選項列表。

依選擇：
- **開始 `/ce-work`** -> 以計劃路徑呼叫 `/ce-work`
- **建立議題** -> 依下方議題建立章節執行
- **在 Proof 中開啟（網頁應用）—— 審閱並留言以與代理迭代** -> 以 HITL 審閱模式載入 `ce-proof` 技能：
  - 來源檔案：`docs/plans/<plan_filename>.md`
  - 文檔標題：`Plan: <plan title from frontmatter>`
  - 身份：`ai:compound-engineering` / `Compound Engineering`
  - 建議下一步：`/ce-work`（顯示於 ce-proof 技能之最終終端輸出）

  遵循 ce-proof 技能中之 `references/hitl-review.md`。其上傳計劃、提示用戶於 Proof 網頁 UI 審閱、逐個吸收各線程（重新讀取並線程內回覆）、以追蹤建議套用同意之編輯，並於 proceed 時將最終 markdown 原子同步回計劃檔案。

  ce-proof 技能返回時：
  - `status: proceeded` 搭配 `localSynced: true` -> 磁碟上之計劃現反映審閱。重新渲染選單前於更新後之計劃上重新運行 `ce-doc-review`——HITL 可實質重寫計劃主體，故先前之 ce-doc-review 通過不再覆蓋當前檔案且 5.3.8 節要求任何交接選項提供前先審閱。然後以刷新之殘留發現返回生成後選項。
  - `status: proceeded` 搭配 `localSynced: false` -> 審閱後版本存於 Proof 之 `docUrl`，但本地副本過時。提議使用 ce-proof 技能之 Pull 工作流將 Proof 文檔拉取至 `localPath`。若拉取發生，重新渲染選項前於拉取檔案上重新運行 `ce-doc-review`（同 5.3.8 理據——本地計劃被拉取實質更新）。若拉取被拒，於選單上方附一行備註 `<localPath>` 相對 Proof 為過時——否則 `Start /ce-work` 或 `Create Issue` 將默默使用審閱前之副本。
  - `status: done_for_now` -> 若用戶離開前在 Proof 中編輯，磁碟上之計劃可能過時。提議將 Proof 文檔拉取至 `localPath` 使本地計劃檔案保持同步。若拉取發生，重新渲染選項前於拉取檔案上重新運行 `ce-doc-review`（同 5.3.8 理據）。若拉取被拒，於選單上方附上過時本地備註。`done_for_now` 表示用戶停止 HITL 循環——不代表用戶結束整個計劃會話；其可能仍想開始工作或建立議題。
  - `status: aborted` -> 無更改回退至選項。

  若初始上傳失敗（網路錯誤、Proof API 當機），短暫等待後重試一次。若仍失敗，告知用戶上傳未成功並簡要解釋原因，再返回選項——勿讓用戶困惑為何選項無反應。
- **暫停** -> 顯示簡短確認計劃檔案已儲存並結束回合
- **若用戶要求另一次文檔審閱**（無論來自殘留 P0/P1 發現之上下文提示或自由形式要求）-> 以計劃路徑載入 `ce-doc-review` 技能進行再次通過，再返回選項
- **其他** -> 接受自由文字修訂並迴回選項

## 議題建立

用戶選擇 "Create Issue" 時，偵測其專案追蹤器：

1. 讀取倉庫根之 `AGENTS.md`（或 `CLAUDE.md` 以相容）並查找 `project_tracker: github` 或 `project_tracker: linear`。
2. 若 `project_tracker: github`：

    ```bash
    gh issue create --title "<type>: <title>" --body-file <plan_path>
    ```

3. 若 `project_tracker: linear`：

    ```bash
    linear issue create --title "<title>" --description "$(cat <plan_path>)"
    ```

4. 若無追蹤器配置，以平台之阻斷式提問工具詢問用戶使用哪個追蹤器（Claude Code 之 `AskUserQuestion`，Codex 之 `request_user_input`，Gemini 之 `ask_user`）。若無提問工具，於聊天中詢問並等候回覆。選項：`GitHub`、`Linear`、`Skip`。然後：
    - 以所選追蹤器之上方命令繼續
    - 提議將選擇持久化，於 `AGENTS.md` 中加入 `project_tracker: <value>`，其中 `<value>` 為小寫追蹤器鍵（`github` 或 `linear`）——非顯示標籤——使後續運行匹配步驟 1 之偵測器並跳過此提示
    - 若 `Skip`，返回選項而不建立議題

5. 若偵測到之追蹤器之 CLI 未安裝或未認證，呈現明確錯誤（如 "`gh` CLI not found — install it or create the issue manually"）並返回選項。

議題建立後：
- 顯示議題 URL
- 以平台之阻斷式提問工具詢問是否繼續至 `/ce-work`
