# QA-EXPLORER ナレッジ蓄積ループ導入パッケージ

このパッケージは [QA-EXPLORER](https://github.com/k-sakQA/QA-EXPLORER) リポジトリに
探索的テストの「気づき→仮説→次の一手」ループを組み込むためのファイル一式です。

## 同梱物

```
.
├─ README.md                            ← このファイル
├─ apply-knowledge-loop.sh              ← 移行スクリプト
└─ files/                               ← リポジトリに配置されるファイル一式
   ├─ .github/
   │  ├─ copilot-instructions.md        (上書き)
   │  └─ agents/
   │     └─ qa-explorer.agent.md        (上書き)
   ├─ qa-knowledge/
   │  └─ targets/
   │     ├─ _template/                  (新規)
   │     │  ├─ findings.md
   │     │  └─ derived-viewpoints.md
   │     └─ hotel-example-site/         (新規・既存バグ2件をF-として取込済)
   │        ├─ findings.md
   │        └─ derived-viewpoints.md
   └─ reports/
      ├─ _template/                     (新規)
      │  ├─ coverage.md
      │  ├─ session-log.md
      │  └─ bugs/
      │     └─ _bug-report-template.md
      └─ hotel-example-site/            (既存を git mv + 新フォーマット上書き)
         ├─ coverage.md
         ├─ session-log.md
         └─ bugs/
            ├─ 2026-04-22-viewpoint-02-focus-on-first-invalid-field.md
            └─ 2026-04-22-viewpoint-10-email-lost-after-back.md
```

## 適用手順

### 1. QA-EXPLORER リポジトリを最新化

```bash
cd /path/to/QA-EXPLORER
git checkout main
git pull
```

未コミットの変更がないことを確認してください。

### 2. このパッケージをリポジトリ直下に展開

```bash
# 例: このパッケージをホームに解凍した場合
cp -r ~/qa-explorer-knowledge-loop/apply-knowledge-loop.sh ./
cp -r ~/qa-explorer-knowledge-loop/files ./
```

リポジトリ直下に `apply-knowledge-loop.sh` と `files/` フォルダが並ぶ状態にします。

### 3. 移行スクリプトを実行

```bash
bash apply-knowledge-loop.sh
```

スクリプトは以下を自動で行います。

1. **既存ファイルの移動 (履歴保持)**
   - `reports/coverage.md` → `reports/hotel-example-site/coverage.md` (git mv)
   - `reports/session-log.md` → `reports/hotel-example-site/session-log.md` (git mv)
   - `reports/bugs/*.md` → `reports/hotel-example-site/bugs/*.md` (git mv)

2. **既存ファイルを新フォーマットで上書き**
   - 移動した `coverage.md`, `session-log.md`, バグ2件を新フォーマットに更新
   - `.github/copilot-instructions.md` にナレッジ運用セクションを追加した完全版に差し替え
   - `.github/agents/qa-explorer.agent.md` にナレッジループ処理を統合した完全版に差し替え

3. **新規ファイルの配置**
   - `qa-knowledge/targets/_template/` (新規対象のひな形)
   - `qa-knowledge/targets/hotel-example-site/` (既存バグ2件を F-20260422-01/02 として取込済)
     - `findings.md` には H-20260422-01 (Open) と P-20260422-01/02 (Planned) も既登録
   - `reports/_template/`

### 4. 内容を確認

```bash
git status
git diff --stat
git diff .github/copilot-instructions.md
git diff .github/agents/qa-explorer.agent.md
git diff reports/hotel-example-site/coverage.md
```

### 5. コミット & プッシュ

```bash
# 一時ファイルを除外
rm -rf files apply-knowledge-loop.sh

git add -A
git commit -m "feat: introduce knowledge accumulation loop for exploratory testing

- Add 3-layer knowledge model (Finding/Hypothesis/Probe) per target
- Reorganize reports/ under per-target folders (git mv preserves history)
- Add templates under qa-knowledge/targets/_template/ and reports/_template/
- Update agent & copilot instructions to enforce session start/end checklists
- Pre-load hotel-example-site with F-20260422-01/02, H-20260422-01, P-20260422-01/02"

git push origin main
```

## 適用後の動作

次回 `/explore url=... intent=...` を実行したとき、エージェントは:

- 既存対象 (例: hotel-example-site) なら、`findings.md` を全件読んでから
  Planned Probe P-20260422-01 (観点13 再訪) から取りかかる
- 新規対象なら、`_template/` から自動的にフォルダを作って開始

## 初期ロード済みの仮説について

`hotel-example-site/findings.md` には、既存バグ2件から導いた以下を先に登録してあります:

- **F-20260422-01, F-20260422-02**: 既存2バグを Finding 化
- **H-20260422-01**: 「ユーザー操作後の UI 状態整合性が弱い」という仮説 (Open)
- **P-20260422-01**: 観点13を履歴復元の切り口で再訪 (Planned)
- **P-20260422-02**: 観点02をアクセシビリティの切り口で再訪 (Planned)

これにより、次セッション開始直後から探索的ループが回る状態になっています。
