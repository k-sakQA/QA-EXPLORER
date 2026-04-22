# Findings

テスト対象: `hotel-example-site (https://hotel-example-site.takeyaqa.dev/ja/plans.html)`
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
- Viewpoint: 02 表示(UI) - エラー表示(正常系)
- Fact: 必須項目未入力で送信すると、個別エラーは表示されるが、先頭の不正項目 `#date` にフォーカスが移動しない。キーボード利用時に修正箇所へ即座に移動できず、アクセシビリティに難あり。
- Bug Link: reports/hotel-example-site/bugs/2026-04-22-viewpoint-02-focus-on-first-invalid-field.md
- Related: F-20260422-02 (状態管理という共通テーマ)

### F-20260422-02
- Date: 2026-04-22
- Source: Bug
- Viewpoint: 10 動作確認 - 単機能
- Fact: `contact=email` + `email=qa@example.com` で確認画面へ進み、ブラウザバックすると、`contact` は `email` のままだが `#email` は空文字かつ `disabled` になり、選択状態と入力欄の状態が不整合。
- Bug Link: reports/hotel-example-site/bugs/2026-04-22-viewpoint-10-email-lost-after-back.md
- Related: F-20260422-01 (いずれもユーザー操作後の状態整合性が崩れる)

---

## Hypotheses (仮説)

### H-20260422-01
- Born from: F-20260422-01, F-20260422-02
- Statement: このフォームは「ユーザー操作後の状態整合性」を保つ設計が弱い可能性がある。特に (a) エラー発生時のフォーカス制御、(b) 画面遷移やブラウザ履歴を挟んだ条件付きUIの復元、の2方向で脆さが出やすい。
- Status: Open
- Probes planned: P-20260422-01, P-20260422-02
- Notes: F-20260422-01 はフォーカス制御、F-20260422-02 は条件付きUIの復元で、一見別観点だが「操作イベント後に UI 状態が期待どおり整合しない」という共通テーマ。観点11は単独では正常だったが、ブラウザバック・リロードを混ぜた経路では崩れている可能性が高い。

---

## Probes (検証計画)

### P-20260422-01
- Verifies: H-20260422-01
- Target viewpoint: 13 切替えとデータ保持 【再訪推奨】
- Plan:
  1. `contact=tel` で有効入力 → 確認画面 → ブラウザバック → `tel` 欄の値と有効化状態を確認
  2. `contact=email` で有効入力 → リロード → 復元ダイアログ有無と、復元された場合の状態を確認
  3. `contact=email` で有効入力 → 他ページへリンクで離脱 → 戻る → 状態を確認
  4. `contact=no` で確認画面へ → バック → `contact` と `email`/`tel` の disabled 状態を確認
- Status: Planned
- Result: (実施後に追記)

### P-20260422-02
- Verifies: H-20260422-01
- Target viewpoint: 02 表示(UI) 【再訪推奨 / アクセシビリティ切り口】
- Plan:
  1. エラー発生時の Tab キー押下順序を確認 (視覚順とキーボード順が一致するか)
  2. エラー表示されたフィールドに `aria-invalid="true"` が付与されているか
  3. エラーメッセージが `aria-describedby` 経由で該当入力と紐付いているか
  4. スクリーンリーダー(VoiceOver / NVDA)でエラーが読み上げられるか
- Status: Planned
- Result: (実施後に追記)

---

## 運用ルール

- バグ検出時: bugs/ に起票した後、Finding として登録する
- バグ未満の気づきも Finding として記録する (Source: Observation)
- 2件以上の Finding が同じ匂いを放ったら Hypothesis を立てる
- Hypothesis を立てたら Probe を最低1つ計画し、coverage.md の該当観点を「再訪推奨」に更新する
- Probe 実施後は結果を追記し、Hypothesis のステータスを更新する (Confirmed/Rejected)
- セッション終了時、Open な Hypothesis と Planned な Probe の数を session-log.md に記録する
