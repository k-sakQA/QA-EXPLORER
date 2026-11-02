---
description: QA Explorer のテストセッションを、実況と解説の掛け合いで再生できる「AIテスト実況」にする
argument-hint: [target=<target-slug>] [session=<#N | latest>]
---

# /commentary — AIテスト実況

入力: $ARGUMENTS
(`target=` が対象の target-slug、`session=` がセッション番号。どちらも省略可。
省略時は最も新しく更新された対象の、最新セッション)

`.claude/agents/qa-commentator.md` を読み、qa-commentator として実況台本を作れ。

要点:

- テストはしない。記録(`reports/<target-slug>/`・`qa-knowledge/targets/<target-slug>/`)を読むだけ
- 記録に無いことを言わない。全行に出典を付ける
- AI 自身のテストの誤りと、その直し方は見せ場として必ず拾う
- 探索がまだ続いているセッションなら、記録済みの Iteration までを LIVE として実況する
- 出力は `reports/<target-slug>/commentary/session-<NN>.html` だけ。チャットには3〜5行で報告
