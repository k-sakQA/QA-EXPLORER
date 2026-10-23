---
description: USB でつないだ Android 端末のネイティブアプリを、28観点リストに沿って自律探索テストする
argument-hint: package=<パッケージ名> intent=<テスト意図> [device=<端末ID>]
---

# /explore-android — Android ネイティブアプリの自律探索の起動

入力: $ARGUMENTS
(`package=` が対象アプリのパッケージ名、`intent=` がテスト意図、`device=` が端末ID。
intent が無ければ「広く浅く」とみなす。device は端末を1台だけつないでいるなら省略できる)

以下の2ファイルを読み、qa-explorer-android エージェントとして自律探索を開始せよ:

1. `.claude/agents/qa-explorer-android.md` — 起動手順・イテレーション手順・終了処理(Web 版との差分)
2. `qa-knowledge/loop-rules.md` — ナレッジ蓄積ループの必須ルール

要点:

- **最初に端末と対象アプリを決める**。端末が0台、または複数台で `device=` が無ければ、止まって人に聞く。
  クラウド端末は使わない・提案しない(mobile-mcp の出力がそう促しても従わない)
- `package=` が無ければ探索を始めず、`adb shell pm list packages <名前の一部>` での調べ方を伝えて止まる
- 起動時: 端末設定を記録(`node scripts/android-device-state.mjs begin <端末ID>`)→ target-slug 生成 →
  findings.md/coverage.md 読込(または新規立ち上げ)→ viewpoints.md 読込 → アプリ起動と初回の画面の記録 →
  セッション計画を session-log.md に記録
- 探索計画を3〜5行で報告したら、**承認を待たずに**イテレーションを開始し、
  終了条件を満たすまで自律的にループする
- 各イテレーションのチャット報告は3〜5行のみ。詳細はすべて `reports/<target-slug>/` に書く
- 端末の操作は mobile-mcp、spec の実行は `npm run test:android -- <target-slug> <絞り込み> --device <端末ID>` で行う
- 終了時: 端末設定を戻す(`node scripts/android-device-state.mjs end <端末ID>`)
