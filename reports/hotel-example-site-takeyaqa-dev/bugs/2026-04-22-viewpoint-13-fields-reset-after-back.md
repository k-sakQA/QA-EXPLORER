# ブラウザバックで宿泊日・宿泊数・人数が初期値に戻る

## Steps

1. 予約ページ (https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0) を開く
2. 宿泊日を「2026/05/15」に変更
3. 宿泊数を「5」に変更
4. 人数を「3」に変更
5. 氏名を入力、連絡方法は「希望しない」を選択
6. 「予約内容を確認する」ボタンをクリックして確認画面に遷移
7. ブラウザの戻るボタンで予約フォームに戻る

## As is

- 宿泊日が「2026/04/23」(初期値)に戻っている
- 宿泊数が「1」(初期値)に戻っている
- 人数が「1」(初期値)に戻っている
- 氏名・追加プランは保持されている

## To be

- 入力した全ての値が保持されるべき
- ブラウザバック時に再入力を強いられるのはUX上深刻な問題

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

## 関連するIssue

- なし

## 対象テストケース

- `tests/generated/probe-20260422-01-state-loss.spec.ts` - 「宿泊日・宿泊数・人数もブラウザバックで保持されるか確認」

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] Chromium (Playwright)

## 備考

- Date: `2026-04-22`
- Viewpoint: `13 切替えとデータ保持`
- Severity: `High` (ユーザーが確認画面から戻った際に再入力を強いられる)
- Finding ID: `F-20260422-07`
- Hypothesis: `H-20260422-01` (Confirmed - 状態復元の実装不備)
- Related bugs / findings: F-20260422-01 (メールアドレス消失も同根)
- Evidence: `test-results/tests-generated-probe-2026-6f082-*/`
