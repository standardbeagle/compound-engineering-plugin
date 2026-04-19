---
name: ce-slack-research
description: "搜尋 Slack 以獲取經詮釋之組織脈絡——決策、約束、討論脈絡等形塑當前任務之資訊。產出含跨領域分析與研究價值評估之研究摘要，非原始訊息列表。適用於規劃、腦力激盪或任何組織知識攸關之任務中搜尋 Slack 脈絡。觸發詞：'search slack for'、'what did we discuss about'、'slack context for'、'organizational context about'、'what does the team think about'、'any slack discussions on'。有別於 slack:find-discussions——後者回傳個別訊息結果而無綜合分析。"
---

# /ce-slack-research

搜尋 Slack 以獲取組織脈絡，取得經詮釋之研究摘要。

## 用法

```
/ce-slack-research [topic or question]
/ce-slack-research
```

## 範例

```
/ce-slack-research free trial
/ce-slack-research What did we say about free trial recently?
/ce-slack-research free trial in #proj-reverse-trial
/ce-slack-research onboarding flow after:2026-03-01
```

輸入可為關鍵詞、自然語言提問，或含 Slack 搜尋修飾詞（如頻道提示 `in:#channel`、日期篩選 `after:YYYY-MM-DD`）。代理自任何形式之輸入提取主題並構建搜尋。

## 執行

若未提供參數，詢問欲研究之主題。使用平台之阻塞式提問工具（Claude Code 之 `AskUserQuestion`、Codex 之 `request_user_input`、Gemini 之 `ask_user`）。若無提問工具，以純文字發問並等候回覆。

分派 `research:ce-slack-researcher`，以用戶之主題作為任務提示。省略 `mode` 參數，俾用戶已配置之權限設定生效。

代理自此刻處理一切——Slack MCP 探索、搜尋執行、串流讀取、綜合分析。回傳摘要含：

- **工作區識別碼**，俾用戶驗證搜尋了正確之 Slack 實例
- **研究價值評估**（高 / 中 / 低 / 無）附理由
- **依主題組織之發現**，附來源頻道與日期
- **跨領域分析**，揭露發現間之模式

若代理回報 Slack 不可用（MCP 未連線或認證過期），轉達予用戶。勿嘗試替代研究方法。
