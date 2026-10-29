# Findings Archive

findings.md から退避したクローズ済みエントリ。関連調査が必要なときだけ検索する。

## Archived 2026-10-21 (Session #7)

### F-20260422-04
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 23 禁則
- Fact: 宿泊数(term)に0を入力しても確認画面に遷移できてしまう。input[type=number]のmin属性がnull。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-23-term-zero-allowed.md
- Related: F-20260422-05, H-20260422-02

### F-20260422-05
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 23 禁則
- Fact: 人数(head-count)に0を入力しても確認画面に遷移できてしまう。input[type=number]のmin属性がnull。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-23-headcount-zero-allowed.md
- Related: F-20260422-04, H-20260422-02

### F-20260422-11
- Date: 2026-04-22
- Source: Hypothesis-Rejected
- Viewpoint: 15 変更・反映
- Fact: 料金計算は仕様通り。「お一人様1泊7,000円」は人数×7,000円の意味。テスト時に人数変更後の料金更新を待っていなかったため誤検出。2名1泊朝食付きで16,000円は正しい(14,000+2,000)。
- Bug Link: - (削除)
- Related: H-20260422-03 (Rejected)

### H-20260424-01
- Born from: F-20260424-01, F-20260424-02, F-20260424-03, F-20260424-04
- Statement: このサイトのバリデーションはHTML5属性(required/min/max/type)とクライアントサイドJSに完全依存しており、サーバ側バリデーションが存在しない。そのため、DevToolsやJSでHTML属性を改ざんすると、あらゆる不正値（0円料金、0泊、100泊、空白氏名）が確認画面を通過する。フォームデータがGETパラメータとして送信される構造（F-20260422-13）と合わせると、URL直打ちによる不正予約も理論上可能。
- Status: Confirmed
- Probes planned: P-20260424-01
- Notes: Hidden料金改ざん(0円)、宿泊数0/人数0、宿泊数100、全角スペース氏名、全てが確認画面を通過。サーバ側にガードレールが一切ない。

### P-20260424-01
- Verifies: H-20260424-01
- Target viewpoint: 08 数値(異常値) / 23 禁則 【追加検証】
- Plan:
  1. confirm.htmlにGETパラメータを直接構築してアクセスし、不正データの予約成立を確認
  2. required属性をJS除去して全フィールド空で送信
  3. plan-id-hiddenを存在しないIDに変更して送信
- Status: Done
- Result:
  1. confirm.htmlはGETパラメータ直打ちでは機能しない。JS状態管理で遷移するため、URLに直接パラメータを付けてアクセスしても空のページまたはリダイレクトになる。
  2. required属性をJS除去して全フィールド空で送信 → JS側の追加バリデーションにより弾かれた。
  3. 0円料金のURLは直接アクセスしても予約ボタンが表示されなかった。
  - **結論**: H-20260424-01を部分修正。サーバ側バリデーションは不在だが、confirm.htmlへのURL直打ちバイパスは不可。ただしreserve.htmlでのJS属性改ざんは引き続き有効。

### F-20260424-12
- Date: 2026-04-24
- Source: Probe-Result
- Viewpoint: 08 数値(異常値) / 23 禁則
- Fact: P-20260424-01 の結果。confirm.html は JS 状態管理で遷移しており、GET パラメータの直打ちでは予約成立しない。ただし reserve.html でのクライアントサイド改ざんは引き続き全て有効。
- Bug Link: -
- Related: H-20260424-01, P-20260424-01

### H-20261021-02
- Born from: F-20261021-08, F-20261021-09
- Statement: 宿泊日の扱いを JavaScript の Date のローカル演算(端末のタイムゾーン、+N日、new Date(年,月,日))に任せており、業務上の暦(日本時間・暦月・実在する日付)と照合していない。そのため、暦の上でありえない日付やずれた日付が、気づかれないまま受け付けられる
- Status: Confirmed
- Probes planned: P-20261021-02
- Notes: 公開JSのパーサ(i18n.js の DATE_SHORT_PARSER)は `new Date(year, month - 1, date)` で、2/31 などの正規化を検出していない

### P-20261021-02
- Verifies: H-20261021-02
- Target viewpoint: 23 禁則(値)
- Plan:
  1. 実在しない日付(2026/11/31, 2026/12/32, 2026/13/01 相当の範囲内のもの)を入力し、エラーになるか、別の日付に読み替えられて確認画面に進むかを見る
  2. 読み替えられた場合、確認画面の「期間」が入力と違う日付になっていないか
- Status: Done
- Result: 3件とも読み替えられて確認画面に進んだ(F-20261021-10)。仮説どおり → H-20261021-02 Confirmed
