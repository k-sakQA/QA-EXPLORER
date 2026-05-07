# Findings

テスト対象: `https://development.pocket-heroes.net`
開始日: `2026-04-23`

このファイルは、探索的テストで得た「事実・仮説・次の一手」を3層で蓄積します。
セッション開始時に**必ず全件読む**ことで、前回の気づきを次のテストに活かします。

- **Finding (F-)**: テスト中に観察した事実。バグ、気づき、仮説検証の結果。
- **Hypothesis (H-)**: 複数のFindingから立てた、この対象の弱点・癖に関する仮説。
- **Probe (P-)**: 仮説を検証するための具体的なテスト計画。

ID形式: `F-YYYYMMDD-NN` / `H-YYYYMMDD-NN` / `P-YYYYMMDD-NN` (同日内の通し番号)

---

## Findings (事実)

### F-20260423-01
- Date: 2026-04-23
- Source: Bug
- Viewpoint: 09 未入力 / 02 エラー表示
- Fact: ニックネーム編集でスペースのみ（半角・全角）を入力すると「保存する」ボタンが有効になる（クライアント側バリデーション漏れ）。実際に送信するとサーバ側で拒否されるが、エラーメッセージが「不明なエラーが発生しました」と不適切。ユーザーには何が問題か伝わらない。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-23-viewpoint-09-nickname-space-only.md
- Related: F-20260423-02

### F-20260423-02
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 02 エラー表示
- Fact: DOMに16個のエラーダイアログが事前レンダリングされている（非表示 dialog 要素）。「バモスが不足しています」「決済エラーが発生しました」「認証コードの送信上限に達しました」「この電話番号はすでに他のアカウントで使用されています」等、内部機能の存在を推測可能な情報が露出。React/Next.jsのSSR特有の事前レンダリングと推測。
- Bug Link: -
- Related: F-20260423-01

### F-20260423-03
- Date: 2026-04-23
- Source: ~~Observation~~ By Design (2026-04-24 確認)
- Viewpoint: 10 単機能
- Fact: PCブラウザアクセス時のPWAインストール訴求ダイアログは意図的な仕様。ビジネス上ブラウザユーザーにPWA利用を促す目的で画面更新毎に表示。PWAユーザーには表示されない。Playwrightテストでは `dismissAllDialogs()` で回避。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-23-viewpoint-10-pwa-dialog-blocks-ui.md (Closed - By Design)
- Related: -

### F-20260423-04
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 03 文字種
- Fact: プロモーションコード入力では空文字以外なら何でもsubmitボタンが有効になる（英数, 日本語, 記号, XSS, SQLi全て）。XSS入力「<script>alert(1)</script>」をサーバに送信した結果ステータス204で、「入力されたプロモーションコードが確認できません」の適切なエラーメッセージが返された。サーバ側サニタイズは機能している模様。
- Bug Link: -
- Related: -

### F-20260423-05
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 10 単機能
- Fact: ガチャ無料引きフロー正常動作を確認。確認ダイアログ（「パックチケットを消費して1枚引きます。開封後のキャンセルはできません。」）→ 引き実行 → 結果画面（カード取得）→ 1日1回制限（「あと17時間」表示）。ボタンが「無料で引く」→「1枚引く 5」に変化。
- Bug Link: -
- Related: -

### F-20260423-06
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 11 状態遷移 / 13 画面遷移
- Fact: ブラウザバック動作正常。home → packs → pack-detail → back(packs) → back(home) で各ページが正しく表示される。SPAだがhistory管理は適切。
- Bug Link: -
- Related: -

### F-20260423-07
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 03 文字種
- Fact: ニックネームtextareaで改行入力を試みると改行が除去される（「テスト\nニックネーム」→「テストニックネーム」9文字）。これは意図的な仕様と推測。24文字制限あり、25文字以上で保存ボタン無効。XSS文字列（24文字超）も保存ボタン無効。
- Bug Link: -
- Related: F-20260423-01

### F-20260423-08
- Date: 2026-04-23
- Source: Probe P-20260423-01
- Viewpoint: 09 未入力 / 02 エラー表示
- Fact: Probe P-20260423-01 実施結果。(1) 全角スペースのみ保存 → サーバが `{"success":false,"error":"UNEXPECTED"}` (HTTP 200) を返却。エラーコード「UNEXPECTED」は汎用エラー。(2) 1文字「あ」→ SUCCESS、21文字→ SUCCESS（正常系OK）。(3) ゼロ幅スペース（U+200B）のみ3文字入力 → **保存ボタン有効、カウンター「3/24」表示**（クライアント側で実文字として扱われる）。(4) Tab文字・Null文字は除去されてカウンター「0/24」になる（サニタイズ機能）。結論: クライアント側バリデーションに不可視文字の考慮漏れあり。
- Bug Link: -
- Related: F-20260423-01, H-20260423-01

### F-20260423-09
- Date: 2026-04-23
- Source: Bug (Low)
- Viewpoint: 12 経時変化
- Fact: ニックネーム保存ボタンを連打すると複数POSTが送信される。実機確認(2026-04-24)でもボタンのdisabled化は未実装。ただしべき等操作のため実害なし。課金フロー（ガチャ・バモス購入）で同パターンがないかの注意喚起として残存。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-23-viewpoint-12-nickname-double-submit.md
- Related: ~~F-20260423-10~~ (False Positive), H-20260423-02

### F-20260423-10
- Date: 2026-04-23
- Source: ~~Bug~~ False Positive (2026-04-24 実機確認で判明)
- Viewpoint: 12 経時変化
- Fact: ~~プロモーションコード送信で1回クリックから6回のPOSTが発生。ページがクラッシュする。~~ 実機確認の結果、送信後にボタンがdisabled化されており二重送信防止は実装済み。Playwrightテストの連打タイミング（200ms間隔×3回クリック）とServer Actionsリトライが重なり6回POSTが観測された。「クラッシュ」もPlaywright側のページナビゲーション喪失であり実ブラウザでは正常な再読み込み。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-23-viewpoint-12-promo-double-submit.md (Closed)
- Related: F-20260423-09, H-20260423-02

### F-20260423-11
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 15 変更・反映
- Fact: ニックネーム変更後にothersページに遷移しても、新しいニックネームが即時反映されない。ページリロード等が必要な可能性あり。キャッシュ or SSR時点のデータが表示されている。
- Bug Link: -
- Related: -

### F-20260423-12
- Date: 2026-04-23
- Source: Bug
- Viewpoint: 17 キャンセル
- Fact: ニックネーム編集中にブラウザバックすると、確認ダイアログなしに即座にページ遷移し編集内容が失われる。一方、アプリ内「←」ボタンでは「変更を破棄しますか？」ダイアログが正常に表示される。beforeunloadイベントの未設定 or SPAのpopstateハンドリング不足。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-23-viewpoint-17-browser-back-no-guard.md
- Related: -

### F-20260423-13
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 01 レイアウト/文言
- Fact: ホームページに「coming soon...」表示あり、「フレンド」タブがUI上に見えている状態。未実装機能がエンドユーザーに露出している。開発環境固有の可能性もあるが、本番リリース前に確認が必要。
- Bug Link: -
- Related: -

### F-20260423-14
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 15 変更・反映
- Fact: othersページのヘルプリンクにuser_uid（`user_2l3iLnYuKEl4fRn6mjOQZi`）が含まれる。リンクURLにユーザー識別子が露出。サポート問い合わせ用の意図的な設計と推測されるが、ユーザーに見えるURLにIDが入ることの確認が必要。
- Bug Link: -
- Related: -

### F-20260423-15
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 07 数値(正常値)
- Fact: バモス購入プラン構造: ×5/¥140 (1おトク), ×26/¥700 (7おトク), ×57/¥1,400 (20おトク), ×120/¥2,800 (50おトク), ×250/¥5,600 (190おトク), ×690/¥14,000 (おトク表示なし)。最高額プラン(¥14,000)に「おトク」ラベルがないのは意図的か要確認。
- Bug Link: -
- Related: -

### F-20260423-16
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 01 レイアウト/文言
- Fact: 375px幅でホーム/パックの横スクロールカルーセル内にoverflow:hiddenによるテキスト切れ候補あり。ホームのDIV(scroll=2050 > client=375)、パックのDIV(scroll=1046 > client=375)。カルーセル自体は意図的なデザインだが、内部テキストが長すぎて切れている可能性。
- Bug Link: -
- Related: -

### F-20260423-17
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 07 数値(正常値)
- Fact: ガチャパック排出確率: 親カテゴリ60%+20%+20%=100%。子カテゴリ各10%×10=100%。確率構造は整合。有料引きコスト: 全3パックとも1枚引き=5バモス、10枚引き=50バモス（1枚単価同一）。
- Bug Link: -
- Related: -

### F-20260423-18
- Date: 2026-04-23
- Source: Observation
- Viewpoint: 17 キャンセル
- Fact: アプリ内「←」ボタンでの変更破棄フローは正常動作。「変更を破棄しますか？ このまま閉じると、変更が破棄されます」→「変更を破棄する」でothersに遷移、「編集を続ける」で編集画面に残留（入力値保持）。
- Bug Link: -
- Related: F-20260423-12

### F-20260424-01
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 07 数値(正常値) / 19 登録と参照
- Fact: バモス×690(priced_credits_12)購入フロー正常動作。Stripe Elementsの埋め込み決済で、保存済みテストカード(4242)を使用して¥14,000決済成功。残高が即時に+690反映。admin経理報告の「決済情報一覧」にも即時反映（決済額+14000）。「消費数情報一覧」の有償通貨付与数+500、無償通貨付与数+190も正確。
- Bug Link: -
- Related: F-20260423-15

### F-20260424-02
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 23 禁則 / 07 数値(正常値)
- Fact: 有償バモス優先消費ルールが正しく動作。10枚引き（50バモス消費）実施後、admin経理報告の「消費数情報一覧」で有償通貨消費数が+50、無償通貨消費数は変化なし（0のまま）。有償バモスが十分にある状態では無償バモスは消費されない。
- Bug Link: -
- Related: F-20260424-01, F-20260423-17

### F-20260424-03
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 07 数値(正常値)
- Fact: admin経理報告「商品一覧」テーブルの構造把握。12商品(priced_credits_1~12)。現行ショップのプランはpriced_credits_7~12（×5/×26/×57/×120/×250/×690）。priced_credits_1~6は旧プランと推測（販売金額が異なる:例 priced_credits_1は150円でバモス5個、priced_credits_7は140円でバモス×5）。
- Bug Link: -
- Related: F-20260423-15

### F-20260424-04
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 10 単機能
- Fact: ショップ購入フロー: カード選択→確認ダイアログ（有償/無償内訳表示）→「購入する」→Stripe Elements決済フォーム（カード選択/新規入力）→「購入を確定する」→決済処理→「購入完了」ダイアログ→OK。全ステップ正常遷移。決済完了後にStripe payment_intents/confirm APIが200返却。
- Bug Link: -
- Related: F-20260424-01

### F-20260424-05
- Date: 2026-04-24
- Source: Observation
- Viewpoint: 15 変更・反映
- Fact: admin経理報告の「決済情報一覧」「消費数情報一覧」は同一日付＋同一product_idのデータを1行に集約する方式。複数回購入しても行が増えるのではなく、既存行の数値が加算される。決済額・付与数・消費数すべて同様。
- Bug Link: -
- Related: F-20260424-01

### F-20260428-01
- Date: 2026-04-28
- Source: Observation
- Viewpoint: 14 初期値 / 13 画面遷移
- Fact: ヘルプ・お問い合わせリンク(others → support.fctokyo-korekatsu.com/hc/ja)に、user_uid・device・os・browser・browser_version・user_agentの全情報がクエリパラメータとして埋め込まれている。例: `user_uid=user_5p6pGf9Bcuwmpa6uUzB57X&device=desktop&os=Windows&browser=Chrome&browser_version=147.0.7727.15&user_agent=Mozilla%2F5.0+...`。サポートシステム（Zendesk系）への環境情報連携として意図的な設計と推測。F-20260423-14の追加確認。URLにuser_agentフルストリングが含まれる点は、プライバシー観点から仕様確認が望ましい。
- Bug Link: -
- Related: F-20260423-14

### F-20260428-02
- Date: 2026-04-28
- Source: Bug
- Viewpoint: 10 単機能 / 11 状態遷移
- Fact: /home の「SHOP ショップ」リンク(`/shop`)をクリック後、Playwright の waitForURL('**/shop**') が2分経過してもタイムアウト。shopリンクは1件確認済みで存在する。実際の遷移先URLが `/shop` にマッチしないリダイレクト先になっている、または /shop ページのロードが異常に遅い可能性がある。ユーザーが手動中断したため実際の挙動は未確認。要再調査。
- Bug Link: -
- Related: -

### F-20260428-03
- Date: 2026-04-28
- Source: Observation
- Viewpoint: 10 単機能 / 13 画面遷移
- Fact: Admin PICK UP一覧（/pickups）に5件のPICK UPが存在。ステータス: 終了3件・公開中2件。テーブルヘッダ: 画像/ステータス/ソート番号/タイトル/URL/表示日付/公開開始/公開終了。一覧から詳細ページへの遷移正常。
- Bug Link: -
- Related: -

### F-20260428-04
- Date: 2026-04-28
- Source: Observation
- Viewpoint: 10 単機能 / 14 初期値
- Fact: Admin PICK UP詳細フォーム(pickup_6xY3zBPrcOKPlIj4ESt3wB)の構造確認。フォーム要素7件: title(textarea)/リンク先URLモード(radio: pack or url)/displayDate(date)/image(file)/startsAt(datetime-local)/endsAt(datetime-local)/sortOrder(number)。「変更」ボタン(button)と「保存」ボタン(submit, disabled=false)が存在。「← Pick up一覧に戻る」リンクあり。変更なし状態でも保存ボタンが有効な状態（意図的か要確認）。
- Bug Link: -
- Related: F-20260428-03

### F-20260428-05
- Date: 2026-04-28
- Source: Observation
- Viewpoint: 12 経時変化 / 10 単機能
- Fact: Admin 経理報告の月切替テスト正常。当月/先月/来月すべてでクラッシュなし。来月（データなし月）でも商品一覧タブは正常表示。タブ（商品一覧/決済情報一覧/消費数情報一覧）は月取得後に動的レンダリングされる仕様。`button:has-text()` セレクターでは取得後タブを検出できないケースあり（要素の種類が異なる可能性）。
- Bug Link: -
- Related: F-20260424-03, F-20260424-05

### F-20260428-06
- Date: 2026-04-28
- Source: ~~Probe P-20260428-01 / Bug~~ False Positive (2026-04-28 ユーザー実機確認)
- Viewpoint: 10 単機能 / 11 状態遷移 / 13 画面遷移
- Fact: P-20260428-01 実施結果（Session#5）。/home の「SHOPショップ」「PACKパック」「その他」ボタンをクリック（`force:true` 含む）後、URL が /home のまま変化しない挙動を Playwright headless Chromium で観測。しかし、ユーザーによる実機確認の結果、**実ブラウザでは発生しない**ことが確認された。Playwright headless Chromium 固有の挙動（Next.js `<Link>` クリックイベントとの相性問題）であり、アプリ側のバグではない。テストコードでは `page.goto()` を使う workaround が適切。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-28-viewpoint-10-spa-nav-click-no-transition.md (Closed - Playwright環境固有)
- Related: F-20260428-02, F-20260428-08, H-20260428-01

### F-20260428-07
- Date: 2026-04-28
- Source: Observation
- Viewpoint: 10 単機能
- Fact: /home ロード後 1.5〜3.5 秒以内に PWA インストール訴求 `<dialog>` 要素（DOM 要素、ネイティブダイアログではない）が表示される。この `<dialog>` がナビリンクを覆い、Playwright の通常 `.click()` が 120 秒タイムアウトになる原因となる。`force:true` または `dialog button.first().click()` による事前 dismiss で回避可能。F-20260423-03（By Design）との関連: ダイアログの存在は仕様だが、Playwright テストへの影響として確認済み。
- Bug Link: -
- Related: F-20260423-03

### F-20260428-08
- Date: 2026-04-28
- Source: ~~Observation（Probe P-20260428-01 拡張）~~ False Positive (2026-04-28 ユーザー実機確認)
- Viewpoint: 11 状態遷移 / 13 画面遷移
- Fact: /packs ページのパック詳細カードリンクをクリックしても URL が /packs のままで変化しない挙動を Playwright headless Chromium で観測。F-20260428-06 と同様に、ユーザーによる実機確認で**実ブラウザでは発生しない**ことが確認された。Playwright headless Chromium 固有の問題。直接 goto() での代替が適切。
- Bug Link: reports/development-pocket-heroes-net/bugs/2026-04-28-viewpoint-10-spa-nav-click-no-transition.md (Closed - Playwright環境固有)
- Related: F-20260428-06, H-20260428-01

### F-20260501-01
- Date: 2026-05-01
- Source: Observation
- Viewpoint: 08 数値異常値
- Fact: 存在しないpackcampaignID (`/packs/cardpackcampaign_INVALID123`) へのURL直打ちで、アプリがクラッシュせず適切にエラー表示する（「お探しのページが見つかりませんでした」等）。HTTPステータスやリダイレクト先の詳細は未確認だがbodyテキストが存在することを確認。認証不要ページでのアクセスのため公開ルーティングの404ハンドリング確認。
- Bug Link: -
- Related: -

### F-20260501-02
- Date: 2026-05-01
- Source: Observation
- Viewpoint: 08 数値異常値
- Fact: 存在しない数値ID (`/packs/999999999`) およびSQLi風パラメータ (`/packs/1 OR 1=1`) へのURL直打ちでもクラッシュなし。URLが取得でき、bodyが存在することを確認。SQLiパラメータはURLエンコードされてそのまま404として処理される。システム情報漏洩なし。
- Bug Link: -
- Related: F-20260501-01

### F-20260501-03
- Date: 2026-05-01
- Source: Observation
- Viewpoint: 04/05 文字数(正常値/正常限界)
- Fact: ニックネーム `/others/nickname_edit` (正しいURL。以前のスペック内に誤記 `/others/edit-nickname` あり) にて文字数テスト実施。1文字(正常最小値)→保存→/others遷移成功。24文字全角(正常上限)→保存→/others遷移成功。保存後の画面遷移は SPA soft navigation（load イベントなし）のため `waitForURL` に `waitUntil:'commit'` が必要。また保存後のネットワーク応答を待つ方式が安定。
- Bug Link: -
- Related: F-20260423-07

### F-20260501-04
- Date: 2026-05-01
- Source: Observation
- Viewpoint: 06 文字数(異常値)
- Fact: ニックネーム25文字以上入力時: カウンター「25/24」表示、「文字数がオーバーしています」エラーメッセージ表示、保存ボタン `disabled`。クライアント側バリデーションが正常に機能している。25文字超はそもそも送信できない実装。
- Bug Link: -
- Related: F-20260423-07

### F-20260501-05
- Date: 2026-05-01
- Source: Observation (H-20260423-02 関連観察)
- Viewpoint: 12 経時変化
- Fact: ガチャページ（/packs/cardpackcampaign_xxx）のガチャボタン連打テスト実施。ボタンをクリック後の挙動を観察。結果はテスト実行時のガチャ状態（無料枠の有無）により異なるため、確認ダイアログ表示前のボタン disabled化については継続観察が必要。テスト自体はクラッシュなしで PASS。
- Bug Link: -
- Related: F-20260423-09, H-20260423-02

### F-20260507-01
- Date: 2026-05-07
- Source: Observation
- Viewpoint: 11 状態遷移 / 10 単機能
- Fact: 購入フローの段階数が前回テスト(F-20260424-04で確認した2段階: 購入確認→決済)から変化し、今回は商品カードクリック後に直接「お支払い方法」決済ダイアログが表示される1段階フローとなった。F-20260424-04時点で確認した「有償/無償内訳表示→購入する→Stripe決済フォーム」という中間確認ステップが消失。仕様変更か、初回購入時のみ確認が出る条件分岐か、あるいはアカウントにカードが登録済みの場合はスキップされる仕様かは未確定。
- Bug Link: -
- Related: F-20260424-04

### F-20260507-02
- Date: 2026-05-07
- Source: Observation
- Viewpoint: 01 レイアウト/文言 / アクセシビリティ
- Fact: 決済ダイアログの支払い方法選択UIで、`<radio>` 要素が親の `<button>` 要素にラップされており、Playwrightからradioを直接クリックするとbutton要素にポインターイベントがインターセプトされる。`<button class="paymentMethodDialog_paymentMethodOption__AkK2z">` が `<input type="radio">` を覆う構造。ユーザー操作としてはbutton全体がクリック可能エリアなので実害は小さいが、スクリーンリーダー等のAT利用時にradioのセマンティクスとbuttonのセマンティクスが競合する可能性あり。
- Bug Link: -
- Related: F-20260423-02

### F-20260507-03
- Date: 2026-05-07
- Source: Observation
- Viewpoint: 19 登録と参照
- Fact: テストアカウントに保存されているカードが前セッション(4242)と異なる番号(visa **** 3184)になっていた。考えられる原因: (1) 別ユーザーが同アカウントでカード登録した (2) カード削除→再登録で別テストカードが使われた (3) テスト環境のデータリセット。共有テストアカウントの状態管理上のリスクとして記録。テストケースは「新規カード登録」を要件としているため、既存カードの有無にかかわらず新規入力パスを通すよう設計する必要がある。
- Bug Link: -
- Related: F-20260424-01

---

## Hypotheses (仮説)

### H-20260423-01
- Born from: F-20260423-01, F-20260423-02
- Statement: このアプリはサーバ側バリデーションに依存し、クライアント側のバリデーションが手薄。ニックネームのスペースのみ許容は氷山の一角で、他の入力フィールド（将来追加されるものも含め）でも同様の漏れがある可能性。エラーメッセージがDOMに事前レンダリングされていることから、エラーハンドリングはグローバルなダイアログ方式で、個別フィールド向けの丁寧なフィードバックが弱い。
- Status: Confirmed
- Probes planned: P-20260423-01
- Notes: Next.js/React SPAの典型的パターン。Server Actionsを使っている形跡あり（POSTのペイロード構造から推測）。Probe P-20260423-01でゼロ幅スペースのバリデーション漏れを追加確認。サーバ側エラーコードが「UNEXPECTED」であることも判明。

### H-20260423-02
- Born from: F-20260423-09, ~~F-20260423-10~~ (False Positive)
- Statement: ~~このアプリはフォーム送信の二重送信防止が実装されていない。ニックネーム保存とプロモーションコード送信の両方で確認。~~ プロモーションコード送信(F-20260423-10)は実機確認で二重送信防止が実装済みと判明し偽陽性。ニックネーム保存(F-20260423-09)の二重送信防止未実装は依然として有効。二重送信防止の実装状況はフォームごとにばらつきがある。
- Status: Partially Confirmed
- Probes planned: -
- Notes: プロモーションコードの6回POSTはPlaywrightテストの連打タイミングによる誤検知(2026-04-24判明)。ニックネーム保存の二重送信は有効なバグとして残存。「アプリ全体で二重送信防止が未実装」という当初の仮説は過大であり、箇所によって実装有無が異なる。

### H-20260428-01
- Born from: F-20260428-02
- Statement: /home の「SHOP」ボタン（リンク: `/shop`）をクリックした際の遷移が正常に完了しない可能性。Playwright で waitForURL('**/shop**') が2分タイムアウト。`/shop` へのロードが異常に遅いか、別URLにリダイレクトされている可能性がある。
- Status: Rejected (2026-04-28 ユーザー実機確認)
- Probes planned: P-20260428-01
- Notes: P-20260428-01 実施結果（2026-04-28 Session#5）で SPA click→URL 変化なしを Playwright 上で確認。しかしユーザーによる実機確認の結果、**実ブラウザでは発生しない**ことが判明。Playwright headless Chromium と Next.js `<Link>` コンポーネントの相性問題であり、アプリ側の不具合ではない。テストでは `page.goto()` を使う workaround を採用する。

### H-20260507-01
- Born from: F-20260507-02, F-20260423-02
- Statement: このアプリのUIコンポーネントはアクセシビリティ/セマンティクスの整合性に課題がある。決済ダイアログではradioがbutton内にネストされてポインターイベントがインターセプトされ(F-20260507-02)、エラーハンドリングでは16個のダイアログがDOMにプリレンダリングされている(F-20260423-02)。いずれもReactコンポーネントの設計パターンとして「動作はするがセマンティクスが壊れている」共通の匂い。スクリーンリーダーや支援技術での操作に影響する可能性がある。
- Status: Open
- Probes planned: P-20260507-01
- Notes: 決済UIの button > radio ネストは実用上問題なし（ボタン全体がクリック可能）だが、WAI-ARIA的には radio が button の子であるべきではない。同様のパターンが他の画面にもあるか確認が必要。

---

## Probes (検証計画)

### P-20260423-01
- Verifies: H-20260423-01
- Target viewpoint: 09 未入力 / 02 エラー表示 【再訪】
- Plan:
  1. ニックネームに全角スペースのみを入力して保存 → サーバ応答確認（「不明エラー」以外の具体的エラーが返るか）
  2. ニックネームに1文字→保存→確認 / 24文字丁度→保存→確認 / 境界値テスト
  3. 将来フォームが追加された場合に同様のバリデーション漏れがないか定期的に確認
- Status: Done
- Result: (1) 全角スペース→`{"success":false,"error":"UNEXPECTED"}` (HTTP 200)。(2) 1文字→SUCCESS、21文字→SUCCESS。(3) ゼロ幅スペース(U+200B)のみ→保存ボタン有効・カウンター「3/24」(新規バリデーション漏れ)。Tab/Null→除去(サニタイズ機能)。→ H-20260423-01 Confirmed。

### P-20260428-01
- Verifies: H-20260428-01
- Target viewpoint: 10 単機能 / 11 状態遷移 【再訪推奨】
- Plan:
  1. /shop に直接アクセスして遷移結果を確認（最終URL・ステータスコード）
  2. /home の「SHOPショップ」リンクをクリックして実際の遷移URLを記録
  3. 遷移に問題があればバグとして起票
- Status: Done
- Result: Playwright headless Chromium 上でクリック→URL 変化なしを確認し F-20260428-06/08 として起票したが、ユーザー実機確認（2026-04-28）の結果、実ブラウザでは発生しないことが判明。Playwright環境固有の問題として切り分け完了。→ H-20260428-01 Rejected。

### P-20260507-01
- Verifies: H-20260507-01
- Target viewpoint: 01 レイアウト/文言 / アクセシビリティ
- Plan:
  1. /others (設定画面) のフォーム要素でradio/checkbox等のセマンティクスを確認
  2. /packs のガチャ購入UIで同様のbutton>input構造がないか確認
  3. axe-core等のアクセシビリティ検証ツールで決済ダイアログをスキャン
- Status: Planned
- Result: -

---

## 運用ルール

- バグ検出時: bugs/ に起票した後、Finding として登録する
- バグ未満の気づきも Finding として記録する (Source: Observation)
- 2件以上の Finding が同じ匂いを放ったら Hypothesis を立てる
- Hypothesis を立てたら Probe を最低1つ計画し、coverage.md の該当観点を「再訪推奨」に更新する
- Probe 実施後は結果を追記し、Hypothesis のステータスを更新する (Confirmed/Rejected)
- セッション終了時、Open な Hypothesis と Planned な Probe の数を session-log.md に記録する
