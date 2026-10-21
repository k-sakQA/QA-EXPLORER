#!/usr/bin/env node
/**
 * 依存関係のセットアップ状態を確認する (Node 組み込みモジュールのみ使用。node_modules が無くても動く)
 *
 *   node scripts/check-setup.mjs          … 人が読む形式で結果を表示 (npm run setup:check)
 *   node scripts/check-setup.mjs --hook   … Claude Code の hook 用。問題があるときだけ JSON を出力
 *
 * 確認内容:
 *   1. Node.js のバージョン (Playwright の要件 >=18。既知の脆弱性がある版は警告のみ)
 *   2. package.json と package-lock.json の食い違い (誰かが依存を足して lock を更新し忘れた等)
 *   3. node_modules が package-lock.json どおりに入っているか (clone 直後 / pull で lock が変わった後)
 *   4. インストール済み Playwright の版に対応する Chromium がダウンロード済みか
 *   5. Playwright MCP が使う Google Chrome があるか (警告のみ)
 *
 * hook として .claude/settings.json の SessionStart と PostToolUse(Bash: git pull 等の後) から呼ばれる。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = process.argv.includes('--hook');

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

/** hook の入力 (stdin の JSON)。PostToolUse では git 系コマンドの後だけ確認する */
function readHookInput() {
  if (!HOOK || process.stdin.isTTY) return null;
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || 'null');
  } catch {
    return null;
  }
}

const GIT_UPDATE = /\bgit\s+(pull|merge|rebase|checkout|switch|reset|stash\s+pop)\b/;

/**
 * 系列ごとの、既知の脆弱性が修正済みの最低バージョン (2026-10-21 のセキュリティリリース)
 * https://nodejs.org/ja/blog/vulnerability/october-2026-security-releases
 * 表に無い系列 (奇数版・EOL) は修正版が出ないので判定しない。新しいリリースが出たら更新する
 */
const NODE_SECURE_MIN = { 22: '22.23.4', 24: '24.22.1', 26: '26.12.1' };

const versionLess = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
};

function playwrightCacheDir() {
  const env = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (env === '0') return path.join(ROOT, 'node_modules', 'playwright-core', '.local-browsers');
  if (env) return path.resolve(env);
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (process.platform === 'win32')
    return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  return path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'), 'ms-playwright');
}

function chromeInstalled() {
  const candidates = {
    darwin: ['/Applications/Google Chrome.app', path.join(os.homedir(), 'Applications', 'Google Chrome.app')],
    win32: [
      path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    linux: ['/opt/google/chrome/chrome'],
  }[process.platform];
  return !candidates || candidates.some((p) => fs.existsSync(p));
}

function check() {
  const problems = []; // テストが動かないもの
  const warnings = []; // 動くが一部の機能に影響するもの
  const commands = [];

  // 1. Node.js
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) {
    problems.push(`Node.js ${process.versions.node} は古すぎます (Playwright は 18 以上が必要)`);
    return { problems, warnings, commands: ['Node.js 18 以上 (LTS 推奨) を入れ直す'] };
  }
  // テスト自体は動くので problems にはしない (exit 1 で作業を止めるほどではなく、更新は人が判断する)
  const secureMin = NODE_SECURE_MIN[major];
  if (secureMin && versionLess(process.versions.node, secureMin)) {
    warnings.push(`Node.js ${process.versions.node} には既知の脆弱性があります (${major}.x の修正版は ${secureMin})`);
    commands.push(`Node.js を ${secureMin} 以上に更新する (https://nodejs.org/ja/download)`);
  }

  const pkg = readJson(path.join(ROOT, 'package.json')) ?? {};
  const lock = readJson(path.join(ROOT, 'package-lock.json'));
  const installed = readJson(path.join(ROOT, 'node_modules', '.package-lock.json'));

  // 2. package.json と lock の食い違い
  let lockOutdated = false;
  if (lock?.packages?.['']) {
    const root = lock.packages[''];
    for (const field of ['dependencies', 'devDependencies']) {
      const want = pkg[field] ?? {};
      const have = root[field] ?? {};
      const names = new Set([...Object.keys(want), ...Object.keys(have)]);
      for (const n of names) if (want[n] !== have[n]) lockOutdated = true;
    }
  }

  // 3. node_modules が lock どおりか
  const stale = [];
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    problems.push('node_modules がありません (clone 直後の状態)');
  } else if (lock?.packages) {
    const have = installed?.packages ?? {};
    for (const [key, meta] of Object.entries(lock.packages)) {
      if (!key) continue;
      const cur = have[key];
      if (!cur) {
        if (!meta.optional) stale.push(`${key.replace(/^.*node_modules\//, '')} (未インストール)`);
      } else if (cur.version !== meta.version) {
        stale.push(`${key.replace(/^.*node_modules\//, '')} ${cur.version} → ${meta.version}`);
      }
    }
    if (stale.length) {
      const shown = stale.slice(0, 5).join(', ') + (stale.length > 5 ? ` ほか${stale.length - 5}件` : '');
      problems.push(`node_modules が package-lock.json と食い違っています: ${shown}`);
    }
  }

  const depsNeedInstall = problems.length > 0;
  if (lockOutdated) {
    problems.push('package.json と package-lock.json が食い違っています (lock の更新漏れの可能性)');
    commands.push('npm install');
  } else if (depsNeedInstall) {
    commands.push('npm ci   # package-lock.json どおりに入れ直す (node_modules は作り直される)');
  }

  // 4. Playwright のブラウザ (依存を入れ直す場合は版が変わるので、無条件でインストールを案内する)
  const browsersJson = readJson(path.join(ROOT, 'node_modules', 'playwright-core', 'browsers.json'));
  if (depsNeedInstall || lockOutdated || !browsersJson) {
    commands.push('npx playwright install chromium   # 入っていれば数秒で終わる');
  } else {
    const cache = playwrightCacheDir();
    const missing = browsersJson.browsers
      .filter((b) => b.name === 'chromium' || b.name === 'chromium-headless-shell')
      .map((b) => `${b.name.replace(/-/g, '_')}-${b.revision}`)
      .filter((dir) => !fs.existsSync(path.join(cache, dir)));
    if (missing.length) {
      const ver = readJson(path.join(ROOT, 'node_modules', 'playwright-core', 'package.json'))?.version;
      problems.push(`Playwright ${ver ?? ''} 用の Chromium が未ダウンロードです (${missing.join(', ')})`);
      commands.push('npx playwright install chromium');
    }
  }

  // 5. Playwright MCP (既定で Google Chrome を使う)
  if (!chromeInstalled()) {
    warnings.push('Google Chrome が見つかりません。/explore で使う Playwright MCP のブラウザ操作が失敗します');
    commands.push('Google Chrome を通常の方法でインストールする (または npx playwright install chrome)');
  }

  return { problems, warnings, commands };
}

const input = readHookInput();
const event = input?.hook_event_name ?? 'SessionStart';
if (event === 'PostToolUse' && !GIT_UPDATE.test(input?.tool_input?.command ?? '')) process.exit(0);

const { problems, warnings, commands } = check();

if (!HOOK) {
  if (!problems.length && !warnings.length) {
    console.log('✅ セットアップ OK (依存関係・Playwright ブラウザとも揃っています)');
    process.exit(0);
  }
  for (const p of problems) console.log(`❌ ${p}`);
  for (const w of warnings) console.log(`⚠️  ${w}`);
  console.log('\n次を実行してください:');
  for (const c of commands) console.log(`  ${c}`);
  process.exit(problems.length ? 1 : 0);
}

if (!problems.length && !warnings.length) process.exit(0);

const when = event === 'PostToolUse' ? 'git の更新で' : 'このリポジトリで';
const summary = [...problems, ...warnings].map((s) => `- ${s}`).join('\n');
const cmdList = commands.map((c) => `  ${c}`).join('\n');
console.log(
  JSON.stringify({
    systemMessage: `⚠️ ${when}セットアップが必要な状態です\n${summary}\n実行するコマンド:\n${cmdList}`,
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: [
        `[setup-check] ${when}テスト実行に必要な依存関係が揃っていません。`,
        summary,
        '推奨コマンド (上から順に):',
        cmdList,
        '対応: 次の応答の冒頭で、ユーザーに不足内容と上のコマンドを簡潔に伝え、実行してよいか確認すること。',
        'ユーザーの依頼がテスト実行を含む場合は、セットアップを先に済ませる提案をすること。',
        '許可を得たら実行する。npm ci / npm install / npx playwright install はネットワークと',
        'ホームディレクトリ配下のキャッシュ (~/Library/Caches/ms-playwright 等) への書き込みが必要なため、',
        'サンドボックス内で失敗したらサンドボックス外で再実行する。完了後 `node scripts/check-setup.mjs` で再確認する。',
      ].join('\n'),
    },
  }),
);
