# QA Explorer

VS Code + GitHub Copilot で動く「ルンバ型」QA探索エージェントです。
対象URLとざっくりしたテスト意図を渡すと、23観点リストに沿って自律的にテストを
生成・実行・記録します。

## 構成

```
qa-explorer/
├─ .github/
│  ├─ copilot-instructions.md     # ← 基本原則(常時適用)
│  └─ agents/
│     └─ qa-explorer.agent.md     # ← ルンバ型エージェント本体
├─ .prompts/
│  └─ explore.prompt.md           # ← /explore で起動
├─ qa-knowledge/
│  └─ viewpoints.md               # ← 23観点リスト(地図)
├─ tests/generated/               # ← Copilotが生成するPlaywrightテスト
└─ reports/                       # ← 進捗・カバレッジ・バグレポート
```

## セットアップ

1. 任意のディレクトリにこの一式を配置
2. VS Code でそのディレクトリを開く
3. GitHub Copilot 拡張機能が有効になっていることを確認
4. ターミナルで Playwright をインストール
   ```bash
   npm init -y
   npm install -D @playwright/test
   npx playwright install
   ```

## 使い方

VS Code の Copilot Chat を開き、Agent モードに切り替えてから:

```
/explore url=https://hotel-example-site.takeyaqa.dev/ja/plans.html intent=予約フォームの入力バリデーションを重点的に
```

これでエージェントが起動し、23観点を自律的に消化していきます。
進捗は `reports/coverage.md` と `reports/session-log.md` で確認できます。

## 止め方

チャットで「Stop」「止めて」と入力すると、現在のイテレーションを完了させてから
止まります。

## 設計の前提

- **テスト実行のコア技術**: Playwright(直接、MCPなし)
- **自律性**: 起動はユーザー、その後は完全自律
- **対象範囲**: Web アプリケーション(任意のサイト)
- **安全性**: 本番環境っぽい URL では一度だけ確認、本物の認証情報・個人情報は使わない

## このフォルダにまだ無いもの(必要に応じて追記)

- `qa-knowledge/test-patterns.md` — 観点ごとの具体的なテストパターン集
  (まずは `viewpoints.md` だけで動かして、足りないと感じたら追記)
- `qa-knowledge/bug-templates.md` — バグ起票のフォーマット
  (最初の1件を起票するときに、エージェント自身に作らせるのが楽)
- `reports/` 配下のファイル — エージェントが初回実行時に作る
