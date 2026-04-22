# 全角スペースのみの氏名で予約確認画面に進めてしまう

## Steps

1. 予約ページ (https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0) を開く
2. 氏名欄に全角スペースのみ「　　　」を入力
3. 連絡方法は「希望しない」を選択
4. 「予約内容を確認する」ボタンをクリック

## As is

- 確認画面 (confirm.html) に遷移できてしまう
- 氏名が空白のみでも予約が成立する可能性

## To be

- 全角スペースのみは「未入力」として扱い、エラーを表示すべき
- trim処理を行った上で空文字かどうかを判定すべき

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

## 関連するIssue

- なし

## 対象テストケース

- `tests/generated/viewpoint-03-charset.spec.ts` - 「全角スペース・半角スペースのみの氏名」

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] Chromium (Playwright)

## 備考

- Date: `2026-04-22`
- Viewpoint: `09 未入力` (実質的には未入力バリデーションの問題)
- Severity: `Medium` (業務上無意味なデータが登録される可能性)
- Finding ID: `F-20260422-09`
- Hypothesis: -
- Related bugs / findings: H-20260422-01 (バリデーション実装の甘さ)
- Evidence: `test-results/`
