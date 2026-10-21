# 禁閉逃殺：文字獄

《禁閉逃殺》的文字冒險／抽卡衍生作。單一 `index.html`，直接用瀏覽器開啟即可（支援 file://）。

- **招募所**：花金條抽職業卡（SSR 3%／SR 17%／R 80%，十連保底 SR、60 抽保底 SSR），重複卡升星。
- **逃殺遠征**：從 B7 停屍間爬到 2F 停機坪。選房間、搜物資、躲毒氣；遇到其他逃殺者可結盟、交易、突襲或避開，盟友信任太低會背叛。直升機只有三個座位。
- **競技場**：對戰 AI 小隊爬塔賺金條。
- **雙人對決**：同機兩人蛇形選角後輪流操作互毆。

頭像 `images/avatars/*.webp` 取自本體專案。存檔存在瀏覽器 localStorage。

## 網路對戰

雙人對決的「網路對戰」使用 Firebase Realtime Database（專案 `confinement-escape-text`）。房主的瀏覽器負責計算戰鬥，挑戰者只送出操作並接收戰況快照。資料庫規則在 `database.rules.json`，修改後用 `firebase deploy --only database` 部署。
