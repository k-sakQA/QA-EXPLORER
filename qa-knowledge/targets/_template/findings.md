# Findings

テスト対象: `<対象名>`
開始日: `YYYY-MM-DD`

このファイルは、探索的テストで得た「事実・仮説・次の一手」を3層で蓄積します。
セッション開始時に**必ず全件読む**ことで、前回の気づきを次のテストに活かします。

- **Finding (F-)**: テスト中に観察した事実。バグ、気づき、仮説検証の結果。
- **Hypothesis (H-)**: 複数のFindingから立てた、この対象の弱点・癖に関する仮説。
- **Probe (P-)**: 仮説を検証するための具体的なテスト計画。

ID形式: `F-YYYYMMDD-NN` / `H-YYYYMMDD-NN` / `P-YYYYMMDD-NN` (同日内の通し番号)

---

## Findings (事実)

<!-- ここに F-YYYYMMDD-NN を追記していく

### F-YYYYMMDD-NN
- Date: YYYY-MM-DD
- Source: Bug / Observation / Hypothesis-Confirmed / Hypothesis-Rejected
- Viewpoint: NN 観点名 (または DV-YYYYMMDD-NN)
- Fact: (観察した事実を1-2行で)
- Bug Link: (バグの場合は reports/<target>/bugs/ のパス)
- Related: (関連する Finding / Hypothesis ID)

-->

---

## Hypotheses (仮説)

<!-- ここに H-YYYYMMDD-NN を追記していく

### H-YYYYMMDD-NN
- Born from: F-YYYYMMDD-NN, F-YYYYMMDD-NN
- Statement: (対象の弱点・癖に関する仮説を1-3行で)
- Status: Open / Probing / Confirmed / Rejected
- Probes planned: P-YYYYMMDD-NN
- Notes: (仮説の根拠や着眼点)

-->

---

## Probes (検証計画)

<!-- ここに P-YYYYMMDD-NN を追記していく

### P-YYYYMMDD-NN
- Verifies: H-YYYYMMDD-NN
- Target viewpoint: NN 観点名 (または DV-YYYYMMDD-NN) 【再訪 or 新規】
- Plan:
  1. (具体的な手順)
  2.
  3.
- Status: Planned / Running / Done
- Result: (実施後に追記。Confirmed / Rejected / Inconclusive)

-->

---

## 運用ルール

- バグ検出時: bugs/ に起票した後、Finding として登録する
- バグ未満の気づきも Finding として記録する (Source: Observation)
- 2件以上の Finding が同じ匂いを放ったら Hypothesis を立てる
- Hypothesis を立てたら Probe を最低1つ計画し、coverage.md の該当観点を「再訪推奨」に更新する
- Probe 実施後は結果を追記し、Hypothesis のステータスを更新する (Confirmed/Rejected)
- セッション終了時、Open な Hypothesis と Planned な Probe の数を session-log.md に記録する
