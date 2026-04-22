# Bug Report

- Date: `2026-04-22`
- Viewpoint: `02 表示(UI) - エラー表示(正常系)`
- Severity: `Medium`
- Page: `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0`
- Title: `必須項目未入力で送信しても先頭の不正フィールドへフォーカスが移動しない`

## Summary

予約フォームで `date`, `term`, `head-count`, `username`, `contact` を未入力にして送信すると、
各項目のエラー表示は出るが、先頭の不正項目 `#date` にフォーカスが移動しない。
キーボード利用時に修正箇所へ即座に移動できず、観点02の期待に反する。

## Steps

1. `reserve.html?plan-id=0` を開く
2. `date`, `term`, `head-count` の初期値を空にする
3. `username`, `contact` は未入力のまま `予約内容を確認する` を押す

## Expected

- 各項目に個別エラーが表示される
- 先頭の不正項目にフォーカスが移動する

## Actual

- 個別エラーは表示される
- `#date` にフォーカスは移動しない

## Evidence

- Playwright failure context:
  `test-results/tests-generated-viewpoint--8b26f-常系-必須項目未入力時にフィールド別エラーが表示される/error-context.md`
