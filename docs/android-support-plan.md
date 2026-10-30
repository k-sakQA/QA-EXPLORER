# Android ネイティブアプリ対応 — 追加内容・依存関係・判断の記録

- 作成日: 2026-10-23(同日、レビュー指摘を反映: 取り違え防止・制限の経路・テレメトリの抜け道・異常終了時の後片付け)
- 状態: 実装前の計画。実装中に分かった差分は、この文書に反映する
- 対象 PC: **macOS と Windows 11**(複数人で使う前提。どちらも Claude Code から使う)
- 判断の経緯: [feasibility-android-adb.md](feasibility-android-adb.md)
- 準備とコマンドの手順書: [android-setup.md](android-setup.md)

---

## 1. 追加しようとしていることの概要

### 何ができるようになるか

PC に USB でつないだ Android 端末の**ネイティブアプリ**を、Web 版と同じ28観点・同じナレッジ蓄積ループで
自律的に探索テストできるようにする。Android の Web ブラウザ(Chrome)は対象外。

Web 版との違いは「目と手」と「再生器」だけで、脳にあたる部分はそのまま使う。

| 役割 | Web 版(今) | Android 版(追加) |
|---|---|---|
| 目と手(画面を見て操作する) | Playwright MCP | **mobile-mcp** |
| 再生器(spec を書いて再実行する) | Playwright Test | **Mobilewright**(Playwright Test を拡張したモバイル版) |
| 脳(観点・欠陥仮定・判定・findings・レポート) | 28観点 / loop-rules / `/qa-explorer-report` | **変更なし** |

1イテレーションの流れも Web 版と同じ。

```
mobile-mcp で画面を見る → 欠陥仮定を立てる → Mobilewright の spec を書く → 実行する
→ findings / bugs / evidence に記録する
```

複数人・複数案件で使う道具なので、「動くこと」に加えて次の3つを最初から作り込む。

- **取り違えない**: A社の spec が B社のアプリに対して走らない。指定していない端末を操作しない
- **制限を迂回しにくくする**: MCP・シェル・生成したコードのどの経路で何を止めるかを決めておく
- **途中で落ちても戻せる**: 端末設定を変えたまま終わっても、次に開いたときに気づいて戻せる

### 追加・変更するファイル

| 種別 | ファイル | 内容 |
|---|---|---|
| 新規 | `.claude/agents/qa-explorer-android.md` | Android 版の探索手順(Claude Code のサブエージェントとしても使える)。Web 版の手順から「対象URLにアクセス」「spec の生成」「実行コマンド」を差し替え、「端末と対象アプリの確認」「端末設定の記録と復元」を足したもの |
| 新規 | `.claude/commands/explore-android.md` | `/explore-android` コマンド(上の手順と loop-rules を読んで探索を始める) |
| 新規 | `mobilewright.config.ts` | Android の spec の実行設定。対象フォルダ・パッケージ名・端末は `run-android.mjs` から受け取り、自分では決めない。出力先は `test-results-android/`、失敗時に動画とビューツリーを残す |
| 新規 | `scripts/run-android.mjs` | **Mobilewright を呼ぶ唯一の入口**。①テレメトリ停止の環境変数を付ける ②対象スラッグを必須にし、そこからパッケージ名を決める ③端末を1台に決める(複数つながっていて指定が無ければ止まる) ④その端末に対象アプリが入っているか確かめてから実行する |
| 新規 | `scripts/android-device-state.mjs` | 端末設定の記録と復元。セッション開始時に、テストで変えうる設定の値を PC 側に記録し、終了時に戻す。記録が残っていれば「前回戻せなかった」と分かる |
| 新規 | `scripts/guard-android.mjs` | Claude Code の PreToolUse フック。Bash で実行されるコマンド全体と、mobile-mcp の `mobile_batch_commands` に並んだ各ステップを見て、「制限と、その効き方」の表のとおり止めるか承認を求める |
| 新規 | `scripts/android-common.mjs` | 上の3つで共通に使う、adb の呼び出し・端末の決め方・対象スラッグとパッケージ名の変換 |
| 変更 | `playwright.config.ts` | `testIgnore` に `tests/generated/android/` を追加(Web の実行が Android の spec を拾わないように) |
| 変更 | `.mcp.json` | mobile-mcp を追加。`npx` ではなく `node` で node_modules 内の mobile-mcp を直接起動し、mobile-mcp と Mobilewright の両方のテレメトリを止める |
| 変更 | `.claude/settings.json` | mobile-mcp のクラウド端末系ツールを禁止、アプリのインストール・削除は都度承認。`guard-android.mjs` を PreToolUse(Bash)に登録 |
| 変更 | `package.json` | 依存の追加と、`test:android` / `android:doctor` / `android:inspect` / `android:codegen`(すべて `run-android.mjs` 経由) |
| 変更 | `scripts/check-setup.mjs` | セッション開始時に「`.mcp.json` でテレメトリが止まっているか」「Node.js が 22.12 以上か」「戻っていない端末設定の記録が残っていないか」を確認 |
| 変更 | `.claude/commands/qa-explorer-report.md` | spec を探す場所に `tests/generated/android/<target-slug>/` を足す(Android の spec を対象別のフォルダに分けるため) |
| 変更 | `.gitignore` | `*.apk` / `*.aab` / `test-results-android/` / `.android-state/` / 顧客ごとの `mobilewright.*.config.ts` を除外(`tests/generated/android/` は既存の `tests/generated/*` の除外に含まれる) |
| 変更 | `CLAUDE.md` / `README.md` | コマンド一覧と使い方を追記 |

### 変えないもの

- `qa-knowledge/viewpoints.md`(28観点)と `qa-knowledge/loop-rules.md`
- findings / coverage / session-log / bugs / evidence の形式と置き場所
- `/qa-explorer-report` の見た目と読み方(変えるのは spec を探す場所だけ)
- Web 版の `/explore` と、既存の spec
- VS Code + Copilot 側(`.github/agents/`・`.prompts/`)。Android 版は Claude Code 専用

### 決まりごと(Web 版と違うところ)

- **Mac と Windows で同じ手順・同じ設定ファイルを使う**: npm スクリプトや手順書に、片方の OS でしか動かない書き方
  (`VAR=1 コマンド` の環境変数の前置き、`grep` へのパイプ、`npx` の直接起動など)を入れない
- **対象スラッグ**: `android-` + パッケージ名のドットをハイフンにしたもの。例: `com.example.shop` → `android-com-example-shop`。
  パッケージ名にはハイフンを使えないので、スラッグからパッケージ名に戻せる(`run-android.mjs` はこれを使う)
- **spec の置き場所**: `tests/generated/android/<target-slug>/viewpoint-NN-<keyword>.android.spec.ts`。
  対象ごとにフォルダを分け、**実行するときは必ず対象スラッグを指定する**(全対象をまとめて実行する手段は作らない)
- **端末は明示する**: mobile-mcp はすべての操作で端末 ID を渡す。複数台つながっていて指定が無ければ、止まって人に聞く。
  操作の前に、前面のアプリが対象パッケージかを確認する(クラッシュした後にホーム画面や別のアプリを触り続けないように)
- **対象アプリ以外の画面を撮らない**: 実際の端末はテスト専用ではなく、他の開発中アプリも入っている(2026-10-30 さかたさん談)。
  ホーム画面・他のアプリ・通知欄・最近使ったアプリのスクショは撮らない・保存しない。下の表の「専用端末」は理想の形で、
  共用の端末でもこの決まりで中身が外に出ないようにする
- **エビデンス**: Web と同じく `reports/<target-slug>/evidence/` に置く。探索中のスクショは
  `mobile_save_screenshot` で保存してから `Evidence:` に書く。動画はバグとして起票するものだけ残す
- **テレメトリは必ず止める**: mobile-mcp は `.mcp.json` の env で、Mobilewright は `run-android.mjs` 経由でしか起動しないことで止める
- **端末設定は記録してから変える**: 今回テストで変えてよいのは、記録・復元の対象にしている設定(画面サイズ・表示密度・フォントサイズ・回転・アニメーション)だけ。
  ほかの設定(通信・ダークモード・権限など)は、Android 固有の観点を足すときに記録の対象と一緒に増やす

### 制限と、その効き方

| 止めたいこと | MCP(mobile-mcp) | シェル(Bash) | AI が書いた spec・スクリプト | 最後の砦 |
|---|---|---|---|---|
| 未リリースのアプリをクラウド端末に送る | `mobile_login_to_cloud_provider` / `mobile_list_remote_devices` / `mobile_allocate_remote_device` / `mobile_release_remote_device` を禁止 | `mobilecli` の直接実行を禁止 | クラウド用ドライバを使わない(手順書のルール) | **mobilenext.ai にログインせず、API キーも置かない**。資格情報が無ければクラウドには繋がらない |
| アプリの入れ替え・データ消去 | `mobile_install_app` / `mobile_uninstall_app` は都度承認 | `adb` の `install` / `uninstall` / `pm clear` などは都度承認。フックがコマンド全体を見るので、`adb -s <serial> install` の形でも拾う | 手順書で禁止 | 専用端末(消えて困るデータを置かない) |
| テレメトリ付きで起動する | `.mcp.json` の env で停止 | `mobilewright` / `npx mobilewright` の直接実行を禁止し、npm スクリプトを使うよう理由を返す | — | `check-setup` が `.mcp.json` の env を毎回確認 |
| 端末設定を変えたまま終わる | (記録の対象なら、変える経路を問わず戻せる) | 同左 | 同左 | セッション開始時の記録 + 次回起動時の検出 |

- 禁止・承認の理由はフックが表示し、エージェントは拒否されたことと理由を `session-log.md` に残す
- **完全には塞げない経路がある**: AI が書いた Node.js のスクリプトの中から adb を呼ぶと、フックからは中身が見えない。
  そのため、表の右端の「最後の砦」(資格情報を置かない・専用端末・次回起動時の検出)を、手順書のルールより優先して守る
- Claude Code の permission の Bash ルールは先頭一致なので、`adb -s <serial> install` を取りこぼす。
  端末を明示する決まりと両立させるため、Bash の制限は permission ではなくフックで行う

---

## 2. 新たに必要となる依存関係

### PC 側

| もの | 要件 | Mac | Windows |
|---|---|---|---|
| OS | Mobilewright の要件 | macOS | **Windows 11**(Windows 10 は記載が無い) |
| CPU | — | Apple Silicon / Intel とも可 | x64 / ARM とも可 |
| Node.js | **22.12 以上**(Mobilewright の要件) | 同左 | 同左 |
| JDK | 11 以上(Mobilewright の要件) | Eclipse Temurin など | Eclipse Temurin など |
| Android SDK | platform-tools など(`npm run android:doctor` が不足を教えてくれる) | Android Studio で入れる | Android Studio で入れる |
| 環境変数 | `JAVA_HOME` / `ANDROID_HOME`、platform-tools を PATH に | `~/.zshrc` に書く | 「環境変数を編集」画面で設定 |
| USB ドライバ | 端末を認識させる | **不要** | **必要**。Pixel は SDK Manager の「Google USB Driver」、ほかのメーカーは各社が配布するもの |
| adb | Android SDK に入っているもの**1つだけ**を使う | Homebrew の `android-platform-tools` と重複しやすい | 端末メーカーの管理ソフトなどが別の adb を同梱していることがある |

adb が2つあると、版の違いで「adb server version doesn't match」と出て接続が切れることがある。どちらの OS でも、SDK の adb に揃える。

**実機だけなら、adb(platform-tools)だけで動いた**(2026-10-23、Mac + Sony Xperia XQ-BQ42 / Android 13)。
JDK・Android Studio を入れず、`ANDROID_HOME` も未設定のまま、mobile-mcp での操作も spec の実行も通った。
`npm run android:doctor` は JDK と `ANDROID_HOME` の不足を指摘するが、実機での実行には影響しなかった。
そこで手順書の PC の準備は「最小構成(実機のみ)」と「エミュレータも使う場合」に分けた。Windows では未確認。

### Mac と Windows で同じ設定にするための工夫

- **MCP サーバーの起動**: Windows の Claude Code では、`.mcp.json` の `"command": "npx"` がそのままでは動かず、
  `cmd /c` で包む必要があると報告されている。ところが `cmd /c` で包むと今度は Mac で動かない。
  そこで mobile-mcp を devDependencies に入れ、両方の OS にある `node` で直接起動する。
  あわせて、版は package-lock.json で固定され、起動のたびにダウンロードすることも無くなる
- **npm スクリプト**: 環境変数の付け方が OS で違うので、`scripts/run-android.mjs` で包む

### npm(このリポジトリ)

| パッケージ | 版 | 置き場所 | 用途 |
|---|---|---|---|
| `mobilewright` | 0.0.67(固定) | devDependencies | 再生器の本体と CLI(`test` / `doctor` / `inspect` / `codegen`) |
| `@mobilewright/test` | 0.0.67(固定) | devDependencies | spec を書くためのテストランナー |
| `@mobilenext/mobile-mcp` | 1.0.13(固定) | devDependencies(`.mcp.json` から `node` で起動) | 探索の目と手 |

- **mobile-mcp の SDK は `overrides` で1つだけ上げている**(2026-10-30): 1.0.13 でも `@modelcontextprotocol/node` が
  2.0.0 に固定されていて、`npm audit` で high(GHSA-f897-62hf-6gxq)と、その下の `@hono/node-server` の moderate
  (GHSA-rmxm-3fg6-px4f)が残るため、`package.json` の `overrides` で 2.1.2 に上げた(`@hono/node-server` は 2.1.5 になる)。
  このパッケージは `--listen` で HTTP サーバとして動かすときだけ使われ、`.mcp.json` の stdio 起動では通らない。
  上げたあとも stdio での端末一覧の取得と、localhost での HTTP 起動・初期化が動くことを確認した。
  mobile-mcp 側が 2.1.0 以上に上げたら `overrides` は消す
- 1.0.14 にしなかったのは、追加が MCP クライアントへの登録コマンド(`install`)だけで、そのために依存が2つ
  (`add-mcp` / `@clack/prompts`)増えるため。SDK の版は 1.0.13 と同じ

- OS ごとの端末操作用のバイナリ(mobilecli)は、`npm install` で今の OS に合うものが自動で入る(macOS / Windows / Linux、x64 / ARM)
- どれも 0.0.x〜1.0.x で変化が速いので、`@latest` は使わず版を固定する。上げるときは CHANGELOG を読んでから
- **テレメトリを送るコマンド**: 0.0.67 のソースでは、Mobilewright の `test` / `doctor` / `init` が送信する(`inspect` / `codegen` は送信しない)。
  版が上がると変わりうるので、どのコマンドも `run-android.mjs` 経由で起動する
- **Web だけを使う人にも `npm install` で入る**。Node.js が 22.12 未満だとインストール時に警告が出る(Web のテストはそのまま動く)
- `@mobilewright/test` は `@playwright/test` 1.63.0 に固定で依存している。**実際に入れると、npm が Web 側も
  1.61.1 → 1.63.0 に上げて1つにまとめた**(`^1.60.0` の範囲内)。Web のテストは新しい Chromium が要るので、
  pull した人は `npx playwright install chromium` を1回実行する(`check-setup` が知らせる)。
  1.63.0 で既存の Web の spec(観点28)が通ることは確認済み

### 端末側

- **専用の Android 端末**: 個人の Google アカウントを入れない(画面の内容が AI に渡るのと、アプリのデータが Google ドライブへ自動バックアップされるのを防ぐため)
- **開発者向けオプションと USB デバッグを有効にする**(手順は [android-setup.md](android-setup.md) §3)
- **データ通信ができる USB ケーブル**: 充電専用のケーブルでは認識されない
- **テスト対象アプリのテスト用ビルド(APK)**
- 対応する Android の版は Mobilewright に記載が無い → 導入時に確認する

---

## 3. 使い方

手順書 [android-setup.md](android-setup.md) に移した(2026-10-30)。準備・コマンド・うまくいかないときの対処はそちらを見る。
この文書には、なぜその作りにしたかと確認の記録だけを残す。

---

## 4. 実装の前に決めてほしいこと

| # | 決めること | おすすめ |
|---|---|---|
| 1 | Windows の人は Claude Code と VS Code + Copilot のどちらを使うか | **決定(2026-10-23): Windows も Claude Code だけ。Copilot 側は作らない** |
| 2 | Android 固有の観点(回転・バックグラウンド復帰・プロセスキル・通信断・権限の剥奪など)を今回入れるか | **今回は入れない**。まず28観点で回し、効いた観点を見てから `viewpoints-android.md` として足す |
| 3 | 対象スラッグを `android-<パッケージ名のドットをハイフンにしたもの>` にしてよいか | この形 |

**参考(今回の範囲外)**

- 今の `.mcp.json` の Playwright MCP も `"command": "npx"` のまま。Windows でも Claude Code を使うので、
  同じ理由で Windows では動いていない可能性がある(今の Claude Code で `cmd /c` がまだ必要かは未確認)。
  Windows の人に、Web 版の Playwright MCP が今動いているかを確認してもらい、動いていなければ Android 版と同じく
  `node` での起動に揃える
- Web 版の spec も `tests/generated/` に全対象が並び、対象は `QA_BASE_URL` で切り替えている。
  取り違えの構造は Android と同じなので、Android 版で対象別フォルダの運用がうまくいったら、Web 版にも広げるか検討する

---

## 5. 実装後の確認

作成者の環境は Mac なので、Windows での確認は Windows の人にお願いする。

### 正常に動くこと

| 確認すること | Mac | Windows |
|---|:-:|:-:|
| `npm install` が通る | 実装者 | 要依頼 |
| `npm run android:doctor` で不足が無い | 実装者 | 要依頼 |
| Claude Code を開くと mobile-mcp が接続され、`adb devices` の端末が見える | 実装者 | 要依頼 |
| `npm run test:android -- <target-slug> <spec>` で1本通る(テレメトリ停止の環境変数が付いている) | 実装者 | 要依頼 |
| `npx playwright test` が Android の spec を拾わない | 実装者 | 要依頼 |

### 取り違えない・制限を迂回しない・途中で落ちても戻せること

| 確認すること | Mac | Windows |
|---|:-:|:-:|
| 端末が2台つながっていても、指定した端末だけを操作する。指定が無ければ止まる | 実装者(2台用意できれば) | 要依頼 |
| 別の対象の spec が混在していても、指定した対象だけを実行する。対象アプリが端末に入っていなければ、実行前に止まる | 実装者 | 要依頼 |
| 禁止の操作(クラウド端末・`mobilewright` の直接起動)を求めると拒否され、理由が表示され、`session-log.md` に残る。アプリの削除は承認を求められる | 実装者 | 要依頼 |
| 端末設定を変えた状態で Claude Code を強制終了すると、次に開いたときに知らされ、記録どおりに戻せる | 実装者 | 要依頼 |

---

## 6. 実装中に分かったこと(2026-10-23)

- **`mobile_batch_commands` は、ツール単位の permission を素通りする**: 中に任意のツール(スクショ以外)を並べて実行できるため、
  禁止したクラウド端末系のツールや、承認制にしたアプリのインストール・削除も、batch 経由なら通ってしまう。
  `guard-android.mjs` を batch にも掛け、各ステップのツール名を見て同じ扱いにした
- **mobile-mcp は、端末が無いとクラウド端末を勧める**: `mobile_list_available_devices` が空のとき、
  「クラウド端末を使うかユーザーに聞け」という文言を AI 向けに返す。クラウド系ツールの禁止はこの経路を塞ぐのに効いている。
  手順書にも「従わず、人に端末の接続を頼む」と書いた
- **テレメトリを止めると `get_more_tools` が消える**: 起動して確かめた(ツールは 33 個。`get_more_tools` は無い)
- **mobile-mcp は `node` での直接起動・stdio で動く**: Mac で確認。Windows では未確認(§5)
- **npm audit の指摘(3件)**: mobile-mcp が使う MCP SDK 2.0.0 の、HTTP で待ち受けるときの脆弱性
  (別の利用者のメッセージが混ざる、bearer 認証、メモリ枯渇)。このリポジトリは stdio でしか使わない(`.mcp.json`)ので該当しない。
  直すには mobile-mcp 側の更新が要る(npm の提案する `audit fix --force` は mobile-mcp を 1.0.4 に下げるので取らない)
- **Mobilewright の HTML レポートの出力先は `mobilewright-report/`**(`.gitignore` に追加)
- **端末が無いときの止まり方は確認済み**: 対象スラッグ無し・対象のフォルダ無し・形式違い・端末無し・指定した端末が無い、のいずれも実行前に止まる

### 実機での確認(2026-10-23、Mac + Sony Xperia XQ-BQ42 / Android 13)

題材は端末に最初から入っている Google の時計アプリ(タイマー画面)。結果の spec は
`tests/generated/android/android-com-google-android-deskclock/viewpoint-08-timer-digit-overflow.android.spec.ts`。

| 確かめたこと | 結果 |
|---|---|
| JDK・Android Studio 無し、adb(Homebrew の platform-tools)だけで動くか | **動いた**。`android:doctor` の警告(JDK・`ANDROID_HOME`)は実機では影響なし |
| 端末の承認 | 最初は `unauthorized`。adb を再起動すると端末に許可ダイアログが出直し、通った |
| mobile-mcp で画面を読めるか | 読めた。要素一覧は 1回 0.3 秒ほど。resource-id と読み上げ用の名前(「0 時間」など)が取れた |
| 要素一覧に何が含まれるか | **対象アプリの外も含まれる**。ステータスバーの通知の文言(他のアプリの通知)まで AI に渡る → 端末の通知をオフにする手順を手順書に追加 |
| まとめ押し(`mobile_batch_commands`) | 6回のタップが 0.13 秒で終わる。入力は落ちなかった(3回とも正しい値) |
| 操作直後のスクショ | **更新前の画面が写った**(押した後の値ではなく、1つ前の値)。mobile-mcp は画面の更新を待たないため → 「要素一覧で状態を確かめてから保存する」を手順書に追加 |
| 日本語入力 | `mobile_type_keys` で「画面　ロック😀」(漢字・全角スペース・絵文字)がそのまま入った(設定アプリの検索欄で確認)。Mobilewright の `fill()` は未確認 |
| `uiautomator dump`(adb) | mobile-mcp を使ったあとは失敗した → 画面の構造は mobile-mcp で読む、と手順書に追加 |
| spec の実行 | `npm run test:android -- android-com-google-android-deskclock --device <端末ID>` で2件とも通った(2件で 13.5 秒。各テストの前にアプリを起動し直す) |
| 失敗時のエビデンス | 動画はファイルで残るが、**スクショとビューツリーはレポートの中にしか残らなかった** → `run-android.mjs` が失敗したテストのフォルダに `screenshot-on-failure.png` / `view-tree-on-failure.json` として書き出すようにした |
| 端末設定の記録と復元 | 画面の向きを横にしたまま終了した想定で、次の開始時に縦へ戻った。通常の終了でもフォントサイズが元に戻った |

未確認のまま残っていること: Windows での動作全般、Claude Code から mobile-mcp を MCP として使う流れ
(この確認は同じ起動方法で stdio を直接つないで行った。Claude Code で使うには開き直して承認が要る)、
`/explore-android` を通した自律探索の1セッション。

### テレメトリの確認(2026-10-23、コミット前)

**設定値**

| 場所 | 値 |
|---|---|
| `.mcp.json` の `mcpServers["mobile-mcp"].env` | `MOBILEMCP_DISABLE_TELEMETRY: "1"` / `MOBILEWRIGHT_DISABLE_TELEMETRY: "1"` |
| `scripts/run-android.mjs`(`npm run test:android` / `android:doctor` / `android:inspect` / `android:codegen`) | 同じ2つを `"1"` で付けて Mobilewright を起動する |

インストール済みのコード(mobile-mcp 1.0.12 / Mobilewright 0.0.67)では、どちらも「環境変数に何か値が入っていれば止める」判定
(`if (process.env.MOBILEMCP_DISABLE_TELEMETRY)` / `if (env.MOBILEWRIGHT_DISABLE_TELEMETRY)`)。
`"1"` で止まる。空文字では止まらないので、`check-setup` は空文字も「設定が無い」として知らせる。
送信先は PostHog(`us.i.posthog.com`)と Scarf(`static.scarf.sh`)の2つだけで、どちらの送信もこの判定の後にある。
mobilecli(端末とやりとりする Go のプログラム)にはテレメトリの仕組みが無く、外部の URL はクラウド端末へのログイン用(mobilenext.ai)だけ。

**実際の通信の監視**

Node の外部宛ての通信をすべて記録し、送らずに止める仕掛けを入れて動かした。あわせて、OS 側でも node と mobilecli の外部接続を見張った。
比較用の「止めない」場合も、外部宛てはこの仕掛けで止めているので、実際には送信していない。

| 動かしたもの | 設定 | 外部宛ての通信 | OS から見た外部接続 |
|---|---|---|---|
| mobile-mcp(`.mcp.json` のとおりに起動し、ツールを5つ呼ぶ) | 止める(今の設定) | **0件** | 0件 |
| 同上 | 比較用: env を外す | 7件(PostHog 6件・Scarf 1件。すべて止めた) | 0件 |
| `npm run android:doctor`(送信関数を呼ぶコマンド) | 止める(今の設定) | **0件** | 0件 |
| Mobilewright の送信関数を直接呼ぶ | 止める | **0件** | — |
| 同上 | 比較用: env を外す(ホームは一時フォルダに見立てた) | 2件(PostHog・Scarf。すべて止めた) | — |

- 比較用で通信が記録されることから、監視が働いていることを確かめた。そのうえで、今の設定では0件だった
- Mobilewright は、送信を許可していると、最初の送信の前に `~/.config/mobilenext/mobilewright/config.json` に送信IDを作る。
  このマシンにはこのフォルダが無い = これまでの `npm run test:android` を含め、Mobilewright から送信したことは無い
- さかたさんが実際に動かした `/explore-android` のセッション(12:48〜13:31)の MCP ログでは、ツールは約100回呼ばれ、
  `get_more_tools` とクラウド端末系のツールは一度も呼ばれていない。そのときの mobile-mcp のプロセスはもう終わっていたため、
  環境変数を直接は見られなかった(同じ `.mcp.json` から起動した上の表の1行目で0件を確認)
- mobilecli のデーモン(端末とやりとりする常駐プロセス)は、mobile-mcp が終わっても残る。外部への接続は1本も無く、
  環境変数もテレメトリを止める値を引き継いでいた

**この確認で見つけて直したこと**: `guard-android.mjs` が、`grep` などで `mobilewright/dist/cli.js` を読むだけのコマンドまで止めていた。
`node` でそのファイルを実行する形だけを止めるように直し、16通りのコマンドで判定を確かめた。
