---
description: ビジネスリスクを分析してテスト計画(リスク一覧)を作る。人間レビュー待ちで停止する
argument-hint: url=<対象URL> [docs=<要件書等のパス/URL,カンマ区切り>] [intent=<今回のテストの狙い>]
---

# /risk-plan — リスクベースドテストの計画フェーズ

入力: $ARGUMENTS
(`url=` が対象URL。`docs=` は要件書・仕様書・PRD 等のパスかURL。`intent=` は任意)

`.github/agents/qa-risk-planner.agent.md` を読み、その手順に従え
(frontmatter の tools/model は VS Code 用なので無視)。

**このコマンドは2回に分けて実行する。**

1. **1回目 (Phase A)**: 質問票 `risk-input.md` を出力して**停止**する。
   資料から埋められる欄は先に埋め、残りは空欄のまま。推測で埋めない。
   人間(顧客・PO・開発リーダー)が持ち帰って記入する
2. **2回目 (Phase B)**: 記入済みの `risk-input.md` を読み、リスク分析を行って
   `risk-register.md` を出力し、`Review-Status: Draft` で**停止**する

どちらのフェーズかは `risk-input.md` の `記入状況` 欄で判定する。
ユーザーが「その場で対話で答える」と言った場合のみ、続けて実施してよい。

要点:

- 出力は `qa-knowledge/targets/<target-slug>/risk-input.md` と `risk-register.md` の2つ
- 質問票は**そのまま顧客に送れる状態**を保つ(専門用語を使わない、記入例を残す)
- リスクアイテムは **業務フロー単位** で立てる。23観点は「見落とし防止のチェックリスト」
  として使い、観点を機械的に全展開しない
- 影響度は **必ず risk-input.md に書かれたビジネス上の損失に紐づける**。
  紐づかないものは影響度 L に落とす(= 意味の薄いテストを機械的に排除する仕組み)
- 評価は AI の**案**。`Review-Status: Draft` のまま停止し、人間の確定を待つ。
  **自動で Approved にしてはならない**
- 停止時のチャット報告は3〜5行。詳細は全部ファイルに書く
