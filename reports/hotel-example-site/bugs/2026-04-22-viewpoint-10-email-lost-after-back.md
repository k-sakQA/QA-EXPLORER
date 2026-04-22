# Bug Report

- Date: `2026-04-22`
- Viewpoint: `10 動作確認 - 単機能` (関連派生観点: `DV-20260422-01`)
- Severity: `High`
- Page: `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0`
- Title: `確認画面から戻るとメール連絡選択状態と email 入力値の整合が崩れる`
- Finding ID: `F-20260422-02`

## Summary

予約フォームで `contact=email` と `email=qa@example.com` を入力して確認画面へ進み、
ブラウザバックすると、`contact` は `email` のままだが `#email` は空文字かつ `disabled`
 になっている。利用者は再入力が必要になり、状態保持の期待に反する。

## Steps

1. `reserve.html?plan-id=0` を開く
2. 有効な日付、宿泊数、人数、氏名を入力する
3. `確認のご連絡` で `メールでのご連絡` を選び、`qa@example.com` を入力する
4. `予約内容を確認する` で確認画面へ進む
5. ブラウザバックする

## Expected

- 戻った後も `contact=email` に対応する `email` 欄が表示・有効化され、入力済み値が保持される

## Actual

- `contact=email` は残る
- `#email` は空で `disabled` のままになり、選択状態と入力欄の状態が不整合

## Evidence

- Playwright failure context:
  `test-results/tests-generated-viewpoint--f054c----単機能-確認画面から戻っても入力内容が保持される/error-context.md`

## Related

- Hypothesis: `H-20260422-01` (ユーザー操作後の状態整合性が弱い)
- Related bugs: `F-20260422-01` (いずれも状態整合性のテーマ)
