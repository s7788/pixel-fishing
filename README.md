# Pixel Fishing

以路亞釣法為主的 **8-bit 像素釣魚 mod 素材庫**，視覺方向參考 [hunt-8bit](https://github.com/s7788/hunt-8bit)。

目前完成首版圖片與動畫素材，提供給後續遊戲實作使用。遊戲玩法、漁獲數值、存檔與工作回合連動尚待接入。

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

如需本機預覽伺服器或重建檢查，安裝 Node.js 20.9 以上後，在 repo 目錄執行：

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
