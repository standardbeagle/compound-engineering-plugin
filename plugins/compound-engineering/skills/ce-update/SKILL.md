---
name: ce-update
description: |
  檢查 compound-engineering 插件是否為最新版本，若非則修復陳舊快取。
  適用於用戶說「update compound engineering」、「check compound engineering version」、
  「ce update」、「is compound engineering up to date」、「update ce plugin」，或回報可能
  源自陳舊 compound-engineering 插件版本之問題。此技能僅適用於 Claude Code——依賴
  插件框架快取佈局。
disable-model-invocation: true
ce_platforms: [claude]
---

# 檢查並修復插件版本

驗證已安裝之 compound-engineering 插件版本是否與最新發布版本一致，若非則修復陳舊之市場/快取狀態。僅限 Claude Code。

## 預解析上下文

下方三段含預解析資料。僅**插件根路徑**決定此對話是否為 Claude Code——若含錯誤哨兵、空值或字面 `${CLAUDE_PLUGIN_ROOT}` 字串，告知用戶此技能僅適用於 Claude Code 並停止。其餘兩段即使在有效 Claude Code 對話中亦可能含錯誤哨兵；下方決策邏輯處理此類情況。

**插件根路徑：**
!`echo "${CLAUDE_PLUGIN_ROOT}" 2>/dev/null || echo '__CE_UPDATE_ROOT_FAILED__'`

**最新發布版本：**
!`gh release list --repo EveryInc/compound-engineering-plugin --limit 30 --json tagName --jq '[.[] | select(.tagName | startswith("compound-engineering-v"))][0].tagName | sub("compound-engineering-v";"")' 2>/dev/null || echo '__CE_UPDATE_VERSION_FAILED__'`

**已快取版本資料夾：**
!`ls "${CLAUDE_PLUGIN_ROOT}/cache/compound-engineering-plugin/compound-engineering/" 2>/dev/null || echo '__CE_UPDATE_CACHE_FAILED__'`

## 決策邏輯

### 一、平台關卡

若**插件根路徑**含 `__CE_UPDATE_ROOT_FAILED__`、字面 `${CLAUDE_PLUGIN_ROOT}` 字串，或為空：告知用戶此技能需要 Claude Code 並停止。不作進一步動作。

### 二、比對版本

若**最新發布版本**含 `__CE_UPDATE_VERSION_FAILED__`：告知用戶無法取得最新發布版本（gh 或不可用或受限），並停止。

若**已快取版本資料夾**含 `__CE_UPDATE_CACHE_FAILED__`：無市場快取存在。告知用戶：「No marketplace cache found — this appears to be a local dev checkout or fresh install.」並停止。

取**最新發布版本**與**已快取資料夾列表**。

**已為最新**——恰好一個快取資料夾存在，且其名稱與最新版本一致：
- 告知用戶：「compound-engineering **v{version}** is installed and up to date.」

**過時或損壞**——多個快取資料夾存在，或唯一資料夾名稱與最新版本不符。使用上方**插件根路徑**值構建刪除路徑。

**清除陳舊快取：**
```bash
rm -rf "<plugin-root-path>/cache/compound-engineering-plugin/compound-engineering"
```

告知用戶：
- 「compound-engineering was on **v{old}** but **v{latest}** is available.」
- 「Cleared the plugin cache. Now run `/plugin marketplace update` in this session, then restart Claude Code to pick up v{latest}.」
