---
name: ce-doc-review
description: 以並行角色代理審查需求或計劃文檔，揭露各角色特定之問題。適用於已有需求或計劃文檔且用戶欲改進之時。
argument-hint: "[mode:headless] [path/to/document.md]"
---

# 文檔審查

透過多角色分析審查需求或計劃文檔。並行分派專門審查代理，自動修復品質問題，並呈現策略性問題供用戶決策。

## 階段零：偵測模式

檢查技能參數中是否含 `mode:headless`。參數可能含文檔路徑、`mode:headless` 或兩者俱有。以 `mode:` 開頭之詞元為旗標，非檔案路徑——剝離之，以剩餘詞元（若有）作為文檔路徑供階段一使用。

若 `mode:headless` 存在，為後續工作流設定**無頭模式**。

**無頭模式**改變互動模型，非分類邊界。文檔審查仍適用相同判斷——何者有明確正確修復 vs. 何者需用戶判斷。唯一差異在非自動發現之傳遞方式：
- `auto` 修復靜默套用（與互動模式相同）
- `present` 發現以結構化文字回傳供呼叫方處理——無 AskUserQuestion 提示、無互動批准
- 階段五立即回傳 "Review complete"（無精煉/完成提問）

呼叫方接收保留原始分類之發現，自行決定如何處理。

呼叫方以如下方式啟用無頭模式：
```
Skill("ce-doc-review", "mode:headless docs/plans/my-plan.md")
```


若 `mode:headless` 不存在，技能以預設互動模式運行，行為不變。

## 階段一：取得並分析文檔

**若提供文檔路徑：** 讀取之，再續。

**若未指定文檔（互動模式）：** 詢問欲審查哪份文檔，或以檔案搜尋/glob 工具（如 Claude Code 之 Glob）自 `docs/brainstorms/` 或 `docs/plans/` 找最近者。

**若未指定文檔（無頭模式）：** 輸出 "Review failed: headless mode requires a document path. Re-invoke with: Skill(\"ce-doc-review\", \"mode:headless <path>\")" 而不分派代理。

### 分類文檔類型

讀取後，分類文檔：
- **requirements**——來自 `docs/brainstorms/`，聚焦於建什麼與為何建
- **plan**——來自 `docs/plans/`，聚焦於如何建置及實作細節

### 選擇條件式角色

分析文檔內容以決定啟用哪些條件式角色。檢查以下信號：

**product-lens**——文檔就建什麼與為何建提出可受質疑之主張，或所提工作具超越眼前問題之策略份量時啟用。系統之使用者可為終端用戶、開發者、運維人員、維護者或任何受眾——標準與領域無關。檢查任一支線：

*支線一——前提主張：* 文檔就建什麼或為何建立場，且該立場可被知情利益相關者合理質疑——非僅描述任務或複述已知需求：
- 問題框架中之需求非顯而易見或有爭議
- 解決方案選擇有替代方案（隱含或明示）
- 優先序決策明確排序建什麼 vs. 延後什麼
- 目標陳述預測特定用戶結果，非僅複述約束或描述交付物

*支線二——策略份量：* 所提工作可能影響系統走向、用戶認知或競爭定位，即使前提穩固：
- 改變系統認知或其知名特徵之變更
- 影響採用、入門或認知負載之複雜度或簡潔度抉擇
- 開啟或關閉未來方向之工作（路徑依賴、架構承諾）
- 機會成本——建此即不建彼

**design-lens**——文檔含以下內容時啟用：
- UI/UX 參照、前端元件或視覺設計語言
- 用戶流程、線框圖、畫面/頁面/視圖提及
- 互動描述（表單、按鈕、導航、模態框）
- 響應式行為或無障礙之參照

**security-lens**——文檔含以下內容時啟用：
- 認證/授權提及、登入流程、會話管理
- 暴露予外部客戶端之 API 端點
- 資料處理、PII、支付、令牌、憑證、加密
- 含信任邊界影響之第三方整合

**scope-guardian**——文檔含以下內容時啟用：
- 多重優先序層級（P0/P1/P2、必須/應該/錦上添花）
- 大量需求（>8 個不同需求或實作單元）
- 延伸目標、錦上添花或「未來工作」區段
- 範圍邊界語言似乎與所述目標不一致
- 目標未清楚連結至需求

**adversarial**——文檔含以下內容時啟用：
- 超過 5 個不同需求或實作單元
- 明確之架構或範圍決策及其理由
- 高風險領域（認證、支付、資料遷移、外部整合）
- 新抽象、框架或重要架構模式之提案

## 階段二：宣布並分派角色

### 宣布審查團隊

告知用戶哪些角色將參與審查及理由。條件式角色附理由：

```
Reviewing with:
- ce-coherence-reviewer (always-on)
- ce-feasibility-reviewer (always-on)
- ce-scope-guardian-reviewer -- plan has 12 requirements across 3 priority levels
- ce-security-lens-reviewer -- plan adds API endpoints with auth flow
```

### 建立代理列表

一律包含：
- `document-review:ce-coherence-reviewer`
- `document-review:ce-feasibility-reviewer`

加入已啟用之條件式角色：
- `document-review:ce-product-lens-reviewer`
- `document-review:ce-design-lens-reviewer`
- `document-review:ce-security-lens-reviewer`
- `document-review:ce-scope-guardian-reviewer`
- `document-review:ce-adversarial-document-reviewer`

### 分派

以**並行**方式分派所有代理，使用平台之任務/代理工具（如 Claude Code 之 Agent 工具、Codex 之 spawn）。省略 `mode` 參數，俾用戶已配置之權限設定生效。每個代理接收以下變數填入之子代理模板：

| 變數 | 值 |
|----------|-------|
| `{persona_file}` | 代理 markdown 檔案之完整內容 |
| `{schema}` | 下方所附之發現綱要內容 |
| `{document_type}` | 階段一分類之 "requirements" 或 "plan" |
| `{document_path}` | 文檔路徑 |
| `{document_content}` | 文檔全文 |

傳遞每個代理**完整文檔**——勿分段。

**錯誤處理：** 若代理失敗或超時，以已完成代理之發現繼續。於覆蓋範圍區段注明失敗之代理。勿因單一代理失敗而阻塞整個審查。

**分派上限：** 即使最大值（7 個代理），使用並行分派。此為文件審查者，範圍有限，閱讀單一文檔——並行安全且快速。

## 階段三至五：綜合、呈現與後續行動

所有分派代理回傳後，讀取 `references/synthesis-and-presentation.md` 以了解綜合管線（驗證、關卡、去重、晉升、解決矛盾、依自動修復類別路由）、自動修復套用、發現呈現及後續行動選單。代理分派完成前勿載入此檔。

---

## 內附參照

### 子代理模板

@./references/subagent-template.md

### 發現綱要

@./references/findings-schema.json
