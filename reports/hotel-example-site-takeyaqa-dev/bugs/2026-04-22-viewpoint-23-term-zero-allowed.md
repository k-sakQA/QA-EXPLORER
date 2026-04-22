# 宿泊数に0を指定して予約確認画面に進めてしまう

## Steps

1. 予約ページ (https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0) を開く
2. 宿泊数を「0」に変更する
3. 氏名、連絡方法、メールアドレスを正しく入力する
4. 「予約内容を確認する」ボタンをクリック

## As is

- 確認画面 (confirm.html) に遷移してしまう
- 宿泊数0での予約が可能な状態

## To be

- 宿泊数は1以上の正の整数のみ許可されるべき
- 0を入力した場合はエラーメッセージを表示し、確認画面に進ませないべき

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

## 関連するIssue

- なし

## 対象テストケース

- `tests/generated/viewpoint-23-prohibited.spec.ts` - 「宿泊数に0を指定できないこと」

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] Chromium (Playwright)

## 備考

- Date: `2026-04-22`
- Viewpoint: `23 禁則`
- Severity: `High` (業務ルール違反。0泊の予約は意味がない)
- Finding ID: `F-20260422-04`
- Hypothesis: `H-20260422-02` (numberフィールドのmin属性未設定)
- Related bugs / findings: F-20260422-05 (人数0も同様)
- Evidence: `test-results/tests-generated-viewpoint--1f93f--観点23-禁則チェック-宿泊数に0を指定できないこと/`
