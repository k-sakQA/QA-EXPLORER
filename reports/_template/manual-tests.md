# Manual Tests (人間が実行すべきテスト)

テスト対象: `<対象名>`

このファイルは、Playwright では検証困難・不可能な観点を、
**人間が手動で実行するためのテストケース集**です。
エージェントが「自動化では無理」と判断したとき、ここに手順書を起票します。

AI と人間の役割分担:
- **AI (Playwright)**: HTML/JS で再現できる振る舞い、バリデーション、遷移、DOM状態
- **人間 (実機・五感)**: 同時実行、実機挙動、アクセシビリティ主観評価、決済、
  セキュリティ深掘り、長時間・大量操作、モバイル固有UX

ID形式: `MT-YYYYMMDD-NN` (同日内の通し番号)

---

## 優先度定義

- `High`: 次のリリースまでに必ず実行すべき。バグがあればリリースブロッカー級
- `Medium`: 可能なら実行したい。見逃すと後で痛い可能性
- `Low`: 余裕があれば。網羅性のためのテスト

---

## 手動テスト一覧

<!-- ここに MT-YYYYMMDD-NN を追記していく

### MT-YYYYMMDD-NN: [優先度] [観点NN] テスト名

**なぜ人間が必要か**:
- (自動化で代替できない理由を1-3行)

**Steps**:
1.
2.
3.

**Expected**:
-

**Actual** (人間が記入):
-

**検証環境** (人間が記入):
- [ ] 環境名 (OS / ブラウザ / 備考):

**備考**:
- Born from: (Finding / Hypothesis ID があれば)
- 観点: NN 観点名
- Status: Pending / In Progress / Done / Skipped
- Result: (実行後、Pass / Fail / Partial / Blocked)

-->

---

## 運用ルール

- エージェントは P3 観点や、自動化で検証困難な Probe を見つけたとき、
  `tests/generated/` に spec を書く代わりにここに手順を起票する
- 起票時の Status は `Pending`、優先度と「なぜ人間が必要か」を必ず記載
- 人間が実行したら Actual / 検証環境 / Result を埋め、Status を `Done` に更新
- Fail だった場合は、通常のバグと同じく `bugs/` にも起票 (Finding ID 発行、findings.md にも登録)
- 実行後の結果は `coverage.md` の該当観点の状態を `手動テスト完了` に更新
