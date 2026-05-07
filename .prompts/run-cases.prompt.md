---
description: "テストケース一覧を渡して、`qa-runner` エージェントによるケース駆動実行を開始する"
mode: 'agent'
---

# /run-cases — テストケース駆動実行の起動

以下の情報をもとに、`qa-runner` エージェントを起動してテストケース一覧の実行を
開始してください。

## 入力

- **対象URL**: ${input:url:テスト対象のURL(例: https://example.com/login)}
- **テストケースファイル**: ${input:caseFile:テストケースファイルのパス。スラッグはURLのホスト名から自動生成(小文字 + ピリオドをハイフンに変換)。例: hotel-example-site.takeyaqa.dev → qa-knowledge/targets/hotel-example-site-takeyaqa-dev/test-cases.md}
- **注視するケース群**: ${input:intent:今回特に重点的に実行したいケース群があれば(任意)}
- **最大イテレーション数**: ${input:maxIter:最大イテレーション数(数字のみ。デフォルト 50):50}

## 起動手順

`qa-runner` エージェントの「起動時にやること」(Step 0〜5)に従ってください。
要点は以下:

1. 対象URLから `<target-slug>` を生成
2. `qa-knowledge/targets/<target-slug>/findings.md` の存在を確認
   - 存在する場合(継続): findings.md を**全件**読む → テストケース消化状況・Fail ケース・Open Hypothesis を把握
   - 存在しない場合(新規): `_template/` からフォルダを作成
3. `${caseFile}` (未指定の場合は `qa-knowledge/targets/<target-slug>/test-cases.md`) を読み込む
   - ファイルが存在しない場合はユーザーにパスを確認して停止する
4. 対象URLへ Playwright で一度だけアクセスし、ページ構造を把握
5. `reports/<target-slug>/session-log.md` に新しい Session セクションを追加
6. 実行計画を3〜5行で報告(優先順位: Fail ケース → Not Run の P0 → P1 → P2 → P3)
7. **承認を待たずに** イテレーションを開始する

## 進行中の振る舞い

- 各イテレーションで止まらない。完全自律で終了条件を満たすまで続ける
- 1イテレーションごとにチャットには以下の**1行**だけ:
  `[Iter N] TC-XXX(<タイトル>): <結果> / バグ: N / 進捗: NN/総数 / 次: TC-YYY`
- 詳細はすべて `reports/<target-slug>/` 配下のファイルに書く

## 終了時

エージェントの「セッション終了処理」に従い、`session-log.md` の Session Summary と
「次セッションへの申し送り」を埋めたうえで、チャットには:

- 消化ケース数 / 総数、検出バグ数
- 新規 Finding 数
- Fail のまま残ったケース一覧
- 次セッションへの申し送り

だけを報告して終わる。
