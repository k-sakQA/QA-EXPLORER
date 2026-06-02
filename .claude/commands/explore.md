---
description: 対象URLを与えて、qa-explorer サブエージェントによる自律的な23観点探索を開始する
argument-hint: url=<テスト対象URL> intent=<意図> [coverage=80] [maxIter=23]
---

# /explore — QA探索の起動

引数: `$ARGUMENTS`

上記の引数を解析し、`qa-explorer` サブエージェントを Task ツールで起動して、
自律的なテスト探索を開始してください。

## 引数の解析

`key=value` 形式で渡されます。

- `url=` — テスト対象のURL（必須。例: `https://example.com/login`）
- `intent=` — このサイトで重点的に見たいこと（任意。「広く浅く」程度のざっくり指示でも可）
- `coverage=` — 目標観点カバレッジ（数字のみ。デフォルト 80）
- `maxIter=` — 最大イテレーション数（数字のみ。デフォルト 23）

`url=` が無い場合は、ユーザーに対象URLを尋ねてから進めてください。

## 起動手順

`qa-explorer` サブエージェントを起動し、その「起動時にやること」(Step 0〜5)に
従わせてください。要点は以下:

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

サブエージェントの「セッション終了処理」に従い、`session-log.md` の Session Summary と
「次セッションへの申し送り」を埋めたうえで、チャットには:

- 消化観点数 / 23、検出バグ数
- 新規 Finding / Hypothesis 数
- 次セッションへの申し送り
- Open な Hypothesis が残っていれば明示

だけを報告して終わる。
