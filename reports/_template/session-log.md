# Session Log

Target: `<URL>`
Focus: `<テスト意図>`

セッションごとに追記します。新しいセッションは必ず **Session Start Checklist** から始めます。

---

## Session Start Checklist (セッション開始時に必ず実行)

- [ ] `qa-knowledge/targets/<target>/findings.md` を**全件**読む
- [ ] `coverage.md` の「再訪推奨」と未着手項目を確認
- [ ] Open 状態の Hypothesis を確認
- [ ] Planned 状態の Probe を確認
- [ ] 本セッションで狙う観点・Probe を決定し、下記 "Iteration" に記録

---

## Initial Snapshot (初回セッションのみ)

<!-- 対象の基本情報を記載。2回目以降のセッションでは不要

- Entry URL: `<URL>`
- 主要画面・フォーム: `<セレクタや名前>`
- 主な必須項目: `<list>`
- 条件付き項目: `<list>`
- 送信ボタン: `<selector>`
- 前提となるテストアカウント等: `<if any>`
-->

---

## Session YYYY-MM-DD (#N)

### 狙い
- 本セッションで消化予定の観点/Probe:

### Iteration 1

- 観点 / Probe:
- 対象:
- 理由:
- 狙うバグ:
- 結果:
- 新規 Finding:
- 新規 Hypothesis:

<!-- 必要なだけ Iteration を追加 -->

---

## Session End Checklist (セッション終了時に必ず実行)

- [ ] `findings.md` に本セッションの Finding/Hypothesis/Probe 結果を追記
- [ ] `coverage.md` の状態欄・優先度を更新
- [ ] `derived-viewpoints.md` に新しい派生観点があれば追記
- [ ] 本セッションの成果を下記 "Session Summary" に記録
- [ ] 次セッションへの申し送りを 1-3 行で書く

### Session Summary

- 消化した観点:
- 消化した Probe:
- 検出バグ:
- 新規 Finding 数:
- 新規 / 更新 Hypothesis:
- Open な Hypothesis 残数:
- Planned な Probe 残数:

### 次セッションへの申し送り
-
-
