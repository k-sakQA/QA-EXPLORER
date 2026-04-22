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

### F-20260422-11
- Date: 2026-04-22
- Source: Hypothesis-Rejected
- Viewpoint: 15 変更・反映
- Fact: 料金計算は仕様通り。「お一人様1泊7,000円」は人数×7,000円の意味。テスト時に人数変更後の料金更新を待っていなかったため誤検出。2名1泊朝食付きで16,000円は正しい(14,000+2,000)。
- Bug Link: - (削除)
- Related: H-20260422-03 (Rejected)

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

## Hypotheses (仮説)

### H-20260422-01
- Born from: F-20260422-02, F-20260422-03
- Statement: このサイトはブラウザネイティブのHTML5バリデーションに依存しており、カスタムバリデーション実装が不十分。そのため、メッセージのローカライズ、フォーカス制御、エラー後の状態復元に問題がある。
- Status: Confirmed
- Probes planned: P-20260422-01 (Done)
- Notes: P-20260422-01で確認。メールアドレスだけでなく、宿泊日・宿泊数・人数もブラウザバックで初期値に戻る。チェックボックスと氏名は保持される。フィールドタイプによる差異あり。

### H-20260422-02
- Born from: F-20260422-04, F-20260422-05, F-20260422-06
- Statement: 数値入力フィールド(宿泊数・人数)にmin/max属性が設定されておらず、HTML5バリデーションでの下限チェックが機能していない。JSでの上限チェックは部分的に実装されているが、0や負数の下限チェックが漏れている。
- Status: Confirmed
- Probes planned: -
- Notes: 負数は弾かれるが0は通る。min="1"の設定漏れ

### H-20260422-03
- Born from: F-20260422-11
- Statement: 追加プラン料金の計算ロジックに誤りがある。「お一人様1,000円」と表示されているが、実際の加算額が人数に比例していない。何らかの固定値または誤った係数が掛けられている可能性。
- Status: Rejected
- Probes planned: P-20260422-02 (Done)
- Notes: 検証の結果、料金計算は正しい。「お一人様1泊7,000円」は部屋代が人数×7,000円の意味。テストでの金額取得タイミングが早すぎて誤検出していた。

### H-20260422-04
- Born from: F-20260422-13, F-20260422-14, F-20260422-15
- Statement: テキスト入力フィールドの文字数上限チェックが不十分。フロントエンドのmaxlengthに依存しており、サーバー側での文字数バリデーションがない。また、氏名欄やメールアドレス欄はmaxlength自体が未設定。フォームデータがGETパラメータで送信されるため、長大な入力によるURL長超過エラーが発生する。
- Status: Confirmed
- Probes planned: -
- Notes: 氏名1000文字でURI Too Longエラー発生を確認。500文字は通過。コメント欄のmaxlength=140はDevToolsで削除可能でサーバー側チェックなし。

---

## Probes (検証計画)

### P-20260422-01
- Verifies: H-20260422-01
- Target viewpoint: 02 エラー表示【再訪】+ 13 切替えとデータ保持
- Plan:
  1. 連絡方法を「電話番号」に変更した場合も、ブラウザバックで電話番号が消失するか確認
  2. 条件付き必須(email/tel)のrequired属性がJS動的に変更されているか調査
  3. 他の条件付き表示フィールドでも同様の問題があるか確認
- Status: Done
- Result: Confirmed。宿泊日・宿泊数・人数もブラウザバックで初期値に戻る。チェックボックスは保持される。条件付き必須のrequired属性は動的に変更されることを確認。

### P-20260422-02
- Verifies: H-20260422-03
- Target viewpoint: 15 変更・反映【再訪】
- Plan:
  1. 宿泊数を変えて朝食オプション追加時の料金変化を確認
  2. 他のオプション(昼からチェックイン、観光プラン)でも同様の計算ミスがあるか確認
  3. 1名での追加プラン料金が正しいか確認(1名なら+1,000円か?)
- Status: Done
- Result: Rejected。ブラウザで手動確認した結果、料金計算は正しい。部屋代は人数×7,000円、追加プランは人数×1,000円。Playwrightテストでは金額更新のタイミング待ちが不十分だった。

---

## 運用ルール

- バグ検出時: bugs/ に起票した後、Finding として登録する
- バグ未満の気づきも Finding として記録する (Source: Observation)
- 2件以上の Finding が同じ匂いを放ったら Hypothesis を立てる
- Hypothesis を立てたら Probe を最低1つ計画し、coverage.md の該当観点を「再訪推奨」に更新する
- Probe 実施後は結果を追記し、Hypothesis のステータスを更新する (Confirmed/Rejected)
- セッション終了時、Open な Hypothesis と Planned な Probe の数を session-log.md に記録する
