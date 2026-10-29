# Findings

テスト対象: `https://hotel-example-site.takeyaqa.dev/ja/plans.html`
開始日: `2026-04-22`

このファイルは、探索的テストで得た「事実・仮説・次の一手」を3層で蓄積します。
セッション開始時に**必ず全件読む**ことで、前回の気づきを次のテストに活かします。

- **Finding (F-)**: テスト中に観察した事実。バグ、気づき、仮説検証の結果。
- **Hypothesis (H-)**: 複数のFindingから立てた、この対象の弱点・癖に関する仮説。
- **Probe (P-)**: 仮説を検証するための具体的なテスト計画。

ID形式: `F-YYYYMMDD-NN` / `H-YYYYMMDD-NN` / `P-YYYYMMDD-NN` (同日内の通し番号)

---

## Findings (事実)

### F-20260422-01
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 10 単機能
- Fact: 確認画面からブラウザバックで戻ると、メールアドレス欄の入力値が消失する。氏名・コメントは保持される。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-10-email-lost-after-back.md
- Related: -

### F-20260422-02
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 02 エラー表示
- Fact: 必須項目未入力時のバリデーションメッセージがブラウザデフォルトの英語表示("Please fill out this field.")。日本語サイトとしてはUX上の問題あり。ただし一部カスタムメッセージ(「このフィールドを入力してください。」)も混在。
- Bug Link: -
- Related: -

### F-20260422-03
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 02 エラー表示
- Fact: エラー発生時、フォーカスが最初の不正フィールドに移動せず、送信ボタン(submit-button)に留まる。アクセシビリティ上の問題。
- Bug Link: -
- Related: F-20260422-02

### F-20260422-06
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 23 禁則
- Fact: 宿泊数・人数のinput[type=number]フィールドにはmin/max属性が未設定。上限チェックもない。999泊は弾かれるが、これはJS側でのチェック(非HTML5バリデーション)と推測。
- Bug Link: -
- Related: F-20260422-04, F-20260422-05

### F-20260422-07
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 13 切替えとデータ保持
- Fact: ブラウザバックで宿泊日・宿泊数・人数が初期値に戻る。メールアドレス(F-20260422-01)と同じ問題がより広範に存在。チェックボックス(追加プラン)と氏名は保持される。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-13-fields-reset-after-back.md
- Related: F-20260422-01, H-20260422-01

### F-20260422-08
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 02 エラー表示
- Fact: 条件付き必須フィールド(email/tel)のrequired属性はJS動的に設定されている。contact select変更時にrequired属性が追加/削除される動作を確認。
- Bug Link: -
- Related: H-20260422-01

### F-20260422-09
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 09 未入力
- Fact: 氏名欄に全角スペースのみ(「　　　」)を入力しても確認画面に遷移できる。trim処理なしでrequiredチェックが行われている。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-09-fullwidth-space-only.md
- Related: H-20260422-01

### F-20260422-10
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 03 文字種
- Fact: XSS脆弱性なし。scriptタグ・imgタグ等は適切にHTMLエスケープされ、テキストとして表示される。SQLインジェクション風文字列、サロゲートペア(絵文字)、制御文字も問題なく処理される。
- Bug Link: -
- Related: -

### F-20260422-12
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 08 数値(異常値)
- Fact: 宿泊数にJSでNaNを設定して送信すると確認画面に進めるが、表示は「1泊」となる。NaNはデフォルト値(1)として扱われている。厳密にはバグだが、影響は軽微(ユーザーが意図的にNaNを入力することは困難)。
- Bug Link: -
- Related: -

### F-20260422-13
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 06 文字数(異常値)
- Fact: 氏名欄にmaxlength属性がなく、1000文字入力すると確認画面遷移時にURL長超過エラー(「Error: URI Too Long」)が発生する。フォームデータがGETパラメータで渡されるため、長大な入力がURLに含まれ、サーバーが414エラーを返す。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-06-username-too-long.md
- Related: H-20260422-04

### F-20260422-14
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 06 文字数(異常値)
- Fact: コメント欄はmaxlength=140が設定されているが、DevToolsでmaxlengthを削除するとサーバー側チェックなく200文字以上でも確認画面に遷移できる。フロントエンドのみの制限。
- Bug Link: -
- Related: H-20260422-04

### F-20260422-15
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 04 文字数(正常値)
- Fact: 氏名欄、メールアドレス欄にmaxlength属性が設定されていない。氏名500文字は正常に処理される。
- Bug Link: -
- Related: F-20260422-13

### F-20260422-16
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 05 文字数(正常限界)
- Fact: 電話番号はpattern="[0-9]{11}"で11桁固定。10桁の固定電話番号(03-xxxx-xxxx形式)は弾かれる設計。日本の電話番号体系を考慮すると10桁・11桁の両方を受け入れるべきではないか(設計上の課題)。
- Bug Link: -
- Related: -

### F-20260422-17
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 17 キャンセル
- Fact: 予約フォームにキャンセルボタンがない。ロゴリンクはhref="#"で同一ページ内遷移。plans.htmlに遷移してからブラウザバックで戻ると、F-20260422-07と同様に宿泊数・人数が初期値に戻る。
- Bug Link: -
- Related: F-20260422-07, H-20260422-01

### F-20260422-18
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 18 複数因子の組合せ
- Fact: 9名×9泊×全オプションON(最大組み合わせ)で正常に確認画面に遷移できる。料金計算も一貫している(697,500円)。極端な組み合わせでもシステムエラーは発生しない。
- Bug Link: -
- Related: -

### F-20260422-19
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 01 レイアウト/文言
- Fact: レスポンシブ対応OK。375px(モバイル)、768px(タブレット)、1920px(デスクトップ)いずれもレイアウト崩れなし。フォーム要素の文言も一貫している。
- Bug Link: -
- Related: -

### F-20260422-20
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 19 登録と参照
- Fact: 予約完了ダイアログを閉じた後も「この内容で予約する」ボタンがクリック可能で、再度クリックすると予約完了ダイアログが再表示される。二重予約が可能な状態。予約完了後にボタンの無効化や画面遷移がない。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-19-double-booking.md
- Related: -

### F-20260422-21
- Date: 2026-04-22
- Source: Observation
- Viewpoint: 19 登録と参照
- Fact: 予約完了時に予約番号や確認コードは発行されない。予約履歴の参照機能もない(会員機能がないため)。完了画面はダイアログ表示のみで、別ページへの遷移はない。
- Bug Link: -
- Related: F-20260422-20

---

## Session 5 Findings (2026-04-24 ゼロベース探索)

### F-20260424-01
- Date: 2026-04-24
- Source: Bug
- Viewpoint: 08 数値(異常値)
- Fact: hidden フィールド `#room-bill-hidden` の value を JS/DevTools で 0 に改ざんすると、確認画面で合計 **0円** と表示され予約が成立する。クライアントサイドで料金計算しており、サーバ側再計算・検証なし。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-24-viewpoint-08-hidden-price-tamper.md
- Related: F-20260424-02, F-20260424-03, H-20260424-01

### F-20260424-02
- Date: 2026-04-24
- Source: Bug
- Viewpoint: 08 数値(異常値)
- Fact: `#term` と `#head-count` の min/max 属性を JS で除去すると、宿泊数0・人数0で確認画面に遷移可能。金額0円。HTML5バリデーションのみでサーバ側チェックなし。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-24-viewpoint-08-term-headcount-zero.md
- Related: F-20260424-01, F-20260424-03, H-20260424-01

### F-20260424-03
- Date: 2026-04-24
- Source: Bug
- Viewpoint: 08 数値(異常値)
- Fact: `#term` の max 属性を JS で除去すると宿泊数100で確認画面に到達。750,750円（100泊分）の予約が成立。業務上ありえない値が通過する。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-24-viewpoint-08-term-headcount-zero.md
- Related: F-20260424-01, F-20260424-02, H-20260424-01

### F-20260424-04
- Date: 2026-04-24
- Source: Bug
- Viewpoint: 09 未入力
- Fact: 氏名欄に全角スペースのみ(`　　　`)または半角スペースのみ(`   `)を入力しても確認画面に遷移できる。確認画面の氏名表示は「　様」。trim()なしでrequiredチェックが行われている。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-24-viewpoint-09-whitespace-username.md
- Related: H-20260424-01

### F-20260424-05
- Date: 2026-04-24
- Source: Bug
- Viewpoint: 11 イベントによる状態変化 / 13 切替えとデータ保持
- Fact: 確認画面からブラウザバックで戻ると、宿泊数(2→1)・人数(3→1)がデフォルト値にリセットされる。コメント欄(textarea)は保持。number型inputのみ値が消失する。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-24-viewpoint-11-browser-back-data-loss.md
- Related: -

### F-20260424-06
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 02 エラー表示
- Fact: バリデーションメッセージは英語ベースのブラウザネイティブ("Please fill out this field.")。カスタムエラー要素(`.invalid-feedback`)は8個あるが7個は空文字。日本語メッセージ「このフィールドを入力してください。」は氏名欄のみ表示。
- Bug Link: -
- Related: H-20260424-01

### F-20260424-07
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 03 文字種
- Fact: XSSサニタイズはOK（script/imgタグはHTMLエスケープされる）。SQLインジェクション風文字列も安全。サロゲートペア(絵文字🍣)は正常保持。制御文字(タブ・改行)も通過する。
- Bug Link: -
- Related: -

### F-20260424-08
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 12 経時変化
- Fact: 確認ボタン・予約ボタンともにクリック後の無効化(disabled)なし。ダブルクリックで問題は発生しないが、二重送信防止の仕組みが見当たらない。
- Bug Link: -
- Related: -

### F-20260424-09
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 23 禁則
- Fact: 当日の日付で予約しようとすると弾かれる（明日以降のみ受付）。1年後(365日後)も弾かれる。予約可能期間に上限がある。不正日付("abc", "99/99/99", ISO形式 "2026-04-30")も弾かれる。
- Bug Link: -
- Related: -

### F-20260424-10
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 11 イベントによる状態変化
- Fact: 連絡方法select変更時のemail/tel表示切替は正常動作。「希望しない」→両方非表示、「メール」→email表示/tel非表示、「電話」→tel表示/email非表示。
- Bug Link: -
- Related: -

### F-20260424-11
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 10 単機能
- Fact: 全10プラン(plan-id=0-9)のフォームが正常に開ける。プラン一覧→フォーム→確認→完了の一連フローは正常動作。リンクは新規タブで開く仕様(target="_blank")。
- Bug Link: -
- Related: -

---

## Session 6 Findings (2026-04-24 ナレッジ活用探索)

### F-20260424-13
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 18 複数因子の組合せ
- Fact: 全10プランのフォーム構造を網羅的に調査。各プランで term/head-count の min/max が異なる: plan-id=1(head:2-9), plan-id=2(term:1-3,head:1-4), plan-id=4(head:1-2), plan-id=5(head:1-2), plan-id=6(head:1-6), plan-id=7(term:1-3,head:1-6), plan-id=8(term:1-2,head:2-2), plan-id=9(term:1-5)。プランごとに業務ルールが反映されている。
- Bug Link: -
- Related: F-20260424-16

### F-20260424-14
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 08 数値(異常値)
- Fact: plan-id=0,2,3 で JS 改ざん（宿泊数 0, 全角スペース氏名, 料金 0 円）が全て通過することを横展開で確認。plan-id=1 も正しい min 値 (head-count=2) で再テストしたところ宿泊数 0 / 全角スペースは通過。H-20260424-01 の「全プラン共通脆弱性」を裏付け。
- Bug Link: -
- Related: F-20260424-01, F-20260424-02, F-20260424-04, H-20260424-01

### F-20260424-15
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 08 数値(異常値)
- Fact: plan-id=1 (プレミアムプラン) のみ hidden 料金改ざん（0 円）が確認画面に遷移しなかった。plan-id=0,2,3 では同じ改ざんが通過する。plan-id=1 固有の追加バリデーションまたは JS 挙動の差異が存在する可能性。
- Bug Link: -
- Related: F-20260424-13, H-20260424-02

### F-20260424-16
- Date: 2026-04-24
- Source: Bug
- Viewpoint: 08 数値(異常値) / 23 禁則
- Fact: plan-id=8 (カップル限定プラン, head:2-2, term:1-2) で JS 改ざんにより以下が通過: (1) 宿泊数 0, (2) 人数 1 人（カップル限定なのに1人予約成立、金額10,000円）, (3) 3 泊（max=2 なのに通過、金額 52,000 円）。業務ルール上ありえない予約が成立する。
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-24-viewpoint-08-couple-plan-constraint-bypass.md
- Related: F-20260424-02, F-20260424-03, H-20260424-01

### F-20260424-17
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 23 禁則
- Fact: 日付バリデーション境界値を特定。+91 日 (7/24) は予約可能、+92 日 (7/25) は弾かれる。今日 (4/24) から「3 カ月後」が境界。仕様として明示はないが、3 カ月先まで予約可能という業務ルールと推定。
- Bug Link: -
- Related: F-20260424-09

### F-20260424-18
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 11 イベントによる状態変化
- Fact: 連絡方法切替のエッジケースを検証。メール→電話切替時に前のメール値は確認画面に表示されない (正常)。「希望しない」に戻しても非表示 email 欄に value 残存するが、確認画面には反映されない (正常)。10 桁固定電話・ハイフン付き・12 桁は全て弾かれる (11 桁数字のみ許可)。
- Bug Link: -
- Related: F-20260422-16, F-20260424-10

---

## Session 6 Hypotheses (2026-04-24)

### H-20260424-02
- Born from: F-20260424-15, F-20260424-13
- Statement: プランごとに JS バリデーションロジックが異なる。plan-id=1 (プレミアムプラン) では hidden 料金フィールド改ざんが弾かれるが、他プラン (0,2,3) では通過する。プレミアム会員限定プランのみ追加のクライアントサイドチェックが実装されている可能性がある。
- Status: Open
- Probes planned: P-20260424-02
- Notes: 全10プランの料金改ざん横展開が必要。plan-id=1 の JS ソースコードの差異解析も有効。

### P-20260424-02
- Verifies: H-20260424-02
- Target viewpoint: 08 数値(異常値)
- Plan:
  1. 全10プラン (plan-id=0-9) で正しい min 値を用いて hidden 料金改ざん (0 円) を実施
  2. 弾かれるプランと通過するプランのパターンを特定
  3. plan-id=1 の reserve.html の JS ソースを他プランと比較
- Status: Planned
- Result: (次セッションで実施)

---

## 前提知識 (Context)

### C-01
- Added: 2026-10-21 (S7)
- Content: バックエンドが無い練習サイト。予約データは submit 時に `sessionStorage[<10桁の取引ID>]` へ保存し、取引IDは `transaction` Cookie(path=/ja、セッションCookie)で confirm.html に渡す。confirm.html は読み込んだ時点で Cookie と sessionStorage の両方を削除する(1回限り消費)。フォームの action は GET だが、confirm.html は `history.replaceState` でクエリを消す

### C-02
- Added: 2026-10-21 (S7)
- Content: 2026-10 時点の実装では term/head-count の min/max を `/data/ja/plan_data.json` から設定している。2026-04 の Finding(F-20260422-04/05/06 の「min 属性が null」など)は旧実装の観察である可能性が高く、再現確認なしに前提にしない

### C-03
- Added: 2026-10-21 (S7)
- Content: テスト時の約束事。(1) ユーザー指示により、セキュリティ攻撃にあたる操作(hidden 値やHTML属性の改ざん、認証Cookieの偽造、XSS文字列の投入)はしない。(2) 外部の計測スクリプト(plausible.io)は `tests/generated/support/hotel-reserve.ts` の `blockAnalytics` で遮断する。(3) 確認画面の見出しは静的HTMLなので、confirm.js の描画完了は `#total-bill` に「合計」が入るまで待って判定する(S7 で見出し待ちによる偽陽性を経験)

---

## Session 7 Findings (2026-10-21 広く浅く・観点24〜28)

### F-20261021-01
- Date: 2026-10-21
- Source: Observation
- Viewpoint: 26 削除と参照整合
- Fact: 確認画面でリロード(F5)すると、取引データが消費済みのため説明なしにトップページ(index.html)へ遷移し、入力した予約内容がすべて失われる。消し残しは無く、削除済みの取引で confirm.html を開いても内部エラーは出ずトップへ誘導される(参照整合そのものは正常)。ブラウザバック→再送信では新しい取引で正しく確認画面が出る
- Evidence: reports/hotel-example-site-takeyaqa-dev/evidence/2026-10-21-v26-confirm-reload-to-top.png / tests/generated/viewpoint-26-transaction-consume.spec.ts
- Needs-Human: Yes — 確認画面のリロードで入力が消えてトップへ戻るのは、二重予約を防ぐための意図した仕様か(仕様なら、せめて理由の表示が要るか)
- Bug Link: -
- Related: C-01

### F-20261021-02
- Date: 2026-10-21
- Source: Observation
- Viewpoint: 28 操作可能ユーザー(認可)
- Fact: 未ログインでは、プレミアム限定(plan-id=1)・会員限定(2,3)・存在しないプラン(999)を直リンクで開いてもトップへ誘導され、一覧にもリンクが出ない(6/6 パス)。ただし判定は読み込み時のブラウザ側だけ(`canDisplayPlan`)で、送信時には会員チェックが無い。ログイン中にフォームを開いてから別タブでログアウトした場合は通る見込み → MT-20261021-01 で人間が確認
- Bug Link: -
- Related: C-01

### F-20261021-03
- Date: 2026-10-21
- Source: Bug
- Viewpoint: 24 生成と一意性
- Fact: 「予約内容を確認する」をダブルクリックすると取引データが2件作られ、確認画面は Cookie の最後の1件だけを消費する。使われなかった1件(氏名・連絡先入り)が sessionStorage に残る。再現率 5/5。入力エラー時には取引データは作られない(正常)
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-10-21-viewpoint-24-orphan-transaction-on-double-click.md
- Related: F-20260424-08, C-01

### F-20261021-04
- Date: 2026-10-21
- Source: Bug
- Viewpoint: 24 生成と一意性 / 19 登録と参照
- Fact: F-20260422-20(完了ダイアログを閉じた後に再度予約できる)は現行版でも再現。ただし予約URLを直接開いた場合のみ。プラン一覧から新規タブで開いた場合は、ダイアログを閉じると `window.close()` でタブが閉じるため再現しない
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-04-22-viewpoint-19-double-booking.md (回帰確認を追記)
- Related: F-20260422-20

### F-20261021-05
- Date: 2026-10-21
- Source: Bug
- Viewpoint: 25 更新と競合
- Fact: タブAの確認画面の読み込み中にタブBで送信すると、タブAはトップページに飛ばされ予約内容が失われる(3/3 再現)。取引IDを渡す Cookie がタブ間で共有されて後勝ちになるため。順番に操作した場合は両タブとも正常
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-10-21-viewpoint-25-two-tabs-reservation-lost.md
- Related: F-20261021-01, F-20261021-03, H-20261021-01, C-01

### F-20261021-06
- Date: 2026-10-21
- Source: Probe-Result
- Viewpoint: 13 切替えとデータ保持
- Fact: 確認画面 → 戻る → 進む と操作すると、Playwright の Chromium では確認画面が再実行され、トップページに飛ばされる。ただしこの環境では「戻る/進む」が bfcache から復元されていない(pageshow.persisted=false)。サイトは Cache-Control: max-age=600 で no-store ではないため、普段使いの Chrome/Safari では画面が bfcache から復元され、結果が変わる見込み
- Needs-Human: Yes — 普段使いのブラウザで「確認画面→戻る→進む」と「確認画面→戻る」(予約フォームの入力が残るか)を確かめてほしい(MT-20261021-02)。過去の「戻ると入力が消える」系のバグ(F-20260422-01/07, F-20260424-05)も同じく Playwright 環境だけで起きている可能性がある
- Bug Link: -
- Related: H-20261021-01, P-20261021-01, F-20260422-01, F-20260422-07, F-20260424-05

### F-20261021-07
- Date: 2026-10-21
- Source: Bug
- Viewpoint: 13 切替えとデータ保持 / 24 生成と一意性
- Fact: 確認画面の読み込みが中断された後に再送信すると、1回目の取引データ(氏名入り)が sessionStorage に残る。F-20261021-03 と同じ原因の別経路
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-10-21-viewpoint-24-orphan-transaction-on-double-click.md (別の再現経路として追記)
- Related: F-20261021-03, H-20261021-01, P-20261021-01

### F-20261021-08
- Date: 2026-10-21
- Source: Bug
- Viewpoint: 27 操作可能期間
- Fact: 受付期間の判定は「90日以内」(基準 2026-10-22 で 2027/01/20 可、01/21 不可)だが、注記とエラーは「3ヶ月以内」。ちょうど3ヶ月後の 2027/01/22 を入れると「3ヶ月以内の日付を入力してください。」で弾かれる。F-20260424-17(+91日可・+92日不可)とも食い違う
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-10-21-viewpoint-27-three-months-vs-90-days.md
- Related: F-20260424-17, H-20261021-02

### F-20261021-09
- Date: 2026-10-21
- Source: Observation
- Viewpoint: 27 操作可能期間
- Fact: 宿泊日の「翌日以降」は端末のタイムゾーンで判定される。ハワイ時間の端末(日本時間 10/22 10:00 = 現地 10/21 15:00)からは、日本では当日の 2026/10/22 を予約できる(初期値もその日になる)。日本の端末でフォームを開いたまま日付が変わった場合は、当日になった初期値が「翌日以降」のエラーで正しく弾かれる
- Evidence: reports/hotel-example-site-takeyaqa-dev/evidence/2026-10-21-v27-honolulu-same-day-accepted.png
- Needs-Human: Yes — 「翌日以降」の基準はホテルの所在地(日本時間)か、利用者の端末の日付か
- Bug Link: -
- Related: H-20261021-02

### F-20261021-10
- Date: 2026-10-21
- Source: Bug
- Viewpoint: 23 禁則(値)
- Fact: 実在しない宿泊日が別の日付に読み替えられて受け付けられる(3/3): 2026/11/31→12/1、2026/13/01→2027/1/1、2026/11/00→10/31。書式違い(99/99/99)は弾かれる(F-20260424-09)ので、すり抜けるのは「書式は正しいが実在しない日付」だけ
- Bug Link: reports/hotel-example-site-takeyaqa-dev/bugs/2026-10-21-viewpoint-23-nonexistent-date-rolled-over.md
- Related: H-20261021-02, P-20261021-02, F-20260424-09

### F-20261021-11
- Date: 2026-10-21
- Source: Observation
- Viewpoint: 02 / 06 / 09 / 23(回帰確認)
- Fact: 2026-04 の既知バグを改ざんなしの経路で回帰確認。**未修正**: 全角スペースだけの氏名が通る(F-20260422-09 / F-20260424-04)、氏名1000文字で 414 URI Too Long(F-20260422-13)、完了後の再予約(F-20260422-20、直接開いた場合のみ。F-20261021-04)。**修正済み**: 宿泊数0・人数0は「1以上の値を入力してください。」で弾かれる(F-20260422-04/05)、氏名未入力のエラーは日本語で欄のそばに出る(F-20260422-02)。戻る操作での入力消失系(F-20260422-01/07, F-20260424-05)は Playwright で bfcache が効かないため判定保留(MT-20261021-02)
- Bug Link: 各バグレポートに「回帰確認 (2026-10-21)」を追記
- Related: C-02, F-20261021-06

---

## Session 7 Hypotheses (2026-10-21)

### H-20261021-01
- Born from: F-20261021-01, F-20261021-03, F-20261021-05
- Statement: 確認画面への受け渡しが「Cookie 1本(タブ間共有)+ 読み込み時に即削除」の1回限り方式なので、送信と確認画面の表示が1対1にならない操作(リロード、連打、並行タブ、戻る/進む)では、予約データが失われるか、使われないまま残る
- Status: Confirmed
- Probes planned: P-20261021-01
- Notes: 原因領域(状態管理)が共通。P-20261021-01 で「読み込み中断→再送信」でもデータが残ることを確認(F-20261021-07)。「戻る→進む」の消失は Playwright 環境では起きるが、bfcache の差があるので実機確認待ち(F-20261021-06 / MT-20261021-02)

### P-20261021-01
- Verifies: H-20261021-01
- Target viewpoint: 13 切替えとデータ保持
- Plan:
  1. 確認画面 → ブラウザバック → ブラウザの「進む」で確認画面に戻ったとき、予約内容が表示されるか
  2. 送信直後、確認画面の表示前にブラウザバックしたとき、予約フォームの入力と取引データがどうなるか
- Status: Done
- Result: (1) Playwright ではトップへ飛ばされ予約内容が消える。ただし bfcache が効かない環境のため、実機確認待ち(F-20261021-06)。(2) は「確認画面の読み込みを中断→再送信」として実施。使われない取引データが残る(F-20261021-07)。いずれも仮説どおり → H-20261021-01 Confirmed

---

## Archived Summary

- F-20260422-04: 0泊が通る → S7回帰で修正済み(F-20261021-11) → archived
- F-20260422-05: 0人が通る → S7回帰で修正済み(F-20261021-11) → archived
- F-20260422-11: 料金計算の誤検出(H-20260422-03 Rejected) → archived
- H-20260424-01: バリデーションはクライアントのみ・サーバ側なし → Confirmed → archived
- P-20260424-01: confirm.html への GET 直打ちでは予約不成立 → Done → archived
- F-20260424-12: P-20260424-01 の結果 → archived
- H-20261021-02: 日付を Date のローカル演算任せ → Confirmed(バグ F-20261021-08/10 起票済み) → archived
- P-20261021-02: 実在しない日付の読み替えを確認 → Done → archived

---

## 運用ルール

- バグ検出時: bugs/ に起票した後、Finding として登録する
- バグ未満の気づきも Finding として記録する (Source: Observation)
- 2件以上の Finding が同じ匂いを放ったら Hypothesis を立てる
- Hypothesis を立てたら Probe を最低1つ計画し、coverage.md の該当観点を「再訪推奨」に更新する
- Probe 実施後は結果を追記し、Hypothesis のステータスを更新する (Confirmed/Rejected)
- セッション終了時、Open な Hypothesis と Planned な Probe の数を session-log.md に記録する
