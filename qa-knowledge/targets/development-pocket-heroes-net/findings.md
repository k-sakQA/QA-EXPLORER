# Findings

テスト対象: `https://development.pocket-heroes.net/home`
開始日: `2026-04-23`

このファイルは、探索的テストで得た「事実・仮説・次の一手」を3層で蓄積します。
セッション開始時に**必ず全件読む**ことで、前回の気づきを次のテストに活かします。

- **Finding (F-)**: テスト中に観察した事実。バグ、気づき、仮説検証の結果。
- **Hypothesis (H-)**: 複数のFindingから立てた、この対象の弱点・癖に関する仮説。
- **Probe (P-)**: 仮説を検証するための具体的なテスト計画。

ID形式: `F-YYYYMMDD-NN` / `H-YYYYMMDD-NN` / `P-YYYYMMDD-NN` (同日内の通し番号)

---

## Findings (事実)

### F-20260423-01: /others/nickname_edit への直接アクセスで /others にリダイレクトされる
- **Date**: 2026-04-23
- **Source**: Test (ph-nickname-investigate)
- **Viewpoint**: 10 (単機能), 11 (状態遷移)
- **Severity**: Low → **再現せず**
- **Status**: Closed (Probe P-20260423-01 で再現不可)
- **Description**: 初回テストでは `page.goto('/others/nickname_edit')` → `dismissAllDialogs` 後に URL が `/others` だったが、Probe P-20260423-01 で `dismissAllDialogs` なしで直接アクセスしたところ正常に 200 で表示された。原因は `dismissAllDialogs` の `dialog.close()` が React state を壊し、Next.js router が再初期化されて /others に戻った可能性。
- **Impact**: テスト固有の問題。実ユーザーへの影響なし。

### F-20260423-02: dialog.close() が /shop ページの React state を破壊する
- **Date**: 2026-04-23
- **Source**: Test (ph-viewpoint-10)
- **Viewpoint**: 10 (単機能)
- **Severity**: Low (テスト固有の問題)
- **Status**: Open
- **Description**: Playwright テストで `<dialog open="">` 要素を JS の `dialog.close()` で閉じると、/shop ページの `<body>` が完全に空になる。他のページ (Packs, Collection, Others) では発生しない。/shop ページの React コンポーネントツリーが dialog の状態変化に依存している可能性。
- **Impact**: テスト自動化では回避策が必要（dialog dismiss なしでコンテンツ確認）。ユーザー影響は不明（ブラウザでの手動操作では発生しない可能性あり）。

### F-20260423-03: プロモーションコード入力に maxLength 制限なし
- **Date**: 2026-04-23
- **Source**: Test (ph-p0p1-input-forms)
- **Viewpoint**: 23 (禁則), 03 (文字種)
- **Severity**: Low
- **Status**: Open
- **Description**: `input[name="code"]` の maxLength が -1（制限なし）。500文字の入力も受け付ける。サーバー側バリデーションで「半角英数字のみ」が効いているが、入力長制限はクライアント側にない。
- **Impact**: 極端に長い入力がサーバーに送信される可能性。DoS 的なリクエストの発生リスク。

### F-20260423-04: プロモーションコード - XSS/SQLi 文字列がフィールドに入力可能
- **Date**: 2026-04-23
- **Source**: Test (ph-p0p1-input-forms)
- **Viewpoint**: 03 (文字種), 23 (禁則)
- **Severity**: Info
- **Status**: Open
- **Description**: `<script>alert(1)</script>` や `' OR 1=1 --` がプロモーションコード入力フィールドに入力可能。ただし送信時に「半角英数字のみ」バリデーションが効いており、サーバーに不正文字列は送信されない（ボタンが有効化されても送信後にエラーメッセージ表示）。
- **Impact**: クライアント側の入力制限は緩いが、サーバー側バリデーションが効いている。安全側。

### F-20260423-05: プロモーションコード空入力時のUX が適切
- **Date**: 2026-04-23
- **Source**: Test (ph-p0p1-input-forms)
- **Viewpoint**: 02 (エラー表示)
- **Severity**: Info (正常動作)
- **Status**: Closed
- **Description**: 空入力時は「コードを送信する」ボタンが disabled になり、値を入力すると enabled になる。空入力のまま送信することは不可能。

### F-20260423-06: ブラウザバックでの状態保持が正常
- **Date**: 2026-04-23
- **Source**: Test (ph-p0p1-input-forms)
- **Viewpoint**: 11 (状態遷移)
- **Severity**: Info (正常動作)
- **Status**: Closed
- **Description**: パック一覧→詳細→戻る、ホーム→Shop→戻る の両方で、ブラウザバック後に元のページコンテンツが正常に復元される。

### F-20260423-07: Shop 価格表示が全て正の整数
- **Date**: 2026-04-23
- **Source**: Test (ph-p0p1-input-forms)
- **Viewpoint**: 23 (禁則)
- **Severity**: Info (正常動作)
- **Status**: Closed
- **Description**: Shop ページのバモス価格 (¥140, ¥700, ¥1,400, ¥2,800, ¥5,600, ¥14,000) は全て正の整数で、不正な値は含まれない。「おトク！」表記も各商品に付与されている。

### F-20260423-08: PWA ダイアログがページ操作をブロックする
- **Date**: 2026-04-23
- **Source**: Test (ph-viewpoint-10)
- **Viewpoint**: 10 (単機能)
- **Severity**: Medium
- **Status**: Open
- **Description**: サイト全体で `<dialog open="" class="ModalDialogBox_dialogBox__8_dsu">` 要素が表示され、PWA インストール訴求（「ホーム画面に追加してアプリのように楽しもう！」）がページ上のクリック操作をブロックする。ユーザーは手動で閉じる必要がある。ページ遷移の度に表示される。
- **Impact**: 自動テストでの操作がブロックされる。ユーザー体験としても毎回表示されるのはストレス。

### F-20260423-09: ニックネーム文字数制限は 24文字
- **Date**: 2026-04-23
- **Source**: Probe P-20260423-01
- **Viewpoint**: 04 (文字数正常値), 14 (初期値)
- **Severity**: Info
- **Status**: Closed
- **Description**: ニックネーム編集画面に「7/24」と表示。現在のニックネームが7文字で上限が24文字。「保存する」ボタンあり。

### F-20260423-10: 「本サービスはスマートフォン専用です」のPC向け警告
- **Date**: 2026-04-23
- **Source**: Probe P-20260423-01
- **Viewpoint**: 01 (レイアウト/文言)
- **Severity**: Info
- **Status**: Closed
- **Description**: 全ページ下部に「本サービスはスマートフォン専用です。パソコンでは一部機能をご利用いただけない場合があります」と表示される。Playwright はデスクトップ viewportなので毎回表示。

### F-20260423-11: 有償バモス=0, 無償バモス=500 (テストアカウント初期値)
- **Date**: 2026-04-23
- **Source**: Probe P-20260423-01
- **Viewpoint**: 14 (初期値)
- **Severity**: Info
- **Status**: Closed
- **Description**: 購入履歴ページで確認。有償バモス 0、無償バモス 500。「バモスを購入するとこちらに履歴が表示されます」。

---

## Hypotheses (仮説)

### H-20260423-01: dismissAllDialogs の dialog.close() が React/Next.js の状態を破壊する
- **Date**: 2026-04-23
- **Status**: Confirmed
- **Born from**: F-20260423-01, F-20260423-02
- **Description**: テストヘルパー `dismissAllDialogs` が JS で `dialog.close()` + `removeAttribute('open')` を実行すると、React が管理する `<dialog>` の状態と DOM の状態が不整合になり、一部ページ (/shop, /others/nickname_edit 等) で React ツリーが再マウントされ body が空になる。Probe P-20260423-01 で dismissAllDialogs を使わずに直接アクセスしたところ、全ページ正常に表示された。
- **Prediction**: ✓確認済み。dismissAllDialogs を呼ばなければ全ページ正常。
- **Action**: テストでは dialog dismiss 後にコンテンツ取得する際に注意が必要。操作が必要な場合は dismiss 必須だが、読み取りだけの場合は不要。

---

## Probes (検証計画)

### P-20260423-01: /others 配下の全サブページに直接アクセスしてリダイレクトを確認
- **Date**: 2026-04-23
- **Status**: Done
- **Hypothesis**: H-20260423-01
- **Method**: `/others/nickname_edit`, `/purchases`, `/payment_methods`, `/terms_and_policies`, `/promotion_code`, `/collection`, `/packs`, `/shop` に直接 `page.goto()` でアクセス (dismissAllDialogs なし)。
- **Result**: 全8ページが status 200 で正常に表示。リダイレクトなし。ニックネーム編集も「7/24」「保存する」が正常表示。→ H-20260423-01 を Confirmed: dialog.close() が原因。

---

## Session #2 Findings

### F-20260423-12: ニックネーム入力は `<textarea name="nickname">` で maxLength=-1
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-char-length)
- **Viewpoint**: 04 (文字数正常値), 06 (文字数異常値)
- **Severity**: Info (構造情報)
- **Status**: Closed
- **Description**: ニックネーム編集フィールドは `<textarea name="nickname">` で実装。maxLength 属性は -1（制限なし）。初期値「2233さかた」(7文字)。カウンター表示「7/24」あり。24文字超入力が可能だが、25文字以上では保存ボタンが disabled になるため JS 制御で制限。

### F-20260423-13: ニックネーム — 半角/全角スペース・タブのみで保存ボタンが有効
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-char-length)
- **Viewpoint**: 09 (未入力)
- **Severity**: Medium
- **Status**: Open
- **Description**: ニックネーム入力に半角スペース「   」、全角スペース「　　　」、タブ「\t\t」のみを入力した場合、カウンターがそれぞれ 3/24, 3/24, 2/24 と表示され、保存ボタンが enabled になる。空文字・改行のみの場合は disabled。trim() によるバリデーションが不足しており、スペースのみのニックネームが保存可能な可能性。
- **Impact**: ユーザーがスペースのみのニックネームを設定できた場合、他ユーザーから見て空白名に見える。

### F-20260423-14: プロモコード — 半角/全角スペースで送信ボタンが有効化
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-char-length)
- **Viewpoint**: 09 (未入力)
- **Severity**: Low
- **Status**: Open
- **Description**: プロモーションコード入力にスペースのみを入力すると送信ボタンが enabled になる。ただし送信後は「プロモーションコードには半角英数字のみを入力してください」とサーバー側バリデーションが効いている。
- **Impact**: フロントエンドの入力チェックが甘いが、サーバー側で防御されている。UX として不親切だが実害なし。

### F-20260423-15: ニックネーム maxLength 未設定 — 100文字以上入力可能
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-char-length)
- **Viewpoint**: 06 (文字数異常値)
- **Severity**: Low
- **Status**: Open
- **Description**: textarea の maxLength が -1 で HTML 属性による制限なし。50文字・100文字がそのまま入力される。ただし 25文字以上で保存ボタンが disabled になるため、JS 側の制御は動作している。カウンターも「25/24」と正直に超過表示。
- **Impact**: フロントエンド JS が動作していれば問題なし。JS を無効化した場合やDevTools操作での超過入力がサーバー側で弾かれるかは未検証。

### F-20260423-16: プロモコード — 5000文字入力可能、1000文字送信でもサーバーエラーなし
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-char-length)
- **Viewpoint**: 06 (文字数異常値)
- **Severity**: Info
- **Status**: Closed
- **Description**: プロモーションコード入力に5000文字の半角英字が入力可能（maxLength=-1）。1000文字を実際に送信したところ、サーバーエラーではなく「入力されたプロモーションコードが確認できません」の通常バリデーションメッセージが返された。サーバー側は長文入力に対して堅牢。

---

## Hypotheses (仮説)

### H-20260423-02: フロントエンドの trim() バリデーション不足 — スペースのみ入力が通過する
- **Date**: 2026-04-23
- **Status**: Partially Confirmed
- **Born from**: F-20260423-13, F-20260423-14
- **Description**: ニックネーム編集とプロモーションコードの両方で、スペース（半角・全角）のみの入力が「入力あり」として扱われ、操作ボタンが有効化される。入力値の `trim()` チェックがフロントエンドに実装されていない可能性。プロモコードはサーバー側で弾かれるが、ニックネームは保存ボタンが有効なため、実際にスペースのみで保存できる可能性がある。
- **Prediction**: ニックネームにスペースのみを入力して保存した場合、サーバー側でバリデーションが効いていなければ空白ニックネームが設定される。
- **Probe Result (P-02)**: サーバーが「不明なエラーが発生しました」で拒否。ニックネームは変更されず。フロントエンドの trim() 不足は事実だが、サーバー側で防御されている。ただしエラーメッセージが曖昧で UX 上の問題あり。
- **Action**: フロントエンド側で trim() チェックを追加し、スペースのみの場合は保存ボタンを disabled にすべき。エラーメッセージも「ニックネームには空白以外の文字を含めてください」等に改善推奨。

### P-20260423-02: ニックネームにスペースのみを入力して保存を試行
- **Date**: 2026-04-23
- **Status**: Done
- **Hypothesis**: H-20260423-02
- **Method**: ニックネーム編集画面で半角スペース3文字のみを入力し「保存する」を実際にクリック。保存成功/失敗、保存後のニックネーム表示を確認。元の値「2233さかた」に戻す復旧手順も含める。
- **Result**: サーバーが「不明なエラーが発生しました」で拒否。ニックネームは変更されず元の「2233さかた」のまま。復旧（再保存）も正常に成功し「変更が完了しました！」表示。
- **Conclusion**: フロントエンドは trim() チェックなしで保存ボタンが有効化されるが、サーバー側がスペースのみを拒否する。ただしエラーメッセージが「不明なエラー」と曖昧で、ユーザーが原因を理解できない UX 上の問題あり。→ H-20260423-02 を Partially Confirmed に更新。

### F-20260423-17: 375px モバイルビューポートでも「PC向け警告」が表示される
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-layout-initial)
- **Viewpoint**: 01 (レイアウト/文言)
- **Severity**: Info
- **Status**: Open
- **Description**: 375px ビューポートで全5画面(Home/Shop/Packs/Collection/Others)にアクセスしたところ、全画面で「本サービスはスマートフォン専用です。パソコンでは一部機能をご利用いただけない場合があります」のPC向け警告バナーが表示。水平はみ出しはなし。User-Agent ではなくビューポート幅で判定している模様だが、375px はモバイル相当でも表示される閾値設定に問題がある可能性。
- **Impact**: Playwright テスト(デフォルト1280px viewport)では常時表示。実機モバイルでの表示有無は未確認。

### F-20260423-18: 底ナビに aria-current 属性がない
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-layout-initial)
- **Viewpoint**: 01 (レイアウト/文言)
- **Severity**: Low
- **Status**: Open
- **Description**: 底ナビの全4タブ(ホーム/コレクション/パック/その他)で `aria-current` 属性が null。現在のページに対応する底ナビ項目にアクティブ状態を示す WAI-ARIA 属性が付与されていない。CSS クラス `NavItem_wrapper__PoE9L` は全タブ共通で、視覚的なアクティブ表現はクラスの変化で制御されている可能性があるが、スクリーンリーダーにはアクティブタブが伝わらない。
- **Impact**: アクセシビリティ上の問題。スクリーンリーダー利用者が現在のタブを把握できない。

### F-20260423-19: ニックネーム編集中のブラウザバックで未保存変更の警告なし
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-layout-initial)
- **Viewpoint**: 17 (キャンセル)
- **Severity**: Low
- **Status**: Open
- **Description**: ニックネーム編集画面で値を「テスト変更中」に変更後、ブラウザバックを実行したところ、`beforeunload` ダイアログが表示されず /others に遷移した。SPA(Next.js)のクライアントサイド遷移では `beforeunload` が発火しないため、独自の離脱警告実装が必要だが未実装。
- **Impact**: ユーザーが編集中に誤ってブラウザバックした場合、変更内容が失われる。

### F-20260423-20: プロモコード入力後 back → forward で入力値が消失
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-layout-initial)
- **Viewpoint**: 17 (キャンセル)
- **Severity**: Info
- **Status**: Closed
- **Description**: プロモーションコード入力画面で「TESTCODE123」を入力後、ブラウザバック → ブラウザフォワードで戻ると入力値が空になっている。SPA のクライアントサイド遷移では input state がリセットされるのは通常動作。離脱ダイアログも表示されず。
- **Impact**: SPA の想定動作。プロモコードはコピー&ペーストで再入力可能なため実害は最小限。

### F-20260423-21: Collection → Packs → Collection 戻りでカード総数表示が消える
- **Date**: 2026-04-23
- **Source**: Test (ph-s2-layout-initial)
- **Viewpoint**: 13 (切替えとデータ保持)
- **Severity**: Low
- **Status**: Open
- **Description**: 底ナビで Collection → Packs → Collection と遷移すると、初回表示時にあったカード総数「10」の表示が消え、カード画像リストも表示されなくなる。フィルタ(すべて/シリーズ)は表示されるがカードコンテンツが復元されない。SPA の状態管理でコレクションデータが再取得されない可能性。
- **Impact**: ユーザーがタブを行き来するとカード一覧が消失し、再度タップしないと復元されない。UX 上の不具合。

### F-20260423-22: スペースのみニックネーム保存時のエラーメッセージが曖昧
- **Date**: 2026-04-23
- **Source**: Probe P-20260423-02
- **Viewpoint**: 02 (エラー表示), 09 (未入力)
- **Severity**: Medium
- **Status**: Open
- **Description**: ニックネームに半角スペースのみ（3文字）を入力して保存すると、サーバーが拒否するが表示されるエラーメッセージは「不明なエラーが発生しました」。入力が不正であることを示す具体的なメッセージ（例:「ニックネームには空白以外の文字を含めてください」）ではなく、汎用エラーが表示される。フロントエンドの trim() チェックが不足しており、本来はボタンを disabled にすべきケースがサーバーまで到達している。
- **Impact**: ユーザーがスペースのみを入力して保存した際、何が悪いのか理解できない。「不明なエラー」は通信障害等と誤認される。
- **Related**: H-20260423-02 (Partially Confirmed), F-20260423-13

---

## 運用ルール

- バグ検出時: bugs/ に起票した後、Finding として登録する
- バグ未満の気づきも Finding として記録する (Source: Observation)
- 2件以上の Finding が同じ匂いを放ったら Hypothesis を立てる
- Hypothesis を立てたら Probe を最低1つ計画し、coverage.md の該当観点を「再訪推奨」に更新する
- Probe 実施後は結果を追記し、Hypothesis のステータスを更新する (Confirmed/Rejected)
- セッション終了時、Open な Hypothesis と Planned な Probe の数を session-log.md に記録する
