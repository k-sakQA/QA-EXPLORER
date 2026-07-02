# ナレッジ蓄積ループ — 正準ルール

探索的テストの「気づき→仮説→次の一手」ループの唯一の正準定義。
qa-explorer / qa-runner / Claude Code コマンドはすべてこのファイルに従う。

## ファイル構成

`<target-slug>` は対象URLのホスト名から生成(小文字化・ピリオドをハイフンに変換)。
例: `hotel-example-site.takeyaqa.dev` → `hotel-example-site-takeyaqa-dev`

```
qa-knowledge/
  viewpoints.md                  # 23観点リスト(基本形・読み取り専用)
  targets/<target-slug>/
    findings.md                  # Finding / Hypothesis / Probe の蓄積(核)
    findings-archive.md          # クローズ済みエントリの退避先(肥大化対策)
    derived-viewpoints.md        # 対象固有の派生観点 (DV-YYYYMMDD-NN)
    test-cases.md                # Runner モード用テストケース
reports/<target-slug>/
  coverage.md                    # 観点消化状況
  session-log.md                 # セッション経緯
  bugs/YYYY-MM-DD-viewpoint-NN-<slug>.md
```

新規対象は `qa-knowledge/targets/_template/` と `reports/_template/` の中身を
それぞれ `<target-slug>/` フォルダへコピーして立ち上げる。

## セッション開始時 (必須)

1. `findings.md` を全件読む(archive は読まない。関連調査が必要なときだけ検索)
2. `coverage.md` で「再訪推奨」と「未着手」を把握
3. Open な Hypothesis / Planned な Probe を把握
4. `session-log.md` に `## Session YYYY-MM-DD (#N)` を追加し、狙う観点・Probe を記録
   (N は既存の最大 Session 番号 +1。session-log は末尾の直近セッションだけ読めばよい)

## 探索中 (必須)

- **バグ検出時** (同一イテレーション内で):
  1. `reports/<target-slug>/bugs/` に `_bug-report-template.md` 形式で起票
  2. `findings.md` に `F-YYYYMMDD-NN` を登録 (Source: Bug, Bug Link 記載)
  3. 既存 Hypothesis と関連があれば Related 欄で紐付け
- **バグ未満の気づき**も Finding として記録 (Source: Observation)。
  仕様かバグか人間の判断が必要なものには `Needs-Human: Yes` を付け、
  聞きたいことを1行の質問形式で書く (HTMLレポートの「人間に依頼」欄に転記される)
- **Hypothesis 生成**: 2件以上の Finding で以下のいずれかが共通したら
  `H-YYYYMMDD-NN` を登録 (Born from に根拠 Finding を列挙):
  - 原因領域 (状態管理 / バリデーション / フォーカス制御 / 表示 / 計算 等)
  - 影響を受けるユーザー操作 (ブラウザバック / リロード / タブ / キーボード 等)
  - 影響を受ける UI 要素の種類 (条件付き必須 / 動的表示 / 履歴系 等)

  同時に: 最低1つの Probe (`P-YYYYMMDD-NN`) を Planned で計画し、`coverage.md` の
  該当観点を「再訪推奨」に更新 (備考に Hypothesis ID)。優先度を変えたら
  coverage.md の「優先度変更履歴」に記録。
- **Probe 実施後**: Probe Status を Done に更新し、Hypothesis の Status を
  Confirmed / Rejected に更新

## セッション終了時 (必須)

1. `session-log.md` の Session End Checklist を全てチェック
2. `findings.md` 全エントリのステータスを最新化
3. `coverage.md` の状態欄を最新化
4. Session Summary に消化観点・検出バグ・新規 Finding/Hypothesis 数・
   Open Hypothesis / Planned Probe の残数を記録
5. 「次セッションへの申し送り」を 1-3 行で書く

## coverage.md の状態定義

`未着手` / `実施中` / `消化済み` (基本パスのみ実施) / `再訪推奨` (Hypothesis により
再テスト推奨。備考に引き金 ID) / `再消化済み` / `N/A`

「再訪推奨」→「再消化済み」にできるのは: 引き金 Hypothesis が Confirmed になり関連バグを
全て起票した、または Rejected になったとき。Hypothesis が Open のまま再訪した場合は
Probe の追加実施扱いとし「再訪推奨」を維持。

## 観点リストの扱い

- `viewpoints.md` は基本形。個別対象の都合で書き換えない
- 対象固有の観点は `derived-viewpoints.md` に `DV-YYYYMMDD-NN` として記録
- 複数対象で有効な派生観点は viewpoints.md への昇格を**ユーザーに提案**する
  (エージェント判断での自動昇格はしない)

## findings.md の肥大化対策 (トークン節約)

findings.md はセッション開始時に全件読むため、無制限に増やさない:

- セッション終了処理の際、findings.md が **約300行を超えていたら**、クローズ済み
  エントリ (Hypothesis: Confirmed/Rejected で関連バグ起票済み、Probe: Done、
  それらだけに紐づく Finding) を同フォルダの `findings-archive.md` へ移動する
- 移動時、findings.md 側に1行サマリー(`- H-YYYYMMDD-NN: <結論> → archived`)を
  「Archived Summary」セクションとして残す
- Open な Hypothesis / Planned な Probe / 未解決 Finding は絶対に移動しない
