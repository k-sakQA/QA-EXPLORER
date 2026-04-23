# Session Log

Target: `https://development.pocket-heroes.net`
App: FCTOKYOコレカツ！（FC東京公式デジタルカード）
Focus: `浅く広く`

---

## Session 2026-04-23 (#1) - 浅く広く探索

### Session Start Checklist
- [x] `findings.md` を全件読む (新規対象のため空)
- [x] `coverage.md` の「再訪推奨」と未着手項目を確認 (全未着手)
- [x] Open な Hypothesis を確認 (なし)
- [x] Planned な Probe を確認 (なし)
- [x] 本セッションで狙う観点を決定: P0 (02,10,11,23) + P1 (03,07)

### Initial Snapshot
- Entry URL: `https://development.pocket-heroes.net/home`
- Auth: JリーグID → Okta → Firebase Auth → GCP IAP (storage/auth.json + IndexedDB)
- 主要画面:
  - `/home`: PICK UP カルーセル, SHOP/PACK バナー, 5タブ底ナビ
  - `/shop`: バモス(仮想通貨) 6商品 (¥140〜¥14,000)
  - `/packs`: 3カードパック (MATCH DAY, メモリアル, シーズン)
  - `/collection`: 10枚カード, フィルタ(すべて/シリーズ)
  - `/others`: 設定メニュー6項目
- 入力フィールド:
  - ニックネーム編集: テキスト入力, 24文字上限, 「保存する」ボタン
  - プロモーションコード: `input[name="code"]`, placeholder="プロモーションコードを入力", 半角英数字のみ, maxLength未設定

### 実施した観点と結果

| 観点 | テストファイル | 結果 |
|------|--------------|------|
| 10 単機能 | ph-viewpoint-10-basic-flow.spec.ts | 9/9 PASS |
| 02 エラー表示 | ph-p0p1-input-forms.spec.ts | プロモコード空入力→disabled制御=正常 |
| 03 文字種 | ph-p0p1-input-forms.spec.ts | XSS/SQLi入力可→サーバー側バリデーション有効 |
| 11 状態遷移 | ph-p0p1-input-forms.spec.ts | ブラウザバック2パターン正常 |
| 23 禁則 | ph-p0p1-input-forms.spec.ts | Shop価格全て正の整数, プロモコードmaxLength未設定 |
| 07 数値 | - | N/A (数値入力フィールドなし) |

### Probe 実施
| Probe | 仮説 | 結果 |
|-------|------|------|
| P-20260423-01 | H-20260423-01 (SSR/CSR不整合) | Confirmed: dialog.close()が原因。直接アクセスでは全ページ正常 |

### Findings 登録数
| 区分 | 件数 | Open |
|------|------|------|
| Finding | 11件 | 3件 (F-02, F-03, F-08) |
| Hypothesis | 1件 | 0件 (Confirmed) |
| Probe | 1件 | 0件 (Done) |

### 特筆事項
1. **dismissAllDialogs の副作用**: dialog.close() が React state を壊す問題を発見。テスト戦略として「操作が必要な場合のみ dismiss、読み取りだけなら dismiss 不要」のパターンを確立
2. **PWA ダイアログ**: ページ遷移のたびに表示されるモーダルがテスト自動化の障壁。cross ボタン + force click で対処
3. **入力フィールドの少なさ**: このアプリはカード収集・閲覧が主機能で、入力フォームはニックネーム編集とプロモーションコードの2箇所のみ。文字種・数値系の観点は限定的

### Session End Checklist
- [x] findings.md の全エントリのステータスを最新化
- [x] coverage.md の状態欄を最新化
- [x] session-log.md の Session Summary を記録

### 次セッションへの申し送り
1. ニックネーム編集フォームの詳細テスト（文字数境界値24文字、特殊文字入力、保存動作）がまだ。SPA遷移後にしかアクセスできないので gotoAndDismiss + click パターンが必要
2. プロモコードの maxLength 未設定 (F-03) は観点5(文字数正常限界) / 観点6(文字数異常値) で深掘り可能
3. カードパックの「無料で引く」「10枚引く」フローは破壊的操作のため未テスト。ユーザー許可があればテスト可能

---

## Session 2026-04-23 (#2) - P2観点 入力系 + 表示/遷移系

### Session Start Checklist
- [x] `findings.md` を全件読む (11件: Open 3, Closed 8)
- [x] `coverage.md` の「再訪推奨」と未着手項目を確認 (再訪推奨: 0件, 未着手: 15件)
- [x] Open な Hypothesis を確認 (0件: H-01 Confirmed)
- [x] Planned な Probe を確認 (0件: P-01 Done)
- [x] 本セッションで狙う観点を決定

### 本セッションの計画

**優先度**: P2 観点を中心に消化（P0/P1 は Session #1 で完了）

| 順序 | 観点 | テスト内容 | 欠陥仮定 |
|:---:|---|---|---|
| 1 | 04 文字数(正常値) | ニックネーム: 1文字/12文字/20文字 | 中間的な長さで切り詰めや表示崩れ |
| 2 | 05 文字数(正常限界) | ニックネーム: 24文字ちょうど, プロモコード: 長文 | 境界値 off-by-one |
| 3 | 06 文字数(異常値) | ニックネーム: 25文字以上, プロモコード: 1000文字超 | maxLength未設定(F-03)でサーバーエラー |
| 4 | 09 未入力 | ニックネーム空、全角スペースのみ | 空白文字を「入力済み」と判定 |
| 5 | 14 初期値 | 各画面の初期表示、カウンター値 | 初期値が仕様と異なる |
| 6 | 01 レイアウト/文言 | モバイル375px/タブレット768pxでのレイアウト | レスポンシブ崩れ |
| 7 | 13 切替えとデータ保持 | タブ切り替え後のデータ保持 | SPA状態消失 |
| 8 | 17 キャンセル | ニックネーム編集中の離脱 | 未保存データの警告なし |

### 実施した観点と結果

#### Iteration 1 (文字数系: 観点04/05/06/09)
- テストファイル: `ph-s2-char-length.spec.ts`
- 結果: **6/6 PASS**
- Findings:
  - F-12: textarea maxLength=-1 (構造情報)
  - F-13: **半角/全角スペース・タブのみで保存ボタン有効** (Medium)
  - F-14: プロモコード スペースのみで送信ボタン有効 (Low, サーバー側で弾く)
  - F-15: ニックネーム 100+文字入力可、ただし25文字超で保存disabled (Low)
  - F-16: プロモコード 5000文字入力、1000文字送信 → サーバー堅牢
- 新規 Hypothesis: H-02 (trim()バリデーション不足)
- 新規 Probe: P-02 (スペースのみでニックネーム保存 — ユーザー許可待ち)

#### Iteration 2 (表示/遷移系: 観点14/01/13/17)
- テストファイル: `ph-s2-layout-initial.spec.ts`
- 結果: **8/8 PASS** (networkidle → domcontentloaded に修正後)
- Findings:
  - F-17: 375px でも PC警告バナー表示 (Info)
  - F-18: 底ナビに aria-current なし (Low, アクセシビリティ)
  - F-19: **ニックネーム編集中の離脱で未保存警告なし** (Low)
  - F-20: プロモコード back→forward で値消失 (Info, SPA想定動作)
  - F-21: **Collection→Packs→Collection でカード表示消失** (Low, 状態復元不備)

### テスト結果サマリー

| テストファイル | テスト数 | PASS | FAIL |
|---|:---:|:---:|:---:|
| ph-s2-char-length.spec.ts | 6 | 6 | 0 |
| ph-s2-layout-initial.spec.ts | 8 | 8 | 0 |
| **合計** | **14** | **14** | **0** |

---

## Session #2 End Checklist

- [x] `findings.md` に本セッションの Finding/Hypothesis/Probe 結果を追記 (F-12〜F-21, H-02, P-02)
- [x] `coverage.md` の状態欄を最新化 (01,04,05,06,09,13,14,17 更新)
- [ ] `derived-viewpoints.md` に新しい派生観点があれば追記 (なし)
- [x] 本セッションの成果を Session Summary に記録
- [x] 次セッションへの申し送りを記載

### Session #2 Summary

- 消化した観点: 01, 04, 05, 06, 09, 13, 14, 17 (8観点)
- 消化した Probe: なし (P-02 はユーザー許可待ちのまま)
- 検出バグ: 0件 (バグレポート基準には至らないがMediumのFindingあり)
- 新規 Finding 数: 10件 (F-12〜F-21)
- 新規 Hypothesis: 1件 (H-02 Open)
- 新規 Probe: 1件 (P-02 Planned)
- Open な Hypothesis 残数: 1件 (H-02)
- Planned な Probe 残数: 1件 (P-02)

### 次セッションへの申し送り
1. **H-02 (trim不足)** が Open。P-02 (スペースのみニックネーム保存) はユーザー許可があれば実行可能
2. F-21 (Collection→Packs→Collection でカード消失) は再現性確認と深掘りが必要。観点13 を「再訪推奨」に変更する候補
3. 残り未着手観点: 12(経時変化), 15(変更・反映), 18(組合せ), 19/20/21/22(P3)

---

## Session #2 追加: Probe P-02 実行

### Iteration 3 (Probe P-02: スペースのみニックネーム保存)
- テストファイル: `ph-probe-02-space-nickname.spec.ts`
- 結果: **1/1 PASS**
- 実行内容:
  1. ニックネームに半角スペース3文字のみ入力 → 保存ボタン有効 (F-13 再確認)
  2. 保存クリック → サーバー拒否「不明なエラーが発生しました」
  3. ニックネームは元の「2233さかた」のまま変更なし
  4. 復旧: 元のニックネームを再保存 → 「変更が完了しました！」正常完了
- 新規 Finding: F-22 (スペースのみ保存時のエラーメッセージが曖昧, Medium)
- Hypothesis 更新: H-02 → **Partially Confirmed** (FE の trim 不足は事実、サーバーで防御済み、ただしエラーUXが悪い)
- Coverage 更新: 観点09 → 再消化済み

### Session #2 最終 Summary (Probe P-02 含む)

- 消化した観点: 01, 04, 05, 06, 09, 13, 14, 17 (8観点 + 09再消化)
- 消化した Probe: P-02 Done
- 新規 Finding 数: 11件 (F-12〜F-22)
- Hypothesis: H-02 Partially Confirmed
- Open な Hypothesis 残数: 0件
- Planned な Probe 残数: 0件

### 次セッションへの申し送り (最終)
1. F-21 (Collection→Packs→Collection でカード消失) は再現性確認と深掘りが必要
2. F-22 (スペースのみ保存のエラーメッセージ曖昧) はバグレポート候補
3. 残り未着手観点: 12(経時変化), 15(変更・反映), 18(組合せ), 19/20/21/22(P3)

**注意事項**:
- ニックネーム**保存**(POST)は破壊的操作のため実行しない。入力・バリデーション・UIのみ確認
- プロモコード送信は観点03で安全性確認済み（サーバー側バリデーション有効）。長文送信テストは実施する
- 観点12(経時変化), 15(変更・反映), 18(組合せ) は次セッション以降
