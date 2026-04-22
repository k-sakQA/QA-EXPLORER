---
description: "対象URLを与えて、QA Explorer エージェントによる自律的な23観点探索を開始する"
mode: 'agent'
---

# /explore — QA探索の起動

以下の情報をもとに、`qa-explorer` エージェントを起動して自律的なテスト探索を
開始してください。

## 入力

- **対象URL**: ${input:url:テスト対象のURL(例: https://example.com/login)}
- **テスト意図**: ${input:intent:このサイトで重点的に見たいことを一言で}
- **目標カバレッジ**: ${input:coverage:目標観点カバレッジ(数字のみ。デフォルト 80):80}
- **最大イテレーション数**: ${input:maxIter:最大イテレーション数(数字のみ。デフォルト 23):23}

## 起動手順

`qa-explorer` エージェントの「起動時にやること」(Step 0〜5)に従ってください。
要点は以下:

1. 対象URLから `<target-slug>` を生成
2. `qa-knowledge/targets/<target-slug>/findings.md` の存在を確認
   - 存在する場合(継続): findings.md を**全件**読む → 再訪推奨・未着手・Open Hypothesis・Planned Probe を把握
   - 存在しない場合(新規): `_template/` からフォルダを作成
3. `qa-knowledge/viewpoints.md` を読む
4. 対象URLへ Playwright で一度だけアクセスし、ページ構造を把握
5. `reports/<target-slug>/session-log.md` に新しい Session セクションを追加
6. 探索計画を3〜5行で報告(優先順位: Planned Probe → 再訪推奨 → 未着手)
7. **承認を待たずに** イテレーションを開始する

## 進行中の振る舞い

- 各イテレーションで止まらない。完全自律で目標達成 or 終了条件を満たすまで続ける
- 1イテレーションごとにチャットには3〜5行のサマリーだけ
- 詳細はすべて `reports/<target-slug>/` 配下のファイルに書く

## 終了時

エージェントの「セッション終了処理」に従い、`session-log.md` の Session Summary と
「次セッションへの申し送り」を埋めたうえで、チャットには:

- 消化観点数 / 23、検出バグ数
- 新規 Finding / Hypothesis 数
- 次セッションへの申し送り
- Open な Hypothesis が残っていれば明示

だけを報告して終わる。
