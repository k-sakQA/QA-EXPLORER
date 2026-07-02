# QA Explorer

> **観点リスト**と**ナレッジ蓄積ループ**を使って、Webアプリケーションを自律的に探索的にテストするQAエージェント。
> Claude Code / VS Code + GitHub Copilot で動作します。

## このツールが目指すもの

従来の自動テストは「事前に書いた仕様を機械的に検証する」ものでした。
QA Explorer は逆で、**「何が壊れうるかをエージェント自身に考えさせながらテストする」** ための道具です。

具体的には、以下の3つを組み合わせて動きます:

1. **観点リスト** — QAのがよく注目するテストの基本形を網羅した（つもりの）地図
2. **ナレッジ蓄積ループ (Finding → Hypothesis → Probe)** — 気づきを次のテストに活かす仕組み
3. **AI / 人間協業** — 自動化できないものは `manual-tests.md` に手順書を残して人間に委譲

結果として、1セッションで複数のケースを実行しつつ、**「このサイトは状態管理が弱い」「このタイプのサイトではこう壊れがち」** といったパターン知識が自動で蓄積されていきます。

---

## セットアップと使い方

### 初期セットアップ

リポジトリをクローンし、Playwright を含む依存関係をインストールします。

```bash
git clone https://github.com/sakataQA/QA-EXPLORER.git
cd QA-EXPLORER
npm install
npx playwright install
```

### 認証情報の設定（テスト対象にログイン認証などが必要な場合）

以下のコマンドを実行すると、ブラウザで手動ログインを行ってセッションをローカルPC上に保存できます。
このローカルの認証情報を使ってPlaywrightがテストを実行できます。
```bash
QA_AUTH_URL=<ログインページのURL> npm run auth
```
テスト実行時の対象は `QA_BASE_URL`(未指定時は hotel-example-site)、
認証確認パスは `QA_AUTH_CHECK_PATH` で指定します。認証不要な対象では何も設定不要です。

### 実行コマンド

Claude Code、または VS Code チャット(**Agent モード**)で以下を入力して探索を開始します。

**自律探索モード:**
```
/explore url=<テスト対象のURL> intent=<意図>
# 例: /explore url=https://hotel-example-site.takeyaqa.dev intent=入力フォームのバリデーションを中心にテスト
```
「intent=広く浅く」のようなざっくりした指示でも大丈夫です。

**ケース駆動実行モード：** テストケースをチャット欄で添付し、以下を入力して実行します。
```
/run-cases url=<テスト対象のURL>
```

本エージェントは「観点リスト」を地図とし、「気づき → 仮説 → 検証」のループを自律的に回します。

---

## 2つのモード

QA Explorer には **Explore モード** と **Runner モード** の2種類があります。

### Explore モード — 自律探索 (`qa-explorer` + `/explore`)

**何をするか**: 観点リストをキッカケに、エージェントが自分でテストケースを考えながら探索します。
「このサイトのどこが壊れているかを発見したい」ときに使います。

**使うとき**:
- テストケースがまだ無い新規対象を探索するとき
- 観点ドリブンで網羅的に弱点を洗い出したいとき
- バグの仮説を立てて深掘り検証したいとき

### Runner モード — ケース駆動実行 (`qa-runner` + `/run-cases`)

**何をするか**: ユーザーが用意したテストケース一覧(`test-cases.md`)をキッカケに、
その手順と期待結果をそのまま Playwright で実行します。
「このとおりテスト実行してね」というときに使います。

**使うとき**:
- 既存のテスト仕様書やチェックリストを自動実行したいとき
- 自律探索ではなく、確実に指定した手順を実行してほしいとき
- テストケースからテストを膨らませたい時
- 注意：テストケースの手順は細かい方が正確に実行できます。また、ケースが全て実行される保証はありません。必ず結果レポートを確認してください。

---

## 同梱している Skills

| Skill | 説明 |
|---|---|
| `qa-explorer-report` | QA Explorer のテスト結果を、人間にとって読みやすい1枚のHTMLレポートに集約する。検出バグ・手動テスト候補・実行したテスト内容を全対象横断で1ファイルにまとめる。ユーザーが「QA Explorer のレポートを出して」「テスト結果をHTMLにまとめて」「探索結果をレビュー用に整形して」「reports フォルダの中身を見やすく出して」のように依頼する。テスト実行後のキャッチアップ用に最適化されている。 |
| `human-auth-storage` | 人間がブラウザでテスト対象の認証を完了し、ローカルのディレクトリに認証情報を保存。後のAIエージェントのテスト実行で使えるようにする。ブラウザ上で人間が入力した情報は保存されない。 |

---

## 構成

```
qa-explorer/
├─ CLAUDE.md                            # Claude Code 用の基本原則(常時適用・最小限)
├─ .claude/commands/
│  ├─ explore.md                        # /explore で起動 (Claude Code)
│  ├─ run-cases.md                      # /run-cases で起動 (Claude Code)
│  └─ qa-explorer-report.md             # /qa-explorer-report で起動
├─ .github/
│  ├─ copilot-instructions.md           # Copilot の基本原則(常時適用)
│  └─ agents/
│     ├─ qa-explorer.agent.md           # 自律探索エージェントの手順(正準)
│     └─ qa-runner.agent.md             # テストケース駆動実行の手順(正準)
├─ .prompts/
│  ├─ explore.prompt.md                 # /explore で起動 (VS Code)
│  └─ run-cases.prompt.md              # /run-cases で起動 (VS Code)
├─ qa-knowledge/
│  ├─ viewpoints.md                     # 観点リスト(基本形・不変)
│  ├─ loop-rules.md                     # ナレッジ蓄積ループの正準ルール
│  └─ targets/
│     ├─ _template/                     # 新規対象用のひな形
│     └─ <target-slug>/                 # 対象ごとのナレッジ
│        ├─ findings.md                 # Finding / Hypothesis / Probe の蓄積
│        ├─ findings-archive.md         # クローズ済みエントリの退避先
│        ├─ derived-viewpoints.md       # 対象固有の派生観点
│        └─ test-cases.md              # テストケース一覧(Runner モード用)
├─ reports/
│  ├─ _template/                        # 新規対象用のひな形
│  └─ <target-slug>/                    # 対象ごとのレポート
│     ├─ coverage.md                    # 観点消化状況
│     ├─ session-log.md                 # セッションの経緯
│     └─ bugs/                          # GitHub Issue 形式のバグレポート
└─ tests/generated/                     # エージェントが生成する Playwright spec
```

エージェントの手順は `.github/agents/*.agent.md`、記録ルールは
`qa-knowledge/loop-rules.md` にそれぞれ1箇所だけ定義し、Claude Code /
Copilot の両方から参照します(重複定義を持たない)。

`<target-slug>` は対象URLのホスト名から自動生成されます。
例: `hotel-example-site.takeyaqa.dev` → `hotel-example-site-takeyaqa-dev`

---

## Acknowledgements / 謝辞

このツールの開発と検証には、[岸さん (@takeyaqa)](https://github.com/takeyaqa) が公開されている
[**Hotel Planisphere (hotel-example-site)**](https://github.com/takeyaqa/hotel-example-site) を検証対象として使わせていただきました。

無償で公開されているテスト練習用の Web アプリケーションは、私たちのようなQAにとって
「最初の一歩」を踏み出すための貴重な素材です。現実のサイトを不用意に叩くことなく、安全に・反復的に・真剣にテスト設計と自動化を試せる環境が整っていることの価値は計り知れません。

特に hotel-example-site は、フォームの条件付き必須、境界値、状態管理など、
QAが実務で遭遇する典型的なテストパターンがバランス良く含まれており、
本ツールのナレッジ蓄積ループが期待通り機能するかを検証する素材として最適でした。

岸さん、ならびに教育的価値のあるテスト素材を公開してくださっている全ての方々に、深く感謝いたします。

---

## ライセンス

MIT License。`LICENSE` ファイルを参照してください。
