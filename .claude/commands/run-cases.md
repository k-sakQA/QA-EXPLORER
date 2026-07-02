---
description: ユーザーが用意したテストケース一覧(test-cases.md)をPlaywrightで実行する
argument-hint: url=<対象URL> [cases=<テストケースファイルのパス>]
---

# /run-cases — テストケース駆動実行の起動

入力: $ARGUMENTS
(`url=` が対象URL。`cases=` 省略時は `qa-knowledge/targets/<target-slug>/test-cases.md`)

以下の2ファイルを読み、qa-runner エージェントとしてテストケースを実行せよ:

1. `.github/agents/qa-runner.agent.md` — 起動手順・イテレーション手順・終了条件
   (frontmatter の tools/model は VS Code 用なので無視)
2. `qa-knowledge/loop-rules.md` — ナレッジ蓄積ループの必須ルール

要点:

- テストケースに書かれた手順と期待結果**のみ**を根拠に実行する
  (境界値・異常値の自動追加はしない。それは /explore の役割)
- 実行計画を提示したら、**承認を待たずに**イテレーションを開始し、
  全ケース消化まで自律的にループする
- チャット報告は1イテレーション1行。詳細と観察はすべてファイルに記録する
