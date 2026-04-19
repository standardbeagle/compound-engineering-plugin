---
name: ce-every-style-editor
description: 審查或編輯文稿以確保符合 Every 風格指南時使用。提供系統化之逐行審查流程，涵蓋語法、標點、機械格式及風格合規。
---

# Every 風格編輯器

此技能提供系統化方法，以 Every 綜合風格指南為準審查文稿。將 Claude 轉化為一絲不苟之行編輯與校對者，專精於語法、機械格式及風格合規。

## 使用時機

用於：
- 審查文章、部落格文章、電子報或任何書面內容
- 確保文稿遵循 Every 特定風格慣例
- 提供語法、標點及機械格式之回饋
- 標記偏離 Every 風格指南之處
- 為人工編輯審查準備乾淨文稿

## 技能概述

此技能以四階段進行文稿全面審查：

1. **初始評估** ——理解上下文與文檔類型
2. **詳細行編輯** ——逐句檢查合規性
3. **機械格式審查** ——驗證格式與一致性
4. **建議** ——提供可行之改進建議

## 使用方法

### 步驟一：初始評估

先通讀全文以理解：
- 文檔類型（文章、知識庫條目、社群貼文等）
- 目標受眾
- 整體語氣與聲調
- 內容上下文

### 步驟二：詳細行編輯

系統化審查每個段落，檢查：
- 句子結構與語法正確性
- 標點使用（逗號、分號、破折號等）
- 大小寫規則（尤其職稱、標題）
- 用詞選擇與用法（過度使用之詞、被動語態）
- 遵循 Every 風格指南規則

有疑慮時參照 `references/EVERY_WRITE_STYLE.md` 之完整風格指南。

### 步驟三：機械格式審查

驗證：
- 間距與格式一致性
- 風格選擇全文統一套用
- 特殊元素（列表、引文、引用）
- 斜體與格式之正確使用
- 數字格式（數字 vs. 拼寫）
- 連結格式與描述

### 步驟四：輸出結果

以下列結構呈現發現：

```
DOCUMENT REVIEW SUMMARY
=====================
Document Type: [type]
Word Count: [approximate]
Overall Assessment: [brief overview]

ERRORS FOUND: [total number]

DETAILED CORRECTIONS
===================

[For each error found:]

**Location**: [Paragraph #, Sentence #]
**Issue Type**: [Grammar/Punctuation/Mechanics/Style Guide]
**Original**: "[exact text with error]"
**Correction**: "[corrected text]"
**Rule Reference**: [Specific style guide rule violated]
**Explanation**: [Brief explanation of why this is an error]

---

RECURRING ISSUES
===============
[List patterns of errors that appear multiple times]

STYLE GUIDE COMPLIANCE CHECKLIST
==============================
✓ [Rule followed correctly]
✗ [Rule violated - with count of violations]

FINAL RECOMMENDATIONS
===================
[2-3 actionable suggestions for improving the draft]
```

## 風格指南參照

Every 完整風格指南位於 `references/EVERY_WRITE_STYLE.md`。重點關注領域：

- **快速規則**：標題用 Title case，其餘用 sentence case
- **語氣**：主動語態，避免過度使用之詞（actually、very、just），具體明確
- **數字**：一至九拼寫；10 以上用阿拉伯數字
- **標點**：牛津逗號、em dash 不加空格、正確引號用法
- **大小寫**：職稱小寫、公司視為單數（it）、團隊視為複數（they）
- **強調**：僅用斜體（不以粗體強調）
- **連結**：2-4 詞，勿寫「click here」

## 核心原則

- **具體明確**：引用含錯誤之確切文字
- **引用規則**：每項修正引用特定風格指南規則
- **保持聲調**：修正錯誤時保留作者之聲調
- **優先清晰**：聚焦提升可讀性之變更
- **建設性反饋**：以助作者改進之方式呈現
- **標記模糊案例**：風格指南未涵蓋時，解釋選項並推薦最清晰者

## 常見關注領域

依 Every 風格指南，特別注意：

- 標點（逗號用法、分號、撇號、引號）
- 大小寫（專有名詞、標題、句首）
- 數字（何時拼寫 vs. 阿拉伯數字）
- 被動語態（儘可能替換為主動語態）
- 過度使用之詞（actually、very、just）
- 列表（平行結構、標點、大小寫）
- 連字符（複合形容詞，副詞除外）
- 用詞（fewer vs. less、they vs. them）
- 公司引用（單數 "it"、團隊複數 "they"）
- 職稱大小寫
