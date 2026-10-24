# Pixel Fishing

**跟著 Claude 工作節奏出門路亞的 8-bit 釣手。** 結構與 [pixel-hunter](https://github.com/s7788/pixel-hunter)（hunt-8bit）對齊：這是一個 Claude Code 的 side pane mod（`lure-8bit`），圖片全部來自本 repo 的素材包 `fishing-mod-assets-v1`。

你送出 prompt，釣手就拋竿、收線、抽竿；Claude 回答完，魚咬餌、作合、搏魚、抄網上岸、秀漁獲卡、放流。回合被中斷則脫鉤。回合越長，魚影越大、魚越稀有。

## 安裝

在 Claude Code 終端機的提示列：

```
/plugin install lure-8bit --marketplace s7788/pixel-fishing
```

或在 shell：

```bash
claude plugin install lure-8bit --marketplace s7788/pixel-fishing
```

本機開發載入：

```bash
claude --plugin-dir <此資料夾>
```

Desktop／SDK 可設環境變數 `CLAUDE_CODE_PLUGIN_DIRS=<此資料夾>`。需要 Claude Code 2.1.275 以上（在 2.1.304 測試）。語言跟著 Claude 的 `language` 設定：繁體中文顯示中文，其他一律英文。

## 怎麼玩

- **一個主回合＝一趟下竿。** `turn.start` 拋竿並開始操作路亞；`turn.complete` 為 `answer` 時結算（咬餌或空軍），其他原因（中斷、錯誤）＝脫鉤。子代理的回合忽略。
- **三個釣場輪替**：湖泊 → 海岸 → 船上。岸邊是拋投、收線、抽竿的循環；船上是放餌鐵板的上下抽動。
- **路亞在 pane 下方選**：米諾、波扒、鉛筆、軟蟲、岸拋鐵板、船釣鐵板、隨機。釣場不允許的路亞會換成該場第一種（船上只有船釣鐵板）；每種魚各有兩種偏好的路亞，中選權重加倍。回合進行中不能換。
- **回合時長分四級**（< 30 秒、< 2 分、< 5 分、更久）：決定空軍機率、稀有度權重與尺寸偏斜；水下魚影的大小即目前級別。
- **12 種魚**，每場 4 種（2 普通、1 少見、1 稀有★）。長度以 mm、重量以 g 保存；**最長與最重紀錄分開**，魚種各自的紀錄與全體紀錄也分開。
- **圖鑑**：畫面下方的圖鑑列用魚的小圖，未釣到顯示剪影；「圖鑑 ▸」展開文字列。存檔在 plugin 的 `$.store`，跨 session 共用一位釣手。
- 指令：`/lure` 開 pane；`/lure-demo` 不經 Claude 回合手動拋竿／收竿（除錯）。
- **不耗 token、不連網。** 狀態機每 125 ms 走一步，不呼叫模型。

| 釣場 | 魚種 |
|---|---|
| 湖泊 | 大口黑鱸、翹嘴鮊、線鱧、孔雀鱸★ |
| 海岸 | 花鱸、大梭魚、大眼海鰱、點帶石斑魚★ |
| 船上 | 土魠、鬼頭刀、紅甘、黃鰭鮪★ |

終端機介面沒有 Svg，只顯示文字 HUD、圖鑑列文字與圖鑑。

## 開發與檢查

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

`hooks/gen/*.ts` 由 `node tools/gen-sprites.cjs` 從 `fishing-mod-assets-v1/pixel-data.json` 與 `manifest.json` 產生，不要手改。設計決策與檔案地圖見 [HANDOFF.md](HANDOFF.md)。

---

## 素材包

以路亞釣法為主的 **8-bit 像素釣魚素材庫**，視覺方向參考 [hunt-8bit](https://github.com/s7788/hunt-8bit)。

![8-bit 釣魚素材總覽](fishing-mod-assets-v1/overview.png)

## 素材內容

| 類別 | 內容 |
|---|---|
| 釣場 | 湖泊、海岸、船上，含背景與前景分層 |
| 魚種 | 12 種魚，各有游動、轉向、躍水影格與圖鑑圖 |
| 釣手 | 9 組動作、36 個影格 |
| 路亞 | 米諾、波扒、鉛筆、軟蟲、岸拋鐵板、船釣鐵板 |
| 釣具與特效 | 5 種竿姿、抄網、捲線器、6 組水花特效 |
| 紀錄介面 | 重量、長度、最長／最重紀錄標記與數字字圖 |

共 **252 張遊戲用 PNG**，另附生成母圖、圖集、動畫順序、錨點、RLE 像素資料、完整提示詞及檢查結果。

## 下載與預覽

- [下載完整素材包 ZIP](fishing-mod-assets-v1.zip)
- [詳細使用說明](fishing-mod-assets-v1/README.zh-TW.md)
- [圖片總覽](fishing-mod-assets-v1/overview.png)
- [尺寸、影格與錨點資料](fishing-mod-assets-v1/manifest.json)
- [素材檢查結果](fishing-mod-assets-v1/validation.json)

下載後可直接打開 `fishing-mod-assets-v1/preview.html`，切換場地、釣手動作與魚種。GitHub 原始碼頁面不會直接執行這個預覽頁。

如需本機素材預覽伺服器或重建檢查，安裝 Node.js 20.9 以上後，在 repo 目錄執行：

```sh
npm install
npm run preview
```

接著開啟終端顯示的本機預覽網址。驗證素材可執行：

```sh
npm run validate:assets
```

## 尺寸與接入

主畫布為 **384×216**；背景原生 **128×72**，以整數 3 倍顯示。人物、魚與釣具各有獨立的原生尺寸、透明圖層與錨點，詳細規格見素材包說明。

魚名、重量、長度與日期由程式動態繪製。**最長與最重紀錄分開保存**，可以對應不同的漁獲。

圖片由內建 image_gen 生成，再經切圖、調色、像素對齊與透明度檢查；釣竿和簡單介面採整數像素繪製。生成提示詞與已確認的風格參考保存在素材包內。
