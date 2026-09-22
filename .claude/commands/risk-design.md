---
description: 承認済みリスク一覧から、観点リスト形式のテストチャーターを設計する。人間レビュー待ちで停止する
argument-hint: url=<対象URL>
---

# /risk-design — リスクベースドテストの設計フェーズ

入力: $ARGUMENTS (`url=` が対象URL)

`.github/agents/qa-risk-designer.agent.md` を読み、その手順に従え
(frontmatter の tools/model は VS Code 用なので無視)。

要点:

- 入力は承認済みの `qa-knowledge/targets/<target-slug>/risk-register.md`。
  `Review-Status: Approved` でなければ**何も書かずに停止**し、`/risk-plan` のレビューを促す
- 出力は `qa-knowledge/targets/<target-slug>/test-charters.md`
- **リスクID欄とビジネス要求欄が埋まらないチャーターは起票しない**(ここが関門)
- 対象外にしたリスクは「意図的に対象外」セクションに理由付きで必ず残す
- `Review-Status: Draft` のまま停止し、人間の確定を待つ
