# ブラウザの戻るボタンでメールアドレスが消失する

## Steps

1. 予約ページ (https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0) を開く
2. 氏名、連絡方法(メール)、メールアドレス、コメントを入力する
3. 「予約内容を確認する」ボタンをクリックして確認画面に遷移
4. ブラウザの戻るボタンで予約フォームに戻る

## As is

- 氏名とコメントは保持されている
- **メールアドレス欄が空になっている**

## To be

- 氏名、メールアドレス、コメントなど全ての入力内容が保持されるべき

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

## 関連するIssue

- なし

## 対象テストケース

- `tests/generated/viewpoint-10-basic-flow.spec.ts` - 「ブラウザ戻るボタンで入力内容が保持される」

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] Chromium (Playwright)

## 備考

- Date: `2026-04-22`
- Viewpoint: `10 単機能`
- Severity: `Medium` (ユーザーが再入力を強いられるUX問題)
- Finding ID: `F-20260422-01`
- Hypothesis: (状態管理関連の問題か? 他のフィールドでも起きる可能性)
- Related bugs / findings: -
- Evidence: `test-results/tests-generated-viewpoint--f9c25-ム基本フロー-ブラウザ戻るボタンで入力内容が保持される/`
