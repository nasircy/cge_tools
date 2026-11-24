# 助理行政小工具

[開啟 GitHub Pages](https://nasircy.github.io/cge_tools/)

保留北商校園背景、校名校徽、原本首頁樣式及工具側邊欄。只提供兩個免登入的前端工具：

- **紅包袋製作**：生命教育、北商文學季兩種原稿版面，以兩個並排選項直接選擇，支援批次名單。
- **獎狀製作**：可修改的科目／活動名稱、獎狀製發日期、文字姓名、科系班級、不限位數且可含英文的學號、獎項、流水號起號與選用簽章圖。

輸出 DOCX 或包含 DOCX 的 ZIP。每批最多 100 位；切換工具保留分頁內的輸入，重新整理或關閉後清除。

## 原稿樣式

原始 Word 檔與範例文件只在開發者本機作為參考，**不放入本 repo，也不放入部署產物**。公開程式只含去識別化的 OOXML 排版規格，由瀏覽器即時組成新的 Word 檔案，不下載原稿、不包含原作者、真實名單、文件屬性或自訂 XML。

- 獎狀依原稿使用 **標楷體**，保留 A4、頁邊距、原字級與段落位置。
- 紅包袋依原稿使用 **華康行書體**，保留 90 × 200 mm 的紙張及文字方塊位置。
- 不擅自加入上下線、頁框、裝飾或替換字型。
- 這兩種字型需安裝於開啟 Word 的裝置；repo 不散布商用字型。需要 PDF 時，請在 Word 中另存為 PDF，維持原稿字型與排版。

## 隱私與架構

Vite + React + TypeScript 純靜態網站，透過 GitHub Pages 發布。沒有登入、伺服器、資料庫、雲端紀錄、分析追蹤或借還功能；不需要 GitHub Secrets 或 API key。

姓名、學號、名單、簽章圖片及成品只在瀏覽器記憶體中處理，不上傳、不寫入 localStorage／IndexedDB。網站僅向自身來源下載程式與北商公開校園圖片。**不要把 Word／範例文件、實際名單、簽章、成品、帳號資料或金鑰提交到公開 repo。**

## 本機開發

使用 Node.js 24 與 npm：

```sh
npm ci
npm run dev
```

預設路徑 `/cge_tools/` 與 GitHub Pages 子目錄一致。

```sh
npm run check
npm test
npm run build
npm run verify:static
npm run preview
```

`dist/` 可直接放到靜態主機；使用網域根目錄時，將 `vite.config.ts` 的 `base` 改為 `/`。

## GitHub Pages

Settings → Pages → Source 使用 **GitHub Actions**。推送 `main` 後先驗證型別、文件與排版測試、建置、靜態及憑證檢查，再將 `dist/` 部署至 Pages。PR 只做檢查。部署只使用 GitHub 自動提供的短效 token，不需額外設定 Secrets。

流水號依填寫的「獎狀製發日期」組成民國年月日加四位序號，落款日期使用同一個製發日期；畫面會即時預覽首號與末號。例如製發日期 `2027-02-03`、起號 `7` 時，字號為 `11602030007`。各批自行設定起號，不做跨裝置或跨批次配號。姓名與學號皆為文字欄位，學號保留前導零、不固定長度、不限定純數字。兩個工具的科目／活動名稱皆可自行修改。

校園背景與校徽沿用原專案的北商官方公開資源，存於 `public/campus/`，使用網站時不另向校方圖片主機送出請求：

- https://www.ntub.edu.tw/var/file/0/1000/img/297/DSC05308.jpg
- https://ctl.ntub.edu.tw/var/file/8/1008/msys_1008_4825068_95377.png

維護者：[@nasircy](https://github.com/nasircy)
