#!/usr/bin/env node
/**
 * risk-register.md の表を .tsv に書き出す（レビュー用）。
 *
 *   node scripts/export-tsv.mjs <target-slug>
 *
 * .md を単一の正とし、.tsv は常にそこから生成する。
 * 手で .tsv を編集しないこと（次回の実行で上書きされる）。
 *
 * 出力先: qa-knowledge/targets/<slug>/exports/*.tsv (BOM付きUTF-8)
 */
import fs from 'node:fs';
import path from 'node:path';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node scripts/export-tsv.mjs <target-slug>');
  process.exit(1);
}

const base = path.join('qa-knowledge', 'targets', slug);
const src = path.join(base, 'risk-register.md');
const outDir = path.join(base, 'exports');

if (!fs.existsSync(src)) {
  console.error(`not found: ${src}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const md = fs.readFileSync(src, 'utf8');

/**
 * 見出し直下にある Markdown 表を取り出す。
 * 1つの節に表が複数ある場合（影響度マトリクス＋本表など）は、**列数が最も多い表**を採る。
 * 見出しは行頭の `#` から始まるものだけを対象にし、文書タイトルへの誤一致を避ける。
 */
function tableUnder(heading) {
  const lines = md.split('\n');
  const start = lines.findIndex(
    (l) => /^#{2,}\s/.test(l) && l.replace(/^#+\s*/, '').startsWith(heading),
  );
  if (start === -1) throw new Error(`見出しが見つかりません: ${heading}`);

  const tables = [];
  let current = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^#{1,}\s/.test(lines[i])) break;                         // 次の見出しで打ち切り
    const isRow = l.startsWith('|') && l.endsWith('|');
    if (isRow) {
      const cells = l.slice(1, -1).split('|').map(clean);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;    // 区切り行
      current.push(cells);
    } else if (current.length) {
      tables.push(current);
      current = [];
    }
  }
  if (current.length) tables.push(current);

  const rows = tables.filter((t) => t.length >= 2).sort((a, b) => b[0].length - a[0].length)[0];
  if (!rows) throw new Error(`表が見つかりません: ${heading}`);

  // 列数が揃っているか検証（Markdown の壊れを検出する）
  const width = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== width) {
      throw new Error(`「${heading}」の ${i + 1} 行目の列数が ${r.length}（見出しは ${width}）です`);
    }
  });
  return rows;
}

/** Markdown の装飾を落として素のテキストにする。 */
function clean(cell) {
  return cell
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function write(name, rows) {
  const body = rows.map((r) => r.join('\t')).join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, name), '﻿' + body, 'utf8');  // BOM: スプレッドシートの文字化け対策
  console.log(`  ${name}  ${rows.length - 1}行 / ${rows[0].length}列`);
}

// --- 業務フロー → リスクの逆引きを、リスク一覧の BF 列から作る ---
function addBackLinks(bfRows, riskRows) {
  const byBf = new Map();
  for (const r of riskRows.slice(1)) {
    const [id, bf] = r;
    if (!bf || bf === '—') continue;
    for (const one of bf.split('/').map((s) => s.trim())) {
      if (!byBf.has(one)) byBf.set(one, []);
      byBf.get(one).push(id);
    }
  }
  return bfRows.map((r, i) =>
    i === 0 ? [...r, '紐づくリスク(自動)'] : [...r, (byBf.get(r[0]) || []).join(', ') || '—'],
  );
}

console.log(`${src} から生成:`);
const risks = tableUnder('リスク一覧');
const flows = tableUnder('業務フロー一覧');

write('01_リスク一覧.tsv', risks);
write('02_抜け落ち候補.tsv', tableUnder('抜け落ち候補'));
write('03_業務フロー一覧.tsv', addBackLinks(flows, risks));
write('04_対象外としたリスク.tsv', tableUnder('意図的に対象外としたリスク'));

// --- 整合チェック（黙って壊れないように） ---
const warn = [];
const riskIds = new Set(risks.slice(1).map((r) => r[0]));
for (const r of flows.slice(1)) {
  const linked = risks.slice(1).some((x) => x[1].includes(r[0]));
  if (!linked) warn.push(`業務フロー ${r[0]} に紐づくリスクが1件もありません`);
}
const depthCol = risks[0].indexOf('深さ');
for (const r of risks.slice(1)) {
  if (depthCol !== -1 && r[depthCol].startsWith('統合')) continue;   // 他リスクに統合済みの行
  if (r[4] && !['H', 'M', 'L'].includes(r[4]) && !r[4].includes('見直し')) {
    warn.push(`${r[0]} の影響度が H/M/L ではありません: "${r[4]}"`);
  }
}
if (warn.length) {
  console.log('\n確認してください:');
  warn.forEach((w) => console.log(`  - ${w}`));
}
