# `ce-optimize`

對可產生多變體並以同一量測設置評分之問題，執行迭代優化迴圈。

## 適用場景

以下情況用 `/ce-optimize`：

- 正確變更非顯而易見
- 可產生多個合理變體
- 有可重複之量測機制
- 「更優」可表達為硬指標或LLM-as-judge評估

適用：

- 調校記憶體、超時、並行或批次大小設定，可量測崩潰率、延遲、吞吐或錯誤率
- 改善聚類、排序、搜尋或推薦品質，純硬指標易被博弈
- 優化提示詞，輸出品質與token成本皆重要

通常不適用：

- 根因明確之一次性修復
- 無可重複量測機制之變更
- 「更優」無法一致量測或評判之問題

## 快速入門

- 以 [`references/example-hard-spec.yaml`](./references/example-hard-spec.yaml) 開始客觀目標
- 語義重要且需LLM-as-judge時，以 [`references/example-judge-spec.yaml`](./references/example-judge-spec.yaml) 開始
- 首次運行保持串行、小規模、低成本，直到機制可信
- 基線與評估迴圈穩定後再引入新依賴

## 文檔

- [`SKILL.md`](./SKILL.md)：完整編排工作流與運行時規則
- [`references/usage-guide.md`](./references/usage-guide.md)：範例提示與「何時/如何使用此技能」之實用指引
- [`references/optimize-spec-schema.yaml`](./references/optimize-spec-schema.yaml)：優化規格schema
- [`references/experiment-log-schema.yaml`](./references/experiment-log-schema.yaml)：實驗日誌schema
