# 「3ヶ月以内」と案内しているのに、3ヶ月以内の日付を入れると「3ヶ月以内の日付を入力してください。」と弾かれる

## Steps

1. 端末の日時を 2026-10-22 10:00(日本時間)とする(テストでは page.clock で固定)
2. `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0` を開く
3. 宿泊日に `2027/01/22`(ちょうど3ヶ月後)を入力し、氏名・確認のご連絡を入力して「予約内容を確認する」を押す

## As is

- 宿泊日の下に「3ヶ月以内の日付を入力してください。」と出て送信できない
- 宿泊日欄の注記は「ご予約は3ヶ月以内の日付のみ可能です。」
- 実際の判定は「90日以内」(2027/01/20 は可、2027/01/21 は不可)。暦の3ヶ月(2027/01/22)とは月によって1〜2日ずれる
- 利用者から見ると、注記どおりの日付を入れたのに、注記と同じ文言のエラーで弾かれる

## To be

- 注記・エラーメッセージ・判定が一致している(「90日以内」と案内する、または暦の3ヶ月で判定する。どちらに合わせるかは要判断)

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0(宿泊日欄)

## 関連するIssue

- F-20260424-17(2026-04 時点の境界は「+91日可・+92日不可」と記録。現行版は「+90日可・+91日不可」。実装変更か当時の測定誤りかは不明)

## 対象テストケース

- `tests/generated/viewpoint-27-booking-window.spec.ts` › 画面の注記「3ヶ月以内」どおり、ちょうど3ヶ月後(2027/01/22)の日付で予約できる

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] macOS / Chromium (Playwright 1.60, timezoneId=Asia/Tokyo)
  - [ ] iOS:
  - [ ] Android:

## 備考

- Date: `2026-10-21`
- Viewpoint: `27 操作可能期間`
- Severity: `Low`(予約自体は他の日付でできる。案内とエラー文言が矛盾し、利用者が原因を理解できない)
- Finding ID: `F-20261021-08`
- Hypothesis: `H-20261021-02`
- Related bugs / findings: F-20260424-17, F-20261021-09
- Evidence: `reports/hotel-example-site-takeyaqa-dev/evidence/2026-10-21-v27-three-months-rejected.png`
- 推定原因(公開JSの読解): validation.js の `validateDateInput` は `after90.setDate(after90.getDate() + 90)` で判定し、datepicker も `maxDate: 90`。メッセージだけが「3ヶ月」
- 前提となるテストアカウント等: なし(未ログイン)
