# Project constraints

- The displayed product name is 助理行政小工具. Keep the NTUB campus imagery, but do not put 國立臺北商業大學｜通識教育中心 in the footer.
- Do not prefill a department-specific signer title. Use the school homepage https://www.ntub.edu.tw/ for links labelled 學校網站; do not link to a department website.

- Keep the existing NTUB campus background, university masthead, homepage and tool sidebar. Do not redesign them without an explicit user request.
- The red-envelope tool has one shared layout. Do not add event-specific templates, dropdowns, or separate template options.
- Envelope names are optional. Each row has an integer quantity of 1–200, default 1; combined copies, including appended imports, must not exceed 200. Templates and imports include quantity.
- Certificates have a dropdown for 通用通識獎狀模板 and 文學季獎狀模板. Keep separate reference typography and geometry. General certificates say 參加通識教育中心所舉辦之.
- Literature certificates and envelopes have separate activity and competition-subitem fields. The latest envelope reference uses vertical text and 標楷體, with names retained at the user's request.
- The local 模板（不能git push) folder and everything in it must remain ignored. Never stage or upload it.
- This public repository provides exactly two tools: certificate creation and red-envelope creation. No sign-in, backend, database, administrative records, or borrowing workflow.
- All recipient data and signature images must remain in browser memory. Never upload or persist them.
- Recipient imports accept .xlsx and .csv, with in-memory preview before replace/append. Keep IDs as text, reject invalid/over-limit batches atomically, and leave existing rows unchanged on errors or cancellation. Generate empty import templates in code; never bundle uploaded spreadsheets or real recipient lists.
- Batch limit is 200 items in both tools, including serial generation. Display only 每批最多 200 頁 below the tool; do not repeat font, privacy or formatting explanations in the form.
- Never commit original Word/sample documents, generated documents, real recipient lists, signature images, personal account data, private keys, service-account JSON, tokens, or proprietary font files. Do not copy the private project's Git history.
- Word examples stay outside the repository as local formatting references. Code-native layout specifications must contain only deidentified styling and placeholders. Preserve reference fonts, sizes, positions and paper dimensions; do not add decorative lines, borders, or substitute fonts.
- The public app requires no Secrets or API keys. GitHub Pages deployment uses only the built-in short-lived workflow token.
- Before pushing, run the type check, document tests, build and static/privacy verification defined in package.json.
