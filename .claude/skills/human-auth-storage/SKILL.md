---
name: human-auth-storage
description: 人間がブラウザで手動ログイン（SSO/MFA/CAPTCHA/passkey 等、AIが代行すべきでない認証）を完了し、その Playwright storageState をリポジトリの storage/ 配下に保存して、後続のテスト実行で使えるようにする。Claude Code がテスト対象のログインに人手を必要とするとき、認証 Cookie / localStorage / IndexedDB を保存したいとき、保存した認証ファイルを Playwright テストに組み込みたいときに使う。
---

# Human Auth Storage

AIエージェントが代行すべきでない・できない認証（SSO・MFA・CAPTCHA・passkey、人間が
管理するアカウント等）をブリッジするためのスキルです。人間がブラウザで手動ログインし、
結果の `storageState` をローカルに保存します。

このリポジトリには認証保存スクリプト [`scripts/save-auth.ts`](../../../scripts/save-auth.ts) が
同梱されており、`npm run auth` で起動できます。

## ワークフロー

1. **対象URLを決める**
   - ユーザーが明示したURLを優先する。
   - 無ければ対象設定・Playwright config・package スクリプト・既存の `storage/*auth*.json`
     の命名から推測し、ユーザーに確認する。

2. **認証保存スクリプトを headed ブラウザで起動する**（リポジトリルートから実行）

   ```bash
   AUTH_TARGET_URL=<対象URL> npm run auth
   ```

   スクリプトは Chromium を headed で起動し、指定URLを開いてユーザーの手動ログインを待ちます。
   認証情報は `storage/auth.json` に保存されます（IndexedDB を含む。Firebase Auth の
   リフレッシュトークン等も保持）。

3. **対話的な TTY/セッションで実行する。** headed ブラウザの起動に承認が必要な環境では、
   承認を依頼して同じコマンドを再実行する。

4. **ユーザーにチャットで伝える:**

   ```text
   Chrome ブラウザで認証を行ってください。ホーム画面が表示されたら、ターミナルで Enter を押してください。
   ```

5. ユーザーがログインを終えてターミナルで Enter を押すと、スクリプトが `storageState` を
   保存し、ブラウザを閉じる。

6. 保存後、`storage/auth.json` が生成されたことと、Cookie / localStorage / IndexedDB の
   エントリが存在することを**件数だけ**で確認する（中身は表示しない）。

7. 保存したファイルを Playwright テストで再利用する:

   ```ts
   test.use({ storageState: 'storage/auth.json' });
   ```

## ガードレール

- ユーザーに、認証情報・MFAコード・Cookie・トークン・保存JSONの中身をチャットへ貼り付けるよう
  **求めない**。
- ストレージの値を出力しない。Cookie / localStorage / IndexedDB の**件数**を報告すれば十分。
- 認証情報は `storage/` 配下以外に保存しない（ユーザーが別のリポジトリ内パスを明示した場合を除く）。
- 新しい認証ファイルを作る前に `storage/` が git で無視されていることを確認する。無視されて
  いなければ ignore ルールを更新するか、保存前にユーザーに確認する（このリポジトリでは
  `.gitignore` に `storage/` が登録済み）。
- デフォルトでは未認証の新規コンテキストを取得する。ユーザーが明示的に「既存セッションを
  更新したい」と言わない限り、古い `storageState` を読み込まない。
- 人間のログイン互換性のため Chrome を優先する。Chrome が無い場合のみ同梱 Chromium に
  フォールバックする。

## 失敗時の対処

- スクリプトが Playwright を解決できない場合、`npx playwright install` を実行するか、
  リポジトリ既存の Playwright 依存を使ってから再試行する。
- 保存された状態の Cookie / localStorage / IndexedDB が全てゼロの場合、認証画面が表示された
  ことを確認してからログインをやり直すようユーザーに依頼する。
- 保護されたURLがログインページにリダイレクトされる場合、保存をやり直すか、正しいログイン後
  URLを選ぶ。
- アプリが Firebase / Auth0 / Supabase 等のブラウザストレージを使う場合、IndexedDB の
  保存を有効にしたまま実行する（`save-auth.ts` はデフォルトで IndexedDB を含める）。
