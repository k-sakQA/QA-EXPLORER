# Android 実機(adb)版 QA Explorer — 実現可能性メモ

- 作成日: 2026-10-23
- 状態: 机上調査のみ(端末を使った PoC は未実施)

## 結論

- **実現できる。** 28観点のループ(findings / Probe / coverage / 障害解析の鉄則)はそのまま流用でき、
  差し替えが必要なのは「目(画面の理解)・手(操作)・再生器(spec)」の3層だけ。
- **「画面を認識しながら自動でテストを進める」部分は、目と手の差し替えだけで成立する**(§1.0)。
  脳(観点選択・欠陥仮定・判定・ナレッジ蓄積)は Web 版のまま使える。
- ただし **spec(回帰資産)は目と手だけでは作れない。** adb には待機もアサーションも無いため、
  spec が「座標タップと sleep の羅列」になり、「テストコードには What」が書けない。
  再生器の第一候補は **Mobilewright**(mobile-mcp と同じ mobile-next 製の、Playwright Test を拡張したモバイル版)。
  `getByRole` / `expect` / `--reporter=list` がそのまま使えるので、spec の形が現行とほぼ変わらない(§3)。
- 大きな壁は3つ。いずれも回避策はあるが、**対象アプリのテスト用ビルド(debuggable)を入手できるかどうか**で
  難しさが大きく変わる。
  1. 日本語入力(`adb shell input text` は ASCII 以外を入力できない。Mobilewright なら解消する見込み)
  2. ネットワークとアプリ内部の状態が見えない(Web 版の DevTools・network_requests に当たるものが無い)
  3. 認証状態を保存・復元する仕組み(`storage/auth.json` に当たるもの)が無い

## 決定事項(2026-10-23)

- **画面は AI にすべて見せる**(§9.3 の段階C)。LLM に渡る情報の機密は、企業が契約している LLM の契約に委ねる。
  そのため、顧客案件はその契約下のアカウント(または API キー)で Claude Code を使う。
  契約が守るのは LLM の経路だけなので、それ以外の経路(ツールの開発元・公開リポジトリ・ローカル・端末)はこちらで塞ぐ(§9.4)
- **`MOBILEMCP_DISABLE_TELEMETRY=1` は必須**。spec を実行するときの `MOBILEWRIGHT_DISABLE_TELEMETRY=1` も合わせて入れる
- **再生器は Mobilewright を軸にする**。決め手は再実行できること
- **CI(GitHub Actions 等)には載せない**。実行に時間がかかる前提なので、CI とは別軸で手元の Mac + 専用端末で回す
- **スクショ・動画は知見として残す**。findings の Finding / Hypothesis とバグレポートから参照し、
  `/qa-explorer-report` は Web と同じ扱いで、Android のための拡張はしない(§10)

---

## 0. スコープ

ネイティブアプリのみ。Android の Web ブラウザ(Chrome)は対象外(2026-10-23 決定)。

| アプリの作り | 目(ツリー)の効き方 |
|---|---|
| ネイティブ(View / Jetpack Compose) | 効く。Compose は testTag / contentDescription が付いているほど精度が上がる |
| React Native | 概ね効く(accessibilityLabel / testID の付け方次第) |
| Flutter | Semantics が付いていないとツリーがほぼ空 → PoC で確認が必要 |
| アプリ内の WebView 部分 | ツリーに出ないことがある → スクショで補う |
| ゲーム(Unity 等) | ツリーが取れず、スクショと座標タップ頼みになる。探索の質が大きく落ちるので非推奨 |

## 1. 層ごとの置き換え

### 1.0 目と手の仕組み(なぜ差し替えで動くか)

Web 版の探索は「見る → 決める → 操作する → また見る」の繰り返しで、
Playwright MCP はそのうち「見る」と「操作する」だけを担っている。Android でも同じ形が作れる。

| | Web 版 | Android 版 |
|---|---|---|
| 見る | ARIA スナップショット(`textbox "氏名"` / `button "予約内容を確認する"`) | `uiautomator dump` の XML。要素ごとに `text` / `resource-id` / `content-desc` / `clickable` / `bounds`(画面上の矩形)が出る |
| 決める | エージェント(観点・欠陥仮定) | **変更なし** |
| 操作する | `click(ref)` | 対象要素の `bounds` の中心を `adb shell input tap x y` |
| 結果を見る | 再スナップショット + `expect` | 再 dump(エラー文言が出たか・画面が変わったか)+ `logcat`(クラッシュしたか) |

ツリーで名前が取れない要素は、スクショを LLM が直接読んで座標で押す(mobile-mcp はこの切替えを自動で行う)。

**目が見落とすもの**(観点の判定に直結するので要注意):

- **Toast はツリーに出ない**。エラーを Toast で出すアプリでは、観点02(エラー表示)の判定を dump だけに頼れない
  → 操作直後のスクショで補う
- アニメーション・動画・ローディング表示が動いている間は dump が失敗する
- 名前の無いアイコンボタン(スクショ頼みになる。同時にアクセシビリティの欠陥として記録できる)

### 層ごとの対応表

| 層 | Web 版(現行) | Android 版 | 難しさ | 補足 |
|---|---|---|:-:|---|
| 目: 画面の理解 | `browser_snapshot`(ARIA ツリー) | `uiautomator dump`(XML)の text / content-desc / resource-id | 中 | アニメーション中は dump が失敗する(`could not get idle state`)。content-desc の無いアイコンボタンは名前無しで出る(それ自体がアクセシビリティの欠陥でもある) |
| 手: 操作 | click / type / select | `input tap` / `swipe` / `keyevent` / `text` | 低〜高 | タップ・スワイプは簡単。**日本語入力が壁**(§1.1) |
| 再生器: spec | `@playwright/test` | Appium + WebdriverIO / Maestro / 生の adb スクリプト | 要選定 | §3 |
| 証拠 | trace / スクショ | `screencap` / `screenrecord`(最大3分)/ `logcat` | 低 | `logcat -b crash` でクラッシュを機械的に検出できる点は Web 版より強い |
| 認証状態 | `storage/auth.json` | 相当するものが無い | 中〜高 | 専用端末にログイン状態を残しておく / エミュレータのスナップショット / debuggable ビルドなら `run-as` で shared_prefs を退避・復元 |
| ネットワーク観測 | `browser_network_requests` | 原則見えない | 高 | mitmproxy 等のプロキシを挟むには、アプリ側でユーザー CA を信頼する設定(network_security_config)が必要 = 開発チームの協力が要る |
| 内部状態 | DevTools(sessionStorage 等) | アプリ専用領域は見えない | 高 | debuggable ビルドなら `run-as` で読める |

**内部状態が見えないと何を失うか**: 2026-10-21 に起票した
「ダブルクリックで使われない予約データが sessionStorage に残る」(観点24)は、
DevTools で sessionStorage を見て初めて分かったバグ。アプリで同種の
「画面には出ないが端末内に残る個人情報」を狙うには、debuggable ビルドが前提になる。

### 1.1 日本語入力の壁(観点03・09 に直撃)

- `adb shell input text` は ASCII 以外を入力できない。全角・漢字・絵文字が打てない
- Maestro の `inputText` も Android では Unicode 非対応(公式の Known Issues に記載)
- 回避策
  - ADBKeyBoard: IME を差し替え、ブロードキャストで文字列を送る(Base64 で送る方式あり)
  - Appium(UiAutomator2)の `sendKeys`: 要素に直接テキストを設定するので日本語も入る
  - Mobilewright の `fill()`: 端末内のエージェントが ACTION_SET_TEXT で欄の文字列を丸ごと置き換える。
    ソースコード(mobilecli の `agents/android/java/Input.java`)に「任意の Unicode を入れられる」とあり、
    日本語・全角スペース・絵文字は入る見込み(実機では未確認)
- **注意**: どれも IME の変換を通らない。また文字列を一括で設定するので、入力のたびに整形する欄
  (電話番号の自動ハイフン等)は、1文字ずつ打った場合と結果が変わることがある。「変換確定前の Enter で送信される」
  「変換中に文字数カウンタがずれる」のような IME 起因の欠陥は自動では狙えない → `manual-tests.md` 行き

## 2. MCP の候補(2026-10 時点)

| MCP | 仕組み | 向いている用途 |
|---|---|---|
| [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp) | ツリーを優先し、取れなければスクショ+座標。1.0.12 は内部で Mobilewright 0.0.67 を使う(端末側の仕組みは Mobilewright と共通)。iOS も可 | **探索の第一候補**。「adb の MCP」という発想に一番近く、Playwright MCP に近い使い勝手 |
| [Maestro MCP](https://maestro.dev/mcp)(CLI 同梱、`maestro mcp`) | ビュー階層の取得・操作・flow の実行 | 「探索 → flow 化 → 再実行」が1本の道具で繋がる |
| appium/appium-mcp(公式) | UiAutomator2 経由 | セットアップは重いが、できることが一番多い。日本語入力も可 |
| [CursorTouch/Android-MCP](https://github.com/CursorTouch/Android-MCP) など adb 直叩き系 | adb + Accessibility API | 軽いが、再生器は別に用意する必要がある |

Mobilewright は MCP ではなくテストフレームワーク(§3)。Mobilewright 自体の MCP はロードマップ上 Planned。
エージェント向けの省トークン CLI(`@mobilewright/cli`)もあるが、まだ説明がほとんど無い。

## 3. 再生器(Playwright spec の代わり)の選択

**なぜ生の adb では足りないか**: 待機とアサーションを自前で書くことになり、テストの不安定さが
そのまま「実装のバグか、テストの誤りか」の判定を濁らせる。`loop-rules.md` の
「障害解析の鉄則」(最初の異常は何か、を遡る)と相性が悪い。

| | Mobilewright | Appium + WebdriverIO(TS) | Maestro(YAML) | 生の adb + シェル |
|---|:-:|:-:|:-:|:-:|
| What の読みやすさ | ◎ Playwright とほぼ同じ(`getByRole` / `expect(...).toBeVisible()`) | ○ Playwright に近い | ◎ 宣言的(`tapOn` / `assertVisible`) | ✕ 座標と sleep |
| 自動待機 | ◎ 組込み | △ 明示的に待つ | ◎ 組込み | ✕ |
| 日本語入力 | ○ 入る見込み(ソースで確認、実機は未確認) | ◎ | ✕(Android は非対応) | △ ADBKeyBoard |
| ランナー・レポート | ◎ Playwright Test の拡張(list / html / junit、失敗時のスクショ・動画) | ○ WDIO 独自 | ○ 独自 | ✕ |
| セットアップ | ○ JDK 11+ + Android SDK | △ JDK + Android SDK + Appium | ○ CLI + Java | ◎ adb のみ |
| 成熟度 | △ 0.0.67(2026-10-18)。数日おきにリリース | ◎ | ○ | − |

**暫定のおすすめ: 再生器は Mobilewright、探索は同じ作者の mobile-mcp。**

- **理由**: `@mobilewright/test` は Playwright Test の拡張なので、`tests/generated/viewpoint-NN-*.spec.ts` の命名、
  `test()` の名前で仕様を語る書き方、`--reporter=list` での実行、role/name を優先するセレクタの方針が**ほぼそのまま移せる**。
  エージェント定義の変更は「`npx playwright test` → `npx mobilewright test`」程度で済む
- **不安材料**
  - 0.0.x なので破壊的変更がありうる → `.mcp.json` の `@playwright/mcp@0.0.83` と同じくバージョンを固定する
  - トレースビューア・ネットワーク傍受・クラッシュ検出はまだ無い(ロードマップ上 Planned / In Progress)。
    障害解析は、失敗時のスクショ・動画・ビューツリー(`viewTree: 'on-failure'`)と logcat で補う
  - 1つのテストの中で複数端末を扱う方法は記載が無い → 観点19〜22は別の手段が必要
  - Toast の扱いは記載が無い → PoC で確認する
- **代替**: Mobilewright が PoC で詰まったら Appium + WebdriverIO。生の adb は、回転・通信断・プロセスキルなど
  「再生器が苦手な端末操作」の補助に限定する

## 4. 28観点の移植可否

| 判定 | 観点 | 補足 |
|---|---|---|
| ◎ ほぼそのまま | 02, 04, 05, 06, 07, 08, 10, 11, 13, 14, 15, 17, 18, 23, 26 | 画面の中で完結する。13 の「ブラウザの戻る」は端末の戻る操作(`KEYCODE_BACK` / ジェスチャー)に読み替え |
| ○ 入力手段が決まれば可 | 03, 09 | §1.1 |
| △ 読み替えが必要 | 01 | 画面幅3種 → 端末サイズ・回転・フォントサイズ・表示サイズ(`wm size` / `wm density`)。むしろ観点が増える |
| | 12 | 連打は adb の往復遅延で「速い連打」にならない → 1回の `adb shell` 内で2連続タップする。通信遅延の再現はエミュレータのみ |
| | 16 | Web 版では N/A だったが、アプリでは**適用対象になる**(強制終了 → 再起動、プロセスキル → 復帰) |
| | 24 | 永続データ側の確認が画面経由のみ。端末内の残留データは debuggable ビルドが無いと見えない |
| | 25 | 「2タブ」に当たるものが無い → 2台、またはアプリ + Web で代替 |
| | 27 | `page.clock` に当たるものが無い。実機は root 無しだと adb から時刻を変えられない機種が多い(要確認)、エミュレータなら可。一方で「端末時刻を変えても判定が変わらない」はアプリの方が現実的なリスク(ユーザーが時刻を変えられる) |
| | 28 | 画面上の可否は確認できるが、ID 差し替え・API 直叩きは adb ではできない → プロキシか `manual-tests.md` |
| ✕ → 構成を足せば可 | 19, 20, 21, 22 | 2台を接続して `adb -s <serial>` で使い分ければ可能 |

**観点21(別デバイス)は、Playwright MCP(PC の Web)+ adb(スマホのアプリ)を併用すればそのまま自動化できる。**
現行構成を置き換えるより、**足す**方が価値が出る観点。

## 5. Android 版で増える観点(28観点に無いもの)

- 回転・端末サイズ・フォントサイズ・ダークモード
- バックグラウンド → 復帰、プロセスキル後の復元(開発者オプション「アクティビティを保持しない」)
- 通信断・機内モード(`svc wifi disable` 等)
- 権限の拒否・後からの剥奪(`pm revoke`)
- ディープリンク(`am start -d`)からの途中参入
- クラッシュ / ANR の検出(logcat)

`viewpoints.md` は読み取り専用なので、加えるなら `viewpoints-android.md` を別ファイルで置く案(要判断)。

## 6. 運用上のリスクと、変える必要があるルール

- **私物の端末は使わない**: ツリーやスクショに通知・他アプリの内容が載り、LLM に送られる。
  CLAUDE.md の「本物の個人情報は使わない」に抵触しうる → 専用のテスト端末かエミュレータを使う
- **adb shell の権限が強すぎる**: `pm uninstall` / `pm clear` / `rm` / `settings put` まで通る。
  Claude Code の permission で、許可を `input` / `uiautomator dump` / `screencap` 等に絞り、破壊系は都度承認にする
- **「破壊的リクエスト」の線引きを作り直す**: Web 版は HTTP メソッド(POST/PUT/DELETE)で線を引けたが、
  アプリではタップがどの API を呼ぶか見えない → 「確定・送信・削除・購入ボタンの押下は許可制」という画面単位のルールに書き換える
- **端末設定の後片付け**: `wm size` / フォントサイズ / 機内モード等を変えたら必ず戻す。戻し忘れると次のセッションの前提が狂う
  → `loop-rules.md` の「セッション終了時」に項目を足す
- **外部への送信と機密情報の扱い**: §9
- **速度とトークン**: dump は1回1〜3秒、XML は冗長。Web 版より1イテレーションが遅く、トークンも多い見込み(PoC で計測する)

## 7. 現在の環境(2026-10-23 確認)

- adb: Homebrew の platform-tools 36.0.0 が入っている
- 接続中の端末: なし
- Android SDK / エミュレータ / Maestro / Appium: 未導入
- JDK: 未導入(Mobilewright には JDK 11 以上と、`ANDROID_HOME` を設定した Android SDK が必要)
- Node.js: v24.22.1(Mobilewright の要件 22.12 以上を満たす)

## 8. 次の一手(PoC 案)

### 進め方

再生器を Mobilewright に決めたので、spec 無しのフェーズは挟まない。最初から Web 版と同じ
「MCP で見る → spec を書く → 実行する」の形で作る。
`qa-explorer.agent.md` で Web に依存しているのは次の3か所で、Android 版ではここだけを置き換える。

| Web 版 | Android 版 |
|---|---|
| Step 3 対象URLにアクセス(Playwright MCP でスナップショット) | パッケージ名でアプリを起動し、mobile-mcp でツリーを取る |
| Step 3 Playwright の spec を生成 | `@mobilewright/test` の spec を生成(ファイル名・書き方は同じ) |
| Step 4 `npx playwright test <spec> --reporter=list` | `npx mobilewright test <spec> --reporter=list`(テレメトリ停止の環境変数付き) |

実行は CI とは別軸で、手元の Mac + 専用端末で回す(CI には載せない)。

### PoC の手順

1. 専用端末(USB デバッグ ON)かエミュレータを用意する
2. mobile-mcp を `.mcp.json` に追加し、対象アプリの1画面で、読み取り中心の探索を1セッション行う
3. Go / No-Go の基準
   - 主要画面の操作対象のうち、ツリーから名前(text / content-desc / resource-id)で特定できるものが 8割以上
   - 全角スペース・漢字・絵文字を入力欄に入れる手段が1つ確立する
   - 観点1つ(3ケース)のイテレーションが、現行 Web 版の2倍以内の時間で回る
   - Mobilewright の spec で、全角スペースのみの入力 → エラー表示の確認(観点09)が書けて、安定して通る
4. 通ったら再生器を Mobilewright に決める。詰まったら Appium + WebdriverIO を同じ画面に当てて比べる
   → `qa-explorer-android.agent.md` を分けて作る(`loop-rules.md` と findings の構造は共有)

### PoC の前に決めたいこと(対象アプリ側)

- 対象アプリの種類(ネイティブ / Flutter / React Native / WebView)
- debuggable なテスト用ビルドを入手できるか(内部状態の観測・プロキシ・認証状態の退避ができるようになる)
- テスト用アカウントと検証環境があるか

---

## 9. 機密情報(顧客の未リリースアプリ)の観点での比較

2026-10-23 時点のソースコード(mobile-mcp 1.0.12 / Mobilewright 0.0.67 / mobilecli)を読んで確認した。

**前提: 2つは競合ではない。** mobile-mcp は内部で Mobilewright を使っていて、端末側の仕組み
(mobilecli と端末内のエージェント)は共通。違いは**誰が画面を見るか**。

- mobile-mcp: **LLM が画面を見る**(探索の目と手)
- Mobilewright: **ローカルで spec を実行する**(再生器)。実行中に画面の内容が LLM に渡ることは無い

つまり機密の観点で本当に決めるべきことは「どちらのツールか」ではなく、
**「未リリースアプリの画面を AI に見せてよいか」**。AI に探索させる限り、どのツールでもこの経路は残る。

### 9.1 データの行き先

| 行き先 | mobile-mcp | Mobilewright |
|---|---|---|
| LLM(Anthropic) | **操作のたびに、ツリー(画面の文言すべて)とスクショが渡る**。最大の経路 | 実行中は渡らない。渡るのはエージェントが読んだもの(実行結果のテキスト、失敗の調査で開いたスクショ・ビューツリー) |
| ツールの開発元(PostHog / Scarf) | 匿名テレメトリが既定で ON。ツール名・所要時間・端末数・スクショのサイズ・利用クライアント名・ホスト名のハッシュ。**さらに `get_more_tools` というツールがあり、LLM が書いた自由記述(やりたいこと)がそのまま開発元に送られる**。LLM がアプリ名や未リリース機能の説明を書き込む可能性がある | 匿名テレメトリが既定で ON。中身は `mobilewright test` の開始・終了と成否、OS、バージョンだけ |
| mobilenext.ai(クラウド) | ローカル端末だけなら使わない | クラウド端末用ドライバはテストレポートを既定でアップロードする(`testResult.uploadReport: 'off'` で停止)。ローカル端末だけなら関係しない |
| 同じネットワークの他人 | 共通: Mobilewright が起動する mobilecli サーバーと Inspector は localhost のみで待ち受ける。mobile-mcp は HTTP モードを使わず stdio で使う | 同左 |
| ローカルのディスク | Claude Code の会話履歴(`~/.claude/projects/` 配下)に、ツリーとスクショがそのまま残る | `test-results/` とレポートに、スクショ・動画・ビューツリーが残る |
| GitHub(このリポジトリは公開) | バグレポート・エビデンス | 同左 + spec(画面の文言が入る) |

### 9.2 メリット・デメリット

**mobile-mcp**

- メリット
  - 初めて見る画面でも AI が見て操作できる。**自律探索ができるのはこちらだけ**
  - ツリーを優先するので、スクショ無しで進められる場面が多い
  - 1.0 系で、利用者も多い
- デメリット
  - 画面の文言と見た目が、操作のたびに LLM に渡る
  - テレメトリを ON のままにすると、`get_more_tools` 経由で自由記述が開発元に渡る
  - 公式の導入手順が `@latest`(起動のたびに最新版を取ってくる)。サプライチェーン攻撃を受けた版が、未リリースアプリの画面を読める位置で動くことになる
  - 結果は会話として残るだけで、再実行できない。1手ごとにトークンと時間がかかる
  - ディープリンクは既定で拒否される(`MOBILEMCP_ALLOW_UNSAFE_URLS=1` が必要)

**Mobilewright**

- メリット
  - 実行はローカルで完結し、実行中は LLM に何も渡らない
  - テレメトリは最小限(イベント名と成否のみ)
  - 再実行できる。Playwright Test 互換
- デメリット
  - 画面を知っている誰か(人、または mobile-mcp で画面を見た AI)が居ないと spec を書けない。**単独では探索できない**
  - 0.0.x で変化が速い
  - spec そのものに画面の文言が入るので、置き場所の管理が要る
  - トレース・ネットワーク傍受がまだ無い

### 9.3 運用案: 顧客の許可に合わせて3段階

最初に顧客へ確認すること: **「未リリースアプリの画面情報(文言・スクショ)を、外部の AI サービス(Anthropic)で処理してよいか」**。
答えに合わせて段階を選ぶ。

| 段階 | 使い方 | LLM に渡るもの | 失うもの |
|---|---|---|---|
| A: 画面を AI に見せない | 人が Inspector(ローカル)でロケータを確認し、AI は共有を許されたテスト設計書から spec を書く。実行は Mobilewright | テスト設計書、人が渡したロケータ、実行結果 | 自律探索(このプロジェクトの核) |
| B: 文言だけ見せる | mobile-mcp のスクショ系ツール(`mobile_take_screenshot` 等)を Claude Code の permission で deny し、ツリーだけで探索 | 画面の文言と構造 | 見た目の検証(観点01)、Toast、名前の無い要素の操作 |
| C: すべて見せる | mobile-mcp をフルに使う | 文言 + スクショ | なし |

**決定: 段階C**(2026-10-23)。LLM の経路の機密は、企業が契約している LLM の契約に委ねる。

### 9.4 どの段階でも入れる設定

- **テレメトリを両方止める(必須)**: `MOBILEMCP_DISABLE_TELEMETRY=1`(これで `get_more_tools` 自体が消える)と
  `MOBILEWRIGHT_DISABLE_TELEMETRY=1`。`.mcp.json` の env と、spec を実行する npm スクリプトに書き込み、
  人が毎回付け忘れない形にする。`npm run setup:check` で `.mcp.json` に入っているかを確認できるようにする
- **クラウド端末系のツールを禁止する**: mobile-mcp の `mobile_login_to_cloud_provider` / `mobile_allocate_remote_device` 等は、
  未リリースのアプリを mobilenext.ai の端末へ送る経路になる。Claude Code の permission で deny する。
  `mobile_install_app` / `mobile_uninstall_app` は都度承認にする
- **バージョンを固定する**: `@mobilenext/mobile-mcp@1.0.12` / `mobilewright@0.0.67`。`@latest` は使わない。
  上げるときは CHANGELOG を読んでから
- **企業契約のアカウントで使う**: 顧客案件は、企業が契約している LLM のアカウント(または API キー)で
  Claude Code にログインして実行する。個人アカウントのままだと契約の外になる
- **会話履歴を消す**: 案件が終わったら `~/.claude/projects/` 配下の該当セッションを削除する
  (セッション終了時に認証ファイルの削除を提案している手順と同じ扱いにする)
- **`.gitignore` に足す**: 顧客の `reports/` / `qa-knowledge/targets/` / `tests/generated/` は既に除外済み。
  Android 用に足すのは `*.apk` / `*.aab`(未リリースのアプリ本体)、顧客ごとの `mobilewright.*.config.ts`、
  Mobilewright の出力先 `test-results-android/`(§10)とレポートの出力先(既定の名前は導入時に確認)
- **端末**: 個人の Google アカウントを入れない専用端末にする(アプリのデータが Google ドライブへ自動バックアップされるのを防ぐ)。
  案件が終わったら初期化する

---

## 10. エビデンスを知見とレポートにつなぐ流れ

Web 版のルールをそのまま使う: エビデンスは `reports/<target-slug>/evidence/` に置き、
バグレポートと findings の `Evidence:` 行からこのパスで参照する。Android で変わるのは次の点。

**Mobilewright の出力は次の実行で消える見込み**: Playwright Test は `test-results/` を実行のたびに作り直す
(Mobilewright でも同じかは導入時に確認)。バグや Finding の根拠にするものは、その場で `evidence/` に移す。

| 証拠 | 出どころ | evidence/ での名前 | 何の根拠にするか |
|---|---|---|---|
| スクショ(PNG) | spec 実行: Mobilewright の失敗時スクショ / 探索: mobile-mcp の `mobile_save_screenshot` | `YYYY-MM-DD-vNN-<slug>.png` | 見た目・Toast・エラー表示 |
| 動画(MP4) | spec 実行: `video: 'retain-on-failure'` / 探索: `mobile_start_screen_recording` | `YYYY-MM-DD-vNN-<slug>.mp4` | 連打・遷移・タイミング(観点12・24・25) |
| ビューツリー(JSON) | spec 実行: `viewTree: 'on-failure'` | `YYYY-MM-DD-vNN-<slug>.viewtree.json` | どの文言が出ていたか、どの要素に名前が無いかを文字で示す。差分も取れる |
| クラッシュ・ログ(テキスト) | 探索: `mobile_list_crashes` / `mobile_get_crash` / `mobile_get_device_logs` | `YYYY-MM-DD-vNN-<slug>.crash.txt` | クラッシュ・ANR |

- 探索中に `mobile_take_screenshot` で見た画面は、LLM の会話の中にしか無い。
  Finding の根拠にするものは `mobile_save_screenshot` でファイルに保存してから `Evidence:` に書く
- 動画は重いので、バグとして起票するものだけ残す
- 顧客の `reports/` は `.gitignore` で除外済みなので、evidence/ に置いても公開リポジトリには入らない

### /qa-explorer-report は Web と同じ扱い

レポートを Android のために拡張する理由は無い。エビデンスは Web 版と同じく、レポート → バグレポート →
`Evidence:` 行のリンクで辿る。Android で変わるのはエビデンスの**取り方**(上の表)だけで、レポートの読み方は変わらない。

### spec の置き場所(レポートがそのまま読めるようにする)

レポートは `tests/generated/*.spec.ts` を読み、`viewpoint-NN-*.spec.ts` の名前で session-log と対応付けている。
Android の spec も同じ場所・同じ命名に置けば、レポート側は何も変えずに済む。ただし次の2点を分けておく。

- **ファイル名の末尾を `.android.spec.ts` にする**: `playwright.config.ts` の testDir は `tests/generated` なので、
  そのままだと `npx playwright test` が Android の spec まで拾って落ちる。`playwright.config.ts` に
  `testIgnore: '**/*.android.spec.ts'`、`mobilewright.config.ts` に `testMatch: '**/*.android.spec.ts'` を入れて分ける
  (Mobilewright の設定は Playwright Test と同じ書き方ができる見込み。導入時に確認)
- **出力先を分ける**: どちらも既定の出力先が `test-results/` で、実行のたびに作り直される。
  Web を実行すると Android の失敗時スクショが消える(逆も同じ)ので、Mobilewright 側は `outputDir: 'test-results-android'` にする

---

## 参考

- [mobile-next/mobile-mcp](https://github.com/mobile-next/mobile-mcp)
- [Mobilewright](https://mobilewright.dev/) / [GitHub](https://github.com/mobile-next/mobilewright) / [ROADMAP](https://github.com/mobile-next/mobilewright/blob/main/ROADMAP.md)
- [Maestro MCP](https://maestro.dev/mcp)
- [Maestro Known Issues(Android の inputText は Unicode 非対応)](https://maestro.mobile.dev/troubleshooting/known-issues)
- [appium/mcp-appium](https://github.com/appium/mcp-appium)
- [CursorTouch/Android-MCP](https://github.com/CursorTouch/Android-MCP)
- [ADBKeyBoard](https://github.com/xsren/ADBKeyBoard)
