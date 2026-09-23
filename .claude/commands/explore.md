---
description: 対象URLを渡して、23観点リストに沿った自律探索テストを開始する
argument-hint: url=<対象URL> intent=<テスト意図> [charter=<test-charters.md のパス>]
---

# /explore — QA自律探索の起動

入力: $ARGUMENTS
(`url=` が対象URL、`intent=` がテスト意図。intent が無ければ「広く浅く」とみなす。
`charter=` があればチャーター駆動モードになる)

以下の2ファイルを読み、qa-explorer エージェントとして自律探索を開始せよ:

1. `.github/agents/qa-explorer.agent.md` — 起動手順・イテレーション手順・終了条件
   (frontmatter の tools/model は VS Code 用なので無視)
2. `qa-knowledge/loop-rules.md` — ナレッジ蓄積ループの必須ルール

要点:

- **モード判定を最初に行う**。`charter=` があれば**チャーター駆動モード**:
  前段(`/risk-design`)が決めたチャーターの範囲・深さ・実行順**だけ**を実行する。
  観点リストの優先度(P0→P3)は使わない。チャーターに無い観点に手を出さない。
  `Review-Status` が `Approved` でなければ探索せずに停止する
- チャーター駆動では、各イテレーションで `test-charters.md` の「状態」を更新し、
  終了時に**残存リスク**(未確認のまま終了・未実行のチャーターと紐づくリスクID)を必ず報告する
- 起動時: target-slug 生成 → findings.md/coverage.md 読込(または新規立ち上げ)→
  viewpoints.md 読込 → 初回スナップショット → セッション計画を session-log.md に記録
- 探索計画を3〜5行で報告したら、**承認を待たずに**イテレーションを開始し、
  終了条件を満たすまで自律的にループする
- 各イテレーションのチャット報告は3〜5行のみ。詳細はすべて `reports/<target-slug>/` に書く
- ブラウザ操作・実行は Playwright スクリプト(`npx playwright test`)で行う
