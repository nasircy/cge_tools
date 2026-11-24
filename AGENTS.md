# Project constraints

- The displayed product name is 助理行政小工具. Keep the NTUB campus imagery, but do not put 國立臺北商業大學｜通識教育中心 in the footer.

- Keep the existing NTUB campus background, university masthead, homepage and tool sidebar. Do not redesign them without an explicit user request.
- This public repository provides exactly two tools: certificate creation and red-envelope creation. No sign-in, backend, database, administrative records, or borrowing workflow.
- All recipient data and signature images must remain in browser memory. Never upload or persist them.
- Never commit original Word/sample documents, generated documents, real recipient lists, signature images, personal account data, private keys, service-account JSON, tokens, or proprietary font files. Do not copy the private project's Git history.
- Word examples stay outside the repository as local formatting references. Code-native layout specifications must contain only deidentified styling and placeholders. Preserve reference fonts, sizes, positions and paper dimensions; do not add decorative lines, borders, or substitute fonts.
- The public app requires no Secrets or API keys. GitHub Pages deployment uses only the built-in short-lived workflow token.
- Before pushing, run the type check, document tests, build and static/privacy verification defined in package.json.
