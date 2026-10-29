# 2つのタブで予約を進めると、先に送信したタブの予約内容が消えてトップページに飛ばされる

## Steps

1. `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0` をタブAとタブBで開く(プラン一覧から2つのプランを新規タブで開いた状況と同じ)
2. タブAで氏名「タブA」を入力して「予約内容を確認する」を押す
3. タブAの確認画面の読み込みが終わる前に(回線が遅い想定)、タブBで氏名「タブB」を入力して「予約内容を確認する」を押す
4. タブAの確認画面の読み込みが終わるのを待つ

## As is

- タブBは「タブB様」の確認画面になる
- タブAは確認画面ではなくトップページ(index.html)に飛ばされ、入力した予約内容が失われる。エラーや説明は出ない
- 再現率 3/3(テストでは Playwright の route でタブAの確認画面の応答を止め、タブBの確認画面が出てから解放)

## To be

- それぞれのタブに、そのタブで入力した予約内容の確認画面が表示される

## 再現箇所・URL

- https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0 → confirm.html

## 関連するIssue

- F-20261021-01(確認画面リロードで入力消失)、F-20261021-03(ダブルクリックで取引データが残る)。同じ受け渡し方式が原因(H-20261021-01)

## 対象テストケース

- `tests/generated/viewpoint-25-two-tabs-transaction.spec.ts` › タブAの確認画面の読み込み中にタブBで送信しても、タブAには自分の予約内容が表示される

## 不具合が発生している環境 - 再現端末(OS・ブラウザ)

- Web
  - [x] macOS / Chromium (Playwright 1.60)
  - [ ] iOS:
  - [ ] Android:

## 備考

- Date: `2026-10-21`
- Viewpoint: `25 更新と競合`
- Severity: `Low`(回線が遅く、確認画面の表示前に別タブで送信した場合に限る。起きると入力が全部消える)
- Finding ID: `F-20261021-05`
- Hypothesis: `H-20261021-01`
- Related bugs / findings: F-20261021-01, F-20261021-03
- Evidence: `reports/hotel-example-site-takeyaqa-dev/evidence/2026-10-21-v25-tabA-redirected-to-top.png`
- 推定原因(公開JSの読解): 予約データ本体はタブごとの sessionStorage に入るが、それを指す取引IDはタブ間で共有される `transaction` Cookie 1本で渡している。タブBの送信で Cookie が上書きされ(またはタブBの確認画面が Cookie を削除し)、タブAの確認画面は自分の予約データを見つけられずに `redirectToTop()` する。順番に操作すれば起きない(同 spec の1件目はパス)
- 前提となるテストアカウント等: なし(未ログイン)
