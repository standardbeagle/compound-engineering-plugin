# 評審評估提示模板

編排器使用此模板分派批次 LLM-as-judge 評估呼叫。各評審子代理評估一批抽樣輸出項目並回傳結構化 JSON 分數。

編排器：
1. 讀取實驗輸出
2. 依分層配置選取樣本（使用固定種子）
3. 將樣本分組為 `judge.batch_size` 大小之批次
4. 使用此模板分派 `ceil(sample_size / batch_size)` 個並行子代理
5. 聚合回傳之 JSON 分數

---

## 項目評估模板

```
You are a quality judge evaluating output items for an optimization experiment.

Your job is to score each item using the rubric below and return structured JSON. Be consistent and calibrated -- the same quality level should get the same score across items.

<rubric>
{rubric}
</rubric>

<items>
{items_json}
</items>

<output-contract>
Return ONLY a valid JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have:
- "item_id": the identifier of the item being evaluated (string or number, matching the input)
- All fields requested by the rubric (scores, counts, etc.)
- "ambiguous": true if you cannot confidently score this item (e.g., insufficient context, borderline case). When ambiguous, still provide your best-guess score but flag it.

Example output format (adapt field names to match the rubric):
[
  {"item_id": "cluster-42", "score": 4, "distinct_topics": 1, "outlier_count": 0, "ambiguous": false},
  {"item_id": "cluster-17", "score": 2, "distinct_topics": 3, "outlier_count": 2, "ambiguous": false},
  {"item_id": "cluster-99", "score": 3, "distinct_topics": 2, "outlier_count": 1, "ambiguous": true}
]

Rules:
- Evaluate each item independently
- Score based on the rubric, not on how other items in this batch scored
- If an item is empty or has only 1 element when it should have more, score it based on what is present
- For very large items (many elements), focus on a representative subset and note if quality varies across the item
- Every item in the batch MUST appear in your output
</output-contract>
```

## 單例評估模板

```
You are a quality judge evaluating singleton items -- items that are currently NOT in any group/cluster.

Your job is to determine whether each singleton should have been grouped with an existing cluster, or whether it is genuinely unique. Return structured JSON.

<rubric>
{singleton_rubric}
</rubric>

<singletons>
{singletons_json}
</singletons>

<existing-clusters>
A summary of existing clusters for reference (titles/themes only, not full contents):
{cluster_summaries}
</existing-clusters>

<output-contract>
Return ONLY a valid JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have:
- "item_id": the identifier of the singleton
- All fields requested by the singleton rubric (should_cluster, best_cluster_id, confidence, etc.)

Example output format (adapt field names to match the rubric):
[
  {"item_id": "issue-1234", "should_cluster": true, "best_cluster_id": "cluster-42", "confidence": 4},
  {"item_id": "issue-5678", "should_cluster": false, "best_cluster_id": null, "confidence": 5}
]

Rules:
- A singleton that genuinely has no match in existing clusters should get should_cluster: false
- A singleton that clearly belongs in an existing cluster should get should_cluster: true with the cluster ID
- High confidence (4-5) means you are very sure. Low confidence (1-2) means the item is borderline.
- Every singleton in the batch MUST appear in your output
</output-contract>
```

## 變數參考

| 變數 | 來源 | 描述 |
|------|------|------|
| `{rubric}` | 規格 `metric.judge.rubric` | 用戶定義之評分標準 |
| `{items_json}` | 抽樣輸出項目 | 待評估項目之 JSON 陣列（一批） |
| `{singleton_rubric}` | 規格 `metric.judge.singleton_rubric` | 用戶定義之單例評估標準 |
| `{singletons_json}` | 抽樣單例項目 | 待評估單例項目之 JSON 陣列 |
| `{cluster_summaries}` | 實驗輸出 | 現有集群之摘要（標題/主題）供單例參考 |

## 備註

- 預設設計適用 Haiku——提示精簡且結構良好，適合較小模型
- 評分標準為不可變量測線束之一部分——實驗代理無法修改
- 項目上之 `ambiguous` 旗標幫助編排器識別噪聲評估，無需強制低分
- 單例評估中，編排器提供集群摘要（非完整內容）以保持評審上下文精簡
- 各子代理獨立評估一批——子代理間不可見彼此結果
