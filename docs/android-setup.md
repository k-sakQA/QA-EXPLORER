# Android 端末でテストする — 準備とコマンド

PC に USB でつないだ Android 端末のネイティブアプリを、`/explore-android` で探索テストするための手順書。
Claude Code 専用(VS Code + Copilot からは使えない)。

- なぜこの作りなのか・制限の効き方・実機での確認結果: [android-support-plan.md](android-support-plan.md)
- エージェントが従う探索手順: [.claude/agents/qa-explorer-android.md](../.claude/agents/qa-explorer-android.md)

---

## コマンド早見表

| やりたいこと | コマンド | 実行する場所 |
|---|---|---|
| 端末が認識されているか見る | `adb devices` | ターミナル |
| 対象アプリのパッケージ名を調べる | `adb shell pm list packages <名前の一部>` | ターミナル |
| テスト用アプリを入れる | `adb install -r path/to/app.apk` | ターミナル(人が実行) |
| 環境の不足を調べる | `npm run android:doctor` | ターミナル |
| 探索テストを始める | `/explore-android package=<パッケージ名> intent=<意図> [device=<端末ID>]` | Claude Code |
| spec をまとめて再実行する | `npm run test:android -- <target-slug>` | ターミナル |
| spec を1本だけ再実行する | `npm run test:android -- <target-slug> <ファイル名の一部>` | ターミナル |
| 端末を指定して再実行する | `npm run test:android -- <target-slug> --device <端末ID>` | ターミナル |
| 要素とロケータをブラウザで見る | `npm run android:inspect` | ターミナル |
| 操作から spec を書き起こす | `npm run android:codegen` | ターミナル |
| レポートを出す | `/qa-explorer-report` | Claude Code |

**target-slug** は `android-` + パッケージ名のドットをハイフンにしたもの。
例: `com.example.shop` → `android-com-example-shop`。spec は `tests/generated/android/<target-slug>/` に置かれる。

Mobilewright(`mobilewright` / `npx mobilewright`)と mobilecli は直接起動しない。上の npm スクリプトだけを使う
(テレメトリを止め、対象アプリと端末を確かめてから動かすため。直接起動はフックで止められる)。

---

## 1. 必要なもの

| もの | 内容 |
|---|---|
| PC | macOS、または Windows 11 |
| Node.js | 22.12 以上 |
| adb | Android SDK の platform-tools。実機だけならこれだけで動く(Mac で確認済み。Windows は未確認) |
| JDK・Android Studio | エミュレータも使う場合、または adb だけで動かなかった場合 |
| USB ドライバ | Windows のみ。Pixel は Google USB Driver、ほかは端末メーカーが配布するもの |
| Android 端末 | 個人の Google アカウントを入れていないもの。他の開発中アプリが入っていてもよい(§6 の決まりを守る) |
| USB ケーブル | **データ通信ができるもの**。充電専用のケーブルでは認識されない |
| テスト用アプリ | 対象アプリのテスト用ビルド(APK) |

---

## 2. 初回だけ: PC の準備

### 2.1 最小構成(実機のみ)

adb だけを入れる。

- Mac

  ```bash
  brew install --cask android-platform-tools
  ```

- Windows: [SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools) を展開し、そのフォルダを `Path` に追加する。
  あわせて端末メーカーの USB ドライバを入れる

入れたら §2.3 へ進む。`npm run android:doctor` が JDK と `ANDROID_HOME` の不足を指摘しても、実機での実行は動く。

### 2.2 エミュレータも使う場合、または最小構成で動かなかった場合

**Mac**

1. JDK を入れる(JDK 11 以上なら配布元は問わない)

   ```bash
   brew install --cask temurin@21
   ```

2. Android Studio を入れ、SDK Manager から platform-tools などを入れる
3. `~/.zshrc` に環境変数を書き、ターミナルを開き直す

   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$ANDROID_HOME/platform-tools:$PATH
   ```

4. Homebrew で adb を入れていたら外す(adb が2つあると接続が切れることがある。SDK の adb に揃える)

   ```bash
   brew uninstall --cask android-platform-tools
   ```

**Windows**

1. JDK を入れる

   ```powershell
   winget install EclipseAdoptium.Temurin.21.JDK
   ```

2. Android Studio を入れ、SDK Manager から platform-tools などを入れる。
   端末が Pixel なら「SDK Tools」タブで「Google USB Driver」も入れる。ほかのメーカーの端末は、そのメーカーの USB ドライバを入れる

   ```powershell
   winget install Google.AndroidStudio
   ```

3. 「システム環境変数の編集」→「環境変数」で、ユーザー環境変数を設定し、ターミナルと Claude Code を開き直す

   | 変数 | 値(既定のインストール先の場合) |
   |---|---|
   | `JAVA_HOME` | `C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot`(入った版のフォルダ) |
   | `ANDROID_HOME` | `%LOCALAPPDATA%\Android\Sdk` |
   | `Path` に追加 | `%LOCALAPPDATA%\Android\Sdk\platform-tools` |

4. 端末メーカーの管理ソフトなどで別の adb が入っていたら、PATH の上で SDK の adb が先に見つかるようにする

### 2.3 共通

1. 依存を入れる

   ```bash
   npm install
   ```

2. 環境を確かめる(不足があれば、何をすればよいかが表示される)

   ```bash
   npm run android:doctor
   ```

3. Claude Code を開き直す。`.mcp.json` の mobile-mcp が読み込まれる(初回は MCP サーバーの承認を求められる)
4. **mobilenext.ai にはログインしない**。クラウド端末を使わないため(未リリースのアプリを外に出さない)

---

## 3. 初回だけ: 端末の準備

1. **開発者向けオプションを出す**: 設定 → デバイス情報(端末情報)→「ビルド番号」を7回タップ(メーカーによって場所が少し違う)
2. **USB デバッグを有効にする**: 設定 → システム → 開発者向けオプション →「USB デバッグ」を ON。
   「スリープモードにしない(充電中は画面をスリープにしない)」も ON にしておくと、テスト中に画面が消えない
3. **アニメーションをオフにする**: 開発者向けオプションの「ウィンドウ アニメスケール」「トランジション アニメスケール」
   「Animator 再生時間スケール」をオフにする。アニメーション中は画面の読み取りが失敗しやすい
4. **画面ロックを無しにする**。ロック画面で止まるとテストが進まない
5. **PC と USB ケーブルでつなぐ**。端末に「USB デバッグを許可しますか?」と出たら、
   「このパソコンからの USB デバッグを常に許可する」にチェックして許可する
6. **認識されたか確かめる**

   ```bash
   adb devices
   ```

   `XXXXXXXX	device` と出れば OK。左の `XXXXXXXX` が端末 ID(複数台つなぐときに `device=` / `--device` で指定する)。
   `unauthorized` や何も出ないときは §7 へ

7. **テスト用アプリを入れる**(人が実行する。AI が実行するときは承認を求められる)

   ```bash
   adb install -r path/to/app.apk
   ```

8. **パッケージ名を調べる**(`/explore-android` に渡す)。名前の一部で絞り込める

   ```bash
   adb shell pm list packages shop
   ```

9. **ログインが必要なアプリは、人が端末上でテストアカウントでログインしておく**。
   Web 版の `npm run auth` に当たる手順。AI にはパスワードを入力させない

---

## 4. 毎回: 探索テストを走らせる

### 4.1 始める前に

- 端末の通知をオフにする(おやすみモードなど)。対象アプリを前面に出していても、ステータスバーの通知の文言まで
  要素一覧に入り、AI に渡るため
- `adb devices` で端末が `device` になっていることを確かめる
- 顧客案件は、企業が契約している LLM のアカウント(または API キー)で Claude Code にログインしてから始める

### 4.2 コマンド

Claude Code で実行する。`device=` は、端末を1台だけつないでいるなら省略できる。

```
/explore-android package=com.example.shop device=XXXXXXXX intent=カートから購入確定までを中心に
```

- `intent=` は Web 版の `/explore` と同じく、ざっくりでよい(「広く浅く」など)。省略すると「広く浅く」になる
- `package=` が分からないまま実行すると、調べ方を示して止まる

### 4.3 走っている間

エージェントは次の順に進める。**進んでいる間は端末に触らない**。

1. 端末を1台に決め、対象アプリが入っているかを確かめる。複数台つながっていて `device=` が無ければ、止まって聞く
2. 前回の端末設定の記録が残っていれば、先に元に戻してから知らせる。そのうえで今回の開始時の設定を記録する
3. target-slug を作り、findings / coverage / session-log を用意する(2回目以降は前回の続きから)
4. アプリを起動し、画面を見て観点ごとに欠陥仮定を立て、spec を書いて実行する
5. バグ・Finding・Hypothesis を `reports/<target-slug>/` に記録する。スクショ・動画は `evidence/` に保存する
6. 終了時に、記録しておいた端末設定に戻す

---

## 5. spec を再実行する

target-slug の指定は必須(全対象をまとめて実行する手段は無い。別の案件の spec を取り違えて走らせないため)。

```bash
npm run test:android -- android-com-example-shop
```

1ファイルだけ実行する(ファイル名の一部で絞り込める)。

```bash
npm run test:android -- android-com-example-shop viewpoint-09
```

端末を複数つないでいるときは、端末 ID を指定する(指定が無いと実行前に止まる)。

```bash
npm run test:android -- android-com-example-shop --device XXXXXXXX
```

- 対象アプリが指定した端末に入っていなければ、実行前に止まる
- 失敗時のスクショ・動画・ビューツリーは `test-results-android/` に出る。**次の実行で消える**ので、
  残したいものは `reports/<target-slug>/evidence/` に移す

### 補助ツール(必要なときだけ)

- **Inspector**: 端末の画面と各要素のロケータをブラウザで確かめる。spec のセレクタを人が確かめたいときに

  ```bash
  npm run android:inspect
  ```

- **Codegen**: ブラウザ上で端末を操作すると、spec が書き起こされる

  ```bash
  npm run android:codegen
  ```

---

## 6. 守ること

- **対象アプリ以外の画面を撮らない・保存しない**: ホーム画面・他のアプリ・通知欄・最近使ったアプリ。
  端末には他の開発中アプリも入っているため。エージェントは撮る前に前面のアプリを確かめる
- **mobilenext.ai にログインせず、API キーも置かない**: クラウド端末に繋がらないようにする最後の砦
- **Mobilewright・mobilecli を直接起動しない**: npm スクリプト経由でだけ使う(テレメトリ停止のため)
- **本物の認証情報を AI に入力させない**: ログインは人が端末上で済ませておく

---

## 7. うまくいかないとき

| 症状 | 対処 |
|---|---|
| `adb devices` が `unauthorized` | 端末の許可ダイアログを確かめる。出ていなければ `adb kill-server` → `adb devices` で出直す |
| `adb devices` に何も出ない | ケーブルがデータ通信に対応しているか、USB デバッグが ON かを確かめる。Windows では USB ドライバも(デバイス マネージャーで「!」が付いていないか) |
| `adb server version ... doesn't match` | adb が2つ入っている。SDK の adb だけが PATH で見つかるようにする(§2.2) |
| `npm run android:doctor` が JDK・`ANDROID_HOME` の不足を言う | 実機だけなら無視してよい。エミュレータを使うなら §2.2 |
| Claude Code に mobile-mcp のツールが出ない | Claude Code を開き直し、MCP サーバーを承認する。`npm run setup:check` で設定漏れを確かめる |
| `npm run test:android` が実行前に止まる | 表示された理由のとおり。多いのは target-slug の指定忘れ、複数台で `--device` 無し、対象アプリが端末に入っていない |
| 前回の端末設定が戻っていないと知らされた | 途中で終わったセッションの記録が `.android-state/` に残っている。次の `/explore-android` の開始時に戻される |

---

## 8. 案件が終わったら

- テスト用アプリを端末から消す
- `.android-state/` に、その端末の記録が残っていないことを確かめる(残っていれば、戻っていない設定がある)
- Claude Code の会話履歴の該当セッションを削除する(Mac: `~/.claude/projects/`、Windows: `%USERPROFILE%\.claude\projects\`)
