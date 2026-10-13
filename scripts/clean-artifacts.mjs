#!/usr/bin/env node
// 実行のたびにたまる生成物を消す。「どんなテストをしたか」は消さない。
//
//   .playwright-mcp/   Playwright MCP のスナップショット・コンソールログ。--mcp-days(既定 14)日たったものを消す。
//                      探索で何をしたかは reports/<target>/session-log.md などに残っている
//   test-runs/*-html/  実行ごとの HTML レポート(スクショ・トレース入りで大きい)。--html-days(既定 30)日たったものを消す。
//                      同じ実行の test-runs/*.json(テスト名・結果・ステップ・所要時間)は消さずに残す。
//                      reports/ と qa-knowledge/ から参照されている実行の HTML も残す
//   .explore-scratch/  探索中の使い捨てのスクリプト・途中経過。--scratch-days(既定 7)日たったものを消す。
//                      残す証拠は reports/<target>/evidence/ に置く決まり(エージェント定義の「守るべきこと」)
//
//   node scripts/clean-artifacts.mjs                 消す
//   node scripts/clean-artifacts.mjs --dry-run       消さずに対象だけ表示
//   node scripts/clean-artifacts.mjs --mcp-days=7 --html-days=60 --scratch-days=14
//
// TSV 化(report-translator)は HTML から行うので、記録が必要な実行は --html-days 以内に TSV 化しておくこと。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MCP_DIR = path.join(ROOT, '.playwright-mcp');
const RUNS_DIR = path.join(ROOT, 'test-runs');
const SCRATCH_DIR = path.join(ROOT, '.explore-scratch');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
function days(name, def) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  const n = arg ? Number(arg.split('=')[1]) : def;
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`--${name} が不正です: ${arg}`);
    process.exit(1);
  }
  return n;
}
const mcpDays = days('mcp-days', 14);
const htmlDays = days('html-days', 30);
const scratchDays = days('scratch-days', 7);

const now = Date.now();
const stamp = new Date().toISOString();
const ageDays = (ms) => (now - ms) / 86_400_000;

// reports/ と qa-knowledge/ の .md に書かれた test-runs/<実行名> を集める。
// 「test-runs/20261007-*_privacy-*」「test-runs/20261007-1814〜1826」のような範囲指定は、日付(8桁)の一致で残す
function referencedRuns() {
  const prefixes = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const rel of fs.readdirSync(dir, { recursive: true })) {
      if (!rel.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(dir, rel), 'utf8');
      for (const m of text.matchAll(/test-runs\/([0-9A-Za-z_\-*〜.+]+)/g)) {
        const ref = m[1];
        prefixes.add(/[*〜]/.test(ref) ? ref.slice(0, 8) : ref.replace(/(-html|\.json)$/, ''));
      }
    }
  };
  walk(path.join(ROOT, 'reports'));
  walk(path.join(ROOT, 'qa-knowledge'));
  return [...prefixes];
}

let removed = 0;
let bytes = 0;
function remove(target, label) {
  const size = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target, { recursive: true }).reduce((s, r) => {
        const st = fs.statSync(path.join(target, r));
        return st.isFile() ? s + st.size : s;
      }, 0)
    : fs.statSync(target).size;
  if (dryRun) {
    console.log(`[dry-run] 削除対象: ${label}`);
  } else {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`${stamp} 削除: ${label}`);
  }
  removed++;
  bytes += size;
}

if (fs.existsSync(MCP_DIR)) {
  for (const name of fs.readdirSync(MCP_DIR)) {
    const file = path.join(MCP_DIR, name);
    const st = fs.statSync(file);
    if (!st.isFile() || ageDays(st.mtimeMs) < mcpDays) continue;
    remove(file, `.playwright-mcp/${name} (${ageDays(st.mtimeMs).toFixed(0)} 日前)`);
  }
}

if (fs.existsSync(RUNS_DIR)) {
  const refs = referencedRuns();
  for (const name of fs.readdirSync(RUNS_DIR)) {
    if (!name.endsWith('-html')) continue;
    const dir = path.join(RUNS_DIR, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    // 実行名の先頭 YYYYMMDD-HHMMSS(JST) を実行日時とみなす
    const m = name.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})_/);
    if (!m) continue;
    const runMs = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`);
    if (ageDays(runMs) < htmlDays) continue;
    const run = name.replace(/-html$/, '');
    if (refs.some((p) => run.startsWith(p))) continue;
    remove(dir, `test-runs/${name} (${ageDays(runMs).toFixed(0)} 日前。JSON は残す)`);
  }
}

if (fs.existsSync(SCRATCH_DIR)) {
  // サブフォルダの中もファイル単位で日数を見て、空になったフォルダは消す
  const rels = fs.readdirSync(SCRATCH_DIR, { recursive: true }).sort().reverse();
  for (const rel of rels) {
    const target = path.join(SCRATCH_DIR, rel);
    const st = fs.statSync(target);
    if (st.isDirectory()) {
      if (!dryRun && fs.readdirSync(target).length === 0) fs.rmdirSync(target);
      continue;
    }
    if (ageDays(st.mtimeMs) < scratchDays) continue;
    remove(target, `.explore-scratch/${rel} (${ageDays(st.mtimeMs).toFixed(0)} 日前)`);
  }
}

if (dryRun || removed > 0) {
  console.log(`${dryRun ? '[dry-run] ' : ''}${removed} 件 / ${(bytes / 1_048_576).toFixed(1)} MB`);
}
