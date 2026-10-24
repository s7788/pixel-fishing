# lure-8bit 交接（給接手的 Claude）

這是一個 Claude Code mod（函式 hooks 外掛），結構仿照 s7788/pixel-hunter（hunt-8bit），美術全部取自本 repo 的 `fishing-mod-assets-v1`。先讀 `README.md`，再讀本檔。v0.1.0 已通過 `claude plugin validate`、`claude plugin test`（15 個測試）與 `tsc`；畫面以離線 SVG 輸出逐格目視檢查過（三場地的拋投／收線／魚影／咬餌／搏魚／抄網／漁獲卡／放流／脫鉤）。**Desktop 實機驗收尚未完成**（本 session 沒有 pane 可看）。

## 如何載入

- `claude --plugin-dir <此資料夾>`（終端機；存檔後熱重載）。
- Desktop／SDK：`CLAUDE_CODE_PLUGIN_DIRS=<此資料夾>`，必要時加 `CLAUDE_CODE_PLUGIN_DIR_WATCH=1`。
- 檢查：`claude plugin validate .`、`claude plugin test .`。`tsc -p .` 需要引擎第一次載入 mod 後寫出的 `.claude-plugin/types/`；尚未載入時，用 plugin-authoring skill 型別檔標頭的 tsconfig 在 mod 資料夾外檢查（include 該型別檔與 `hooks`、`types`）。
- 指令：`/lure` 開 pane，`/lure-demo` 手動拋竿／收竿。

## 已定案的決策（不要重新討論，除非使用者要求）

- 純 mod，畫在右側 pane；渲染只用 SVG path（每像素列一段 1px 線），每 125 ms 由計時器送出當下那一格。單張 SVG 上限 131,072 字元（目前最大約 40k）。
- 美術 1:1 使用素材包：主畫布 384×216，場景 128×72 放大 3 倍；人物 48×64、魚 48×24／64×32、釣竿 96×96、特效 48×32、路亞場內圖 16×8。錨點與動畫順序依 `manifest.json`，釣線由程式畫（竿尖 → 路亞 `tie`，上鉤後 → 魚嘴 `mouth`）。船上釣竿 0.8 倍（素材包預覽的做法）。
- 場景用素材包的四層合成圖當底，`foreground` 層在人物之後再畫一次（遮擋棧台／礁岩前緣）。
- 連動：主回合開始＝`beginTurn`（換下一個場地、綁路亞、拋竿）；`answer` 結束＝`endTurn`（抽獎，咬餌或空軍），其他原因＝`lose`（脫鉤）；子代理回合（`e.agentId` 有值）忽略。`working_elapsed` 只計主回合。
- 結算在回合結束當下就寫入圖鑑與紀錄；之後的搏魚、上岸、卡片、放流是演出，中途開新回合直接切回拋竿，不會漏記。
- 抽獎＝時長分級 + 固定種子（mulberry32）權重隨機，數值全在 `hooks/data.ts`。不呼叫語言模型。
- 長度存整數 mm、重量存整數 g（`k × cm³ / 1000`，±12%）；最長／最重分開保存（魚種各自與全體）。
- 水下魚影只是剪影（單色、60% 透明），種類固定用該場第一種魚的外形；大小隨級別。真正的魚種在回合結束才抽。
- 路亞選擇用 `ui.press` 依元素 key 處理，不用 onPress 閉包（pane 每 tick 重畫會讓閉包失效）。
- 終端機只顯示文字（沒做 Raster／Image 版，hunt-8bit 有）。

## 檔案地圖

- `hooks/register.tsx`：hooks（session.start、turn、計時器、指令、ui.press、pane 繪製、`$.store` 存檔）。tick、turn.start、turn.complete、`/lure-demo` 經同一條 promise 佇列依序處理。
- `hooks/engine.ts`：純函式狀態機與抽獎（`beginTurn`、`endTurn`、`lose`、`chooseLure`、`step`、`drawCatch`、`restore`）。
- `hooks/data.ts`：場地座標、路亞、魚種（場地、稀有度、長度範圍、k、偏好路亞）、級別、機率、動作長度。
- `hooks/layout.ts`：把 Game 換算成每個物件的座標（人物、釣竿、抄網、路亞、釣線、魚、特效、張力）。純函式，可測。
- `hooks/svg.ts`：RLE → SVG path、場景、HUD、漁獲卡（含素材包的 3×5 數字字圖）、圖鑑列 `statsSvg`、終端機文字。
- `hooks/i18n.ts`：中英字串表、`pickLang`、cm／kg 格式。
- `hooks/sprites.ts`、`hooks/pixels.ts`：素材查找與 RLE 走訪。
- `hooks/gen/*.ts`：`tools/gen-sprites.cjs` 的產出（angler、fish、scenes、gear、ui），不要手改；改素材包後重跑 `npm run gen:sprites`。
- `types/index.d.ts`：`$.state` 契約與存檔型別（自包含，不能 import）。
- `hooks/lure.test.tsx`：SVG 上限、級別、機率統計、路亞偏好、下竿流程、紀錄判定、脫鉤／空軍、路亞選擇、幾何（釣線接路亞／魚嘴、魚在水裡、不出畫面）、i18n 覆蓋、存檔還原與遷移、turn 連動、終端機、`/lure-demo` 與按鈕、圖鑑還原、繁中介面。

## 狀態機

`idle` →（turn.start）`working`（56 tick 一輪：拋投 8 → 入水 → 收線／抽竿交替 40 → 停 8；船上為放餌循環）→（answer，抽到魚）`bite` 4 → `hookset` 4 → `fight` 16–40（依魚體大小；中段躍水）→ `land` 8（抄網 → 舉魚）→ `card` 32 → `release` 8 → `idle`。
（answer，空軍）`working` → `empty` 12 → `idle`。（中斷）`working` → `lost` 12 → `idle`。
`biteT` 記住回合結束時在循環的哪一格，咬餌點就是當時路亞的位置。

存檔：`saveSchemaVersion = 1`，key `save`。新 session 讀到下竿中的存檔，回到 `idle`、丟棄該次（不算脫鉤）；缺少的新欄位補預設值。熱重載保留 `$.state` 的 world。

## 待做（v2 想法）

- Desktop 實機驗收（pane 版面、按鈕換行、字型）。
- 終端機 Raster／Image 畫面（參考 hunt-8bit 的 `raster.ts`）。
- 魚影改用每場多種剪影；搏魚加入拉扯與張力互動；夜景（素材包目前沒有）。
