#!/usr/bin/env node
// storage/ の認証ファイル(storageState)を消す。ログイン済みの Cookie やトークンが
// そのまま入っているため、テストが終わったら残さない。
//
//   node scripts/clear-auth.mjs                 すべて消す(テストが終わったら実行)
//   node scripts/clear-auth.mjs --expired       ログインから --ttl-hours(既定 8)時間たったものだけ消す
//                                               (macOS なら scripts/install-auth-cleaner.sh で launchd から定期実行)
//   node scripts/clear-auth.mjs --dry-run ...   消さずに対象だけ表示
//
// ログイン時刻はファイルの作成日時(birthtime)で見る。global-setup などの再保存は上書きなので
// 作成日時は変わらない。保存スクリプトは保存の前に既存ファイルを消し、作成日時をログイン時刻にそろえる。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'storage');
const KEEP = new Set(['.gitkeep']);

const args = process.argv.slice(2);
const expiredOnly = args.includes('--expired');
const dryRun = args.includes('--dry-run');
const ttlArg = args.find((a) => a.startsWith('--ttl-hours='));
const ttlHours = ttlArg ? Number(ttlArg.split('=')[1]) : 8;
if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
  console.error(`--ttl-hours が不正です: ${ttlArg}`);
  process.exit(1);
}

if (!fs.existsSync(STORAGE_DIR)) process.exit(0);

const now = Date.now();
const stamp = new Date().toISOString();
let removed = 0;
for (const name of fs.readdirSync(STORAGE_DIR)) {
  if (KEEP.has(name)) continue;
  const file = path.join(STORAGE_DIR, name);
  const st = fs.statSync(file);
  if (!st.isFile()) continue;

  const ageHours = (now - st.birthtimeMs) / 3_600_000;
  if (expiredOnly && ageHours < ttlHours) {
    // 残すファイルも本人だけが読める権限にそろえる(Playwright は 644 で書くため)
    if (!dryRun && (st.mode & 0o077) !== 0) fs.chmodSync(file, 0o600);
    continue;
  }

  const label = `${name} (ログインから ${ageHours.toFixed(1)} 時間)`;
  if (dryRun) {
    console.log(`[dry-run] 削除対象: ${label}`);
  } else {
    fs.rmSync(file, { force: true });
    console.log(`${stamp} 削除: ${label}`);
  }
  removed++;
}

if (!expiredOnly && removed === 0) console.log('storage/ に認証ファイルはありません');
