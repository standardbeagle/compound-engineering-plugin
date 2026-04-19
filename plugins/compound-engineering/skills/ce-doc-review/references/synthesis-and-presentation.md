# 階段3-5：整合、呈現與下一步

## 階段3：整合結果

依此管線處理所有代理結果。**順序重要** — 每步依賴前步。

### 3.1 驗證

依findings schema檢查各代理回傳之JSON：
- 捨棄缺任何必填欄位之結果
- 捨棄含無效列舉值之結果
- 於Coverage段中記錄格式異常之代理名

### 3.2 信心門檻

抑制信心低於0.50之結果。存為殘餘關注，待3.4步可能提升。

### 3.3 去重

以`normalize(section) + normalize(title)`為指紋。正規化：小寫、去標點、摺疊空白。

跨persona指紋相符時：
- 若結果建議**對立行動**（一曰刪一曰留），不合併 — 保留雙方供3.5矛盾解決
- 否則合併：取最高嚴重度、最高信心、聯集所有證據陣列、註記所有同意審查者
- **Coverage歸屬：** 歸屬合併結果於最高信心之persona。扣減失利persona之Findings計數及對應路由桶（Auto或Present），使`Findings = Auto + Present`保持精確。

### 3.4 提升殘餘關注

掃描殘餘關注（3.2抑制者）尋找：
- **跨persona佐證**：Persona A之殘餘關注與Persona B之門檻以上結果重疊。以P2提升，信心0.55-0.65。繼承佐證結果之`finding_type`。
- **具體阻塞風險**：殘餘關注描述具體、明確之風險將阻塞實施。以P2提升，信心0.55。設`finding_type: omission`（以殘餘關注浮現之阻塞風險本質為文檔所未及）。

### 3.5 解決矛盾

當persona對同段有歧見：
- 建立**合併結果**呈現雙方觀點
- 設`autofix_class: present`
- 設`finding_type: error`（矛盾本質為文檔所言之衝突，非所遺漏）
- 框架為取捨，非裁決

特定衝突模式：
- Coherence曰「為一致性保留」+ scope-guardian曰「為簡潔刪除」→ 合併結果，讓用戶定奪
- Feasibility曰「此不可能」+ product-lens曰「此為必要」→ P1結果框架為取捨
- 多個persona標記同一問題 → 合併為單一結果，註記共識，提高信心

### 3.6 提升模式解決結果

掃描`present`結果之codebase-pattern-resolved自動資格。**三條件全滿**時提升`present` → `auto`：

1. 結果之`why_it_matters`引用具體既有碼庫模式 — 非僅「最佳實踐」或「慣例」，乃具檔案、函式或使用參考之具體模式
2. 結果含具體`suggested_fix`遵循所引用模式
3. 無真正取捨 — 碼庫上下文解決所有歧義

原則：審查者提及多個理論方案，但碼庫已有確立模式使一方案明確正確，則碼庫上下文解決問題。順帶提及之替代方案不構成真正取捨。

額外自動提升模式（滿足時提升`present` → `auto`）：
- 結果指出文檔中事實錯誤之行為且建議修復描述正確行為（非設計選擇）
- 結果指出缺少業界標準安全控制且文檔自身上下文使遺漏明顯錯誤，建議修復遵循既定慣例
- 結果指出不完整技術描述且完整版本可直接自碼庫推導（審查者引用具體程式碼）

若結果涉及範圍或優先級變更（文檔作者可能權衡了審查者不可見之取捨），勿提升。

### 3.7 依autofix_class路由

**嚴重度與autofix_class獨立。** P1結果可為`auto`若正確修復明顯。測試非「多重要？」乃「有無唯一正確修復，抑或需判斷？」

| Autofix Class | 路由 |
|---------------|------|
| `auto` | 自動套用 — 唯一正確修復。含內部調和（一部分權威於另一部分）、文檔自身內容機械推導之添加、碼庫模式解決之修復。 |
| `present` | 逐項呈現供用戶判斷 |

缺`suggested_fix`之`auto`結果降為`present`。

**自動合格模式：** 摘要/細節不合（正文權威於概覽）、錯誤計數、可自文檔他處推導之缺失列表項、過時內部交叉引用、術語漂移、正文/圖矛盾（正文更詳）、他處內容機械推導之缺失步驟、周圍上下文推導之未述閾值、正確添加明顯之完整性缺口、審查者引用具體既有模式且建議修復隨之之碼庫模式解決修復、上下文或碼庫可明確推導正確行為之事實錯誤行為、已知實作之缺失標準安全控制、可自碼庫推導完整版之不完整技術描述。若修復需判斷*做什麼*（非僅*寫什麼*）且碼庫上下文未解決歧義，屬`present`。

### 3.8 排序

依嚴重度排序呈現：P0 → P1 → P2 → P3，繼以類型（errors先於omissions），繼以信心（降序），繼以文檔順序（段節位置）。

## 階段4：套用與呈現

### 套用自動修復

以**單次遍歷**套用所有`auto`結果至文檔：
- 以平台編輯工具行內編輯文檔
- 追蹤所變更供「Auto-fixes Applied」段
- 不求核准 — 這些有唯一正確修復

於輸出摘要列出每項自動修復，使用戶可見所變更。附足夠細節以傳達每項修復實質（段節、所變更、審查者歸屬）。尤以添加內容或觸及文檔含義之修復為要 — 用戶不應需diff文檔以理解審查所為。

### 呈現剩餘結果

**無頭模式：** 不用互動式提問工具。以結構化文字摘要輸出所有非auto結果供呼叫者解析處理：

```
Document review complete (headless mode).

Applied N auto-fixes:
- <section>: <what was changed> (<reviewer>)
- <section>: <what was changed> (<reviewer>)

Findings (requires judgment):

[P0] Section: <section> — <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">

[P1] Section: <section> — <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">

Residual concerns:
- <concern> (<source>)

Deferred questions:
- <question> (<source>)
```

零項段落省略。然後直接進入階段5（無頭模式下立即回傳）。

**互動模式：**

以審查輸出模板呈現`present`結果（讀`references/review-output-template.md`）。每嚴重度等級內依類型分：
- **Errors**（設計張力、矛盾、錯誤陳述）在前 — 需解決
- **Omissions**（缺失步驟、缺漏細節、遺忘條目）在後 — 需添加

頂部簡要摘要：「Applied N auto-fixes. K findings to consider (X errors, Y omissions).」

含Coverage表、已套用自動修復、殘餘關注與延遲問題。

### 受保護產物

整合時，丟棄任何建議刪除以下檔案之結果：
- `docs/brainstorms/`
- `docs/plans/`
- `docs/solutions/`

此為管線產物，不得標記移除。

## 階段5：下一步

**無頭模式：** 立即回傳「Review complete」。不問問題。呼叫者接收階段4之文字摘要並處理剩餘結果。

**互動模式：**

**以平台互動式提問工具詢問** — 勿以純文字輸出印出問題：
- Claude Code：`AskUserQuestion`
- Codex：`request_user_input`
- Gemini：`ask_user`
- 後備（無提問工具可用）：呈現編號選項後停止；等候用戶下次訊息

提供二選項。以階段1之文檔類型設「Review complete」描述：

1. **再次精修** — 處理上述結果，再審查
2. **審查完成** — 依文檔類型之描述：
   - 需求文檔：「Create technical plan with ce-plan」
   - 計劃文檔：「Implement with ce-work」

2次精修後建議完成 — 邊際效益遞減。但若用戶欲繼續，允許之。

回傳「Review complete」作為呼叫者之終止信號。

## 禁忌

- 不重寫整份文檔
- 不添加用戶未討論之新段節或需求
- 不過度工程或添加複雜度
- 不建立獨立審查檔或添加元資料段節
- 不修改呼叫技能（ce-brainstorm、ce-plan或呼叫ce-doc-review之外部插件技能）

## 迭代指引

後續輪次重新派發persona並重新整合。自動修復機制與信心門檻防止已修復結果重現。若結果跨輪次重複，建議完成。
