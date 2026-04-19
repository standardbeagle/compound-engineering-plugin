# 同步程式教學教程

提交並推送教程至GitHub倉庫以備份及行動閱讀。

## 指引

1. **進入教程倉庫**：`cd ~/coding-tutor-tutorials`

2. **檢查變更**：執行 `git status` 查看新增或修改

3. **若有變更**：
   - 暫存所有變更：`git add -A`
   - 建立提交，訊息概述所增/所改（如「Add tutorial on React hooks」或「Update quiz scores」）
   - 推送至origin：`git push`

4. **若無GitHub遠端**：
   - 建立倉庫：`gh repo create coding-tutor-tutorials --private --source=. --push`

5. **回報結果**：告知用戶同步內容或一切已是最新

## 備註

- 教程倉庫位於：`~/coding-tutor-tutorials/`
- 建立GitHub倉庫時一律用 `--private`
- 此乃個人學習之旅——妥善備份！
