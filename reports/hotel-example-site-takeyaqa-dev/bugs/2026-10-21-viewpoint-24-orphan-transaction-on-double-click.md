# 「予約内容を確認する」をダブルクリックすると、使われない予約データ(氏名・連絡先を含む)が sessionStorage に残り続ける

## Steps

1. `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0` を開く
2. 氏名を入力し、確認のご連絡で「希望しない」を選ぶ
3. 「予約内容を確認する」をダブルクリックする
4. 確認画面が表示されたら、DevTools の Application > Session Storage を見る

## As is

- 送信のたびに取引データが1件ずつ作られる(ダブルクリックで2件)。確認画面は Cookie に入っている最後の1件だけを読んで削除するので、1件目が sessionStorage に残る
- 残ったデータには入力した氏名・連絡方法・メールアドレス・電話番号・要望がそのまま入っている
  (例: `{"username":"ダブルクリック","contact":"no","email":"","tel":"",...}`)
- タブを閉じるまで消えない。同じタブで予約を繰り返すと、そのたびに増える

## To be

- 確認画面に進んだ時点で、使われなかった取引データも残らない
  (送信中はボタンを無効化して2回目の submit を防ぐ、または前の取引データを上書き・削除する)

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0 → confirm.html

## 関連するIssue

- F-20260424-08(確認ボタンに二重送信防止が無い)。今回、その結果として残るデータを確認した

## 対象テストケース

- `tests/generated/viewpoint-24-transaction-create.spec.ts` ›「予約内容を確認する」をダブルクリックしても、使われない取引データが sessionStorage に残らない

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] macOS / Chromium (Playwright 1.60)
  - [ ] iOS:
  - [ ] Android:

## 備考

- Date: `2026-10-21`
- Viewpoint: `24 生成と一意性`
- Severity: `Low`(画面上の不具合は無い。共用端末で同じタブを使い続けた場合に、前の利用者の氏名・連絡先がブラウザに残る)
- Finding ID: `F-20261021-03`
- Hypothesis: -
- Related bugs / findings: F-20260424-08
- Evidence: `reports/hotel-example-site-takeyaqa-dev/evidence/2026-10-21-v24-orphan-transaction.png`(画面上は正常に見える。データはテスト出力で確認)/ 再現率 5/5
- 前提となるテストアカウント等: なし(未ログイン)

## 別の再現経路 (2026-10-21, P-20261021-01)

- 「予約内容を確認する」を押した後、確認画面の読み込みが中断されて(通信断・利用者の中止)予約フォームに留まり、もう一度送信した場合も、1回目の取引データ(氏名入り)が sessionStorage に残る
- 対象テストケース: `tests/generated/probe-20261021-01-back-forward.spec.ts` › 確認画面の読み込みが中断された後に再送信しても、使われない取引データが残らない
- Evidence: `reports/hotel-example-site-takeyaqa-dev/evidence/2026-10-21-p01-orphan-after-aborted-load.png`
- Finding: F-20261021-07
