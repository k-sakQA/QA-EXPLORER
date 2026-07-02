/**
 * Playwright Global Setup
 *
 * テスト実行前に:
 * 1. storage/auth.json を読み込んでコンテキスト作成
 * 2. /home にアクセスして認証有効性を確認
 * 3. ホーム画面の初回ダイアログを閉じる
 * 4. storageState を再保存 (JWT リフレッシュ反映)
 */
import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.resolve(__dirname, 'storage', 'auth.json');
// 認証確認先は環境変数で指定 (QA_BASE_URL + QA_AUTH_CHECK_PATH)
const BASE_URL = process.env.QA_BASE_URL ?? 'https://hotel-example-site.takeyaqa.dev';
const AUTH_CHECK_PATH = process.env.QA_AUTH_CHECK_PATH ?? '/home';
const POLL_TIMEOUT = 60_000;
const POLL_INTERVAL = 3_000;

async function globalSetup(_config: FullConfig) {
  // 認証不要な対象 (auth.json なし) では何もしない
  if (!fs.existsSync(AUTH_FILE)) {
    console.log('[globalSetup] storage/auth.json が無いため認証確認をスキップします (認証が必要な対象は npm run auth を先に実行)');
    return;
  }

  console.log('[globalSetup] 認証確認を開始...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: AUTH_FILE,
  });
  const page = await context.newPage();

  try {
    // 認証確認パスにアクセスして認証有効性を確認 (URLポーリング)
    await page.goto(`${BASE_URL}${AUTH_CHECK_PATH}`, { waitUntil: 'domcontentloaded' });

    const ok = await waitForUrl(page, AUTH_CHECK_PATH, POLL_TIMEOUT, POLL_INTERVAL);
    if (!ok) {
      const currentUrl = page.url();
      throw new Error(
        `認証が無効です (URL: ${currentUrl})\n` +
        'npm run auth を再実行してください。'
      );
    }
    console.log('[globalSetup] 認証OK:', page.url());

    // ホーム画面のダイアログを閉じる
    await dismissDialogs(page);

    // storageState を再保存 (Firebase SDK による JWT リフレッシュが反映される)
    try {
      await (context.storageState as any)({ path: AUTH_FILE, indexedDB: true });
      console.log('[globalSetup] storageState を再保存しました (indexedDB含む)');
    } catch {
      await context.storageState({ path: AUTH_FILE });
      console.log('[globalSetup] storageState を再保存しました');
    }
  } finally {
    await browser.close();
  }
}

/**
 * 指定パスを含む URL になるまでポーリング
 */
async function waitForUrl(
  page: any,
  expectedPath: string,
  timeout: number,
  interval: number,
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const url = page.url();
    if (url.includes(expectedPath) && !url.includes('signin') && !url.includes('unauthenticated')) {
      return true;
    }
    await page.waitForTimeout(interval);
    // ページをリロードして再確認
    try {
      await page.goto(`${BASE_URL}${expectedPath}`, {
        waitUntil: 'domcontentloaded',
      });
    } catch {
      // ナビゲーションエラーは無視して再試行
    }
  }
  return false;
}

/**
 * ホーム画面のモーダルダイアログを閉じる
 * 参考: RegressionEcho の dismissAllDialogs パターン
 */
async function dismissDialogs(page: any) {
  // cross (×) ボタンで閉じる
  const crossSelectors = [
    'button img[src*="cross"]',
    'button[class*="close"]',
    '[class*="toastsCloseButton"]',
  ];

  for (let attempt = 0; attempt < 5; attempt++) {
    let closed = false;
    for (const selector of crossSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          closed = true;
          await page.waitForTimeout(500);
        }
      } catch {
        // 要素が無い場合は無視
      }
    }

    // dialog 要素の OK ボタン
    try {
      const okBtn = page.locator('dialog button:has-text("OK")').first();
      if (await okBtn.isVisible({ timeout: 1000 })) {
        await okBtn.click();
        closed = true;
        await page.waitForTimeout(500);
      }
    } catch {
      // 無視
    }

    if (!closed) break;
  }
}

export default globalSetup;
