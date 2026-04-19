---
name: lfg
description: 全自主工程工作流
argument-hint: "[feature description]"
disable-model-invocation: true
---

要務：必依序執行下述各步。勿跳過任何必要步驟。勿逕行編碼或實作。規劃階段（步驟二）須於動工前完成並驗證。違此序者產出必劣。

1. **選擇性：** 若 `ralph-loop` 技能可用，執行 `/ralph-loop:ralph-loop "finish all slash commands" --completion-promise "DONE"`。若不可用或失敗，跳過，即行步驟二。

2. `/ce-plan $ARGUMENTS`

   關卡：停。若 ce-plan 回報任務非軟體且無法以管線模式處理，即止管線，告知用戶 LFG 僅適用軟體任務。否則，驗證 `ce-plan` 工作流已於 `docs/plans/` 產出計劃檔。若無計劃檔，再執行 `/ce-plan $ARGUMENTS`。未得書面計劃前，勿進步驟三。**記錄計劃檔路徑**——將傳予步驟四之 ce-code-review。

3. `/ce-work`

   關卡：停。驗證已執行實作——有檔案建立或修改（非僅計劃）。若無程式碼變更，勿進步驟四。

4. `/ce-code-review mode:autofix plan:<plan-path-from-step-2>`

   傳入步驟二之計劃檔路徑，俾 ce-code-review 驗證需求完整性。

5. `/ce-todo-resolve`

6. `/ce-test-browser`

7. 完成時輸出 `<promise>DONE</promise>`

即刻自步驟二始（或若有 ralph-loop 則自步驟一）。謹記：先規劃，後動工。絕不跳過規劃。
