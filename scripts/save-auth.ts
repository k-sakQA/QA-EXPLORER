/**
 * 手動認証 → storageState 保存スクリプト
 *
 * 使い方:
 *   npx playwright test scripts/save-auth.ts
 *   または
 *   npx tsx scripts/save-auth.ts
 *
 * 1. Chromium が起動し、指定 URL を開く
 * 2. ユーザーがブラウザ上で手動ログインする
 * 3. ホーム画面が表示されたらターミナルで Enter を押す
 * 4. storage/auth.json に Cookie / localStorage / indexedDB が保存される
 */
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ログインページのURLは環境変数 QA_AUTH_URL で指定する
const TARGET_URL = process.env.QA_AUTH_URL ?? 'https://hotel-example-site.takeyaqa.dev/ja/login.html';
const STORAGE_DIR = path.resolve(__dirname, '..', 'storage');
const AUTH_FILE = path.join(STORAGE_DIR, 'auth.json');

async function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

(async () => {
  // storage ディレクトリがなければ作成
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  console.log('ブラウザを起動します...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`${TARGET_URL} を開きます...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('='.repeat(60));
  console.log('  ブラウザ上で手動ログインしてください。');
  console.log('  ホーム画面が表示されたら、ここで Enter を押してください。');
  console.log('='.repeat(60));
  console.log('');

  await waitForEnter('>> Enter を押すと認証情報を保存します... ');

  // storageState を保存 (indexedDB: true で Firebase Auth のリフレッシュトークンも含む)
  try {
    await (context.storageState as any)({ path: AUTH_FILE, indexedDB: true });
    console.log(`\n認証情報を保存しました (indexedDB含む): ${AUTH_FILE}`);
  } catch {
    await context.storageState({ path: AUTH_FILE });
    console.log(`\n認証情報を保存しました (indexedDBなし): ${AUTH_FILE}`);
  }

  await browser.close();
  console.log('完了。');
})();
