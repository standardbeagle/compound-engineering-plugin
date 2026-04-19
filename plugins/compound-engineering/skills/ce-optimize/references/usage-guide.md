# `/ce-optimize` 用法指南

## 此技能適用於

`/ce-optimize` 適用於以下困難工程問題：

1. 可嘗試多種程式碼或配置變體。
2. 可對各變體執行相同評估。
3. 希望技能保留優良變體並淘汰不良者。

最適合「搜尋空間並評分結果」之工作，非一次性實施工作。

## 何時使用

問題符合以下描述時使用 `/ce-optimize`：

- 「找出停止 OOM 崩潰且不浪費 RAM 之最小記憶體限制。」
- 「調整聚類參數，避免將一切坍縮為一個垃圾集群。」
- 「找出更便宜但仍產生足夠好摘要供下游聚類之提示。」
- 「以相同線束比較多種排名、檢索、批次或閾值策略。」

成功客觀且衡量成本低時選擇 `type: hard`：

- 記憶體使用
- 延遲
- 吞吐量
- 測試通過率
- 建置時間

數字指標可被博弈或人類效用重要時選擇 `type: judge`：

- 集群連貫性
- 搜尋相關性
- 摘要品質
- 提示品質
- 含語義邊緣案例之分類品質

## 何時不使用

以下情況 `/ce-optimize` 通常為錯誤工具：

- 修正顯而易見，不需實驗
- 無可重複之量測線束
- 搜尋空間為假，僅有一個合理答案
- 評估變體成本過高，不值得多次運行

## 如何思考

模式為：

1. 定義目標。
2. 先建置或驗證量測線束。
3. 生成多個合理變體。
4. 對各變體執行相同評估循環。
5. 保留改善目標且不違反護欄之變體。

核心規則簡單：

- 若硬指標捕捉「更好」，優化硬指標。
- 若硬指標可被博弈，加入 LLM-as-judge。

例：降低聚類閾值可能增加集群覆蓋率。聽起來不錯，直到一切歸入一個巨大集群。硬指標可能說「改善」；LLM 評審抽樣真實集群可說「這是垃圾」。

## 首次運行建議

首次運行：

- 偏好 `execution.mode: serial`
- 設 `execution.max_concurrent: 1`
- 保持 `stopping.max_iterations` 較小
- 保持 `stopping.max_hours` 較小
- 基線可信前避免新依賴
- judge 模式中，使用小樣本及低成本上限

首次運行目標為驗證線束，非即刻贏得優化。

## 範例提示

### 1. 記憶體調整

```text
Use /ce-optimize to find the smallest memory setting that keeps this service stable under our load test.

The current container limit is 512 MB and the app sometimes OOM-crashes. Do not just jump to 8 GB. Try a small set of realistic memory limits, run the same load test for each one, and score the results using:
- did the process OOM
- did tail latency spike badly
- did GC pauses become excessive

Prefer the smallest memory limit that passes the guard rails.
```

### 2. 聚類品質

```text
Use /ce-optimize to improve issue and PR clustering quality.

We have about 18k open issues and PRs. We want to test changes that improve clustering quality, reduce singleton clusters, and improve match quality within each cluster.

Do not mutate the shared default database. Copy it for the run, then use per-experiment copies when needed.

Do not optimize only for coverage. Use LLM-as-judge to sample clusters and confirm they still preserve real semantic similarity instead of collapsing into giant low-quality clusters.
```

### 3. 提示優化

```text
Use /ce-optimize to create a summarization prompt for issues and PRs that minimizes token spend while still producing summaries that are good enough for downstream clustering.

I want the loop to compare prompt variants, measure token cost, and judge whether the summaries preserve the distinctions needed to cluster related issues together without merging unrelated ones.
```

## 硬指標與評審模式之間之選擇

以下情況單獨使用硬指標：

- 「更好」從數字即可看出。

以下情況加入評審模式：

- 數字可能改善而實際輸出變差。

常見模式：

- 硬門檻拒絕損壞輸出。
- 評審模式為存活候選評分實際效用。

此混合設置常為排名、聚類及提示工作之最佳預設。
